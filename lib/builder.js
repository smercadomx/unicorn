var fs = require('fs'),
    path = require('path'),
    jshint = require('jshint/src/jshint').JSHINT,
    jshintReporter = require('./reporters/jshint'),
    cssLint = require('csslint').CSSLint,
    csslintReporter = require('./reporters/csslint'),
    cssproc = require('cssproc'),
    uglifycss = require('uglifycss');
    uglify = require('uglify-js'),
    async = require('async'),
    LOG = require('winston'),
    glob = require('glob'),
    chalk = require('chalk'),
    templates = require('./templates.js'),
    alias = require('./alias'),
    _ = require('lodash'),
    mkdirp = require('mkdirp'),
    jsonminify = require('jsonminify'),
    rimraf = require('rimraf'),
    EOL = require('os').EOL,
    exec = require('sync-exec'),
    jsBeautify = require('js-beautify').js_beautify,
    cssBeautify = require('js-beautify').css,
    rollups = [],
    config = {},
    jshintConfig = {},
    defaultConfig = {
      regex: /^.*?(?:Y.log).*?(?:;|).*;|(\/\*\@DBG\*\/)/mg,
      target: path.join(__dirname, 'target')
    },
    uglifyConfig =  {
      fromString: true,
    	compress: {
    		sequences: true,
    		dead_code: true,
    		conditionals: true,
    		booleans: true,
    		unused: true,
    		if_return: true,
    		join_vars: true,
        drop_console: true,
        drop_debugger: true
    	}
    },
    uglifyCssConfig = {
      uglyComments: true,
      cuteComments: false,
      expandVars: false
    };

function getProperties(meta, module, parent) {
  if (meta[module]) {
    return meta[module];
  }

  if (meta[parent] && meta[parent].submodules && meta[parent].submodules[module]) {
    return meta[parent].submodules[module];
  }

  if (meta[parent] && meta[parent].plugins && meta[parent].plugins[module]) {
    return meta[parent].plugins[module];
  }

  if (meta[parent] && meta[parent].submodules && meta[parent].submodules[module] && meta[parent].submodules[module].plugins) {
    return meta[parent].submodules[module].plugins;
  }

  return {};
};

function getMeta(base) {
  var files = glob.sync(path.join(base, 'meta', '*.json')),
    meta = {};
  _.forEach(files, function(file) {
    meta = _.merge(meta, JSON.parse(jsonminify(fs.readFileSync(file, 'utf8'))));
  });
  return meta;
}

function replace(content, keys) {
  _.forEach(_.merge(config, keys || {}), function(value, key) {
    if (key.indexOf('\@') != 0) {
      key = '\@' + key + '\@';
    }
    content = content.replace(new RegExp(key, 'gi'), value);
  });
  return content;
};

function checkPath(base, file, type) {
  if (path.normalize(file).indexOf(type + '/') != 0) {
    return path.join(base, type, file);
  }
  return path.join(base, file);
};

function getNode() {
  if (/^win/.test(process.platform)) {
    return '"' + process.execPath + '"';
  }
  return process.execPath;
};

function execute(scripts, base) {
  _.forEach(scripts, function(script) {
    var command = script;
    if (path.extname(script) === '.js') {
      command = getNode() + ' ' + path.normalize(script);
    }
    LOG.debug('Executing: ' + command);
    var output = exec(command, {
      cwd: base
    });
    if (output.stderr) {
      throw new Error(output.stderr);
    }
    if (output.stdout) {
      LOG.debug(output.stdout);
    }
  });
};

var builder = {
  load: function(options, jshintOptions) {
    config = _.merge(defaultConfig, options || {});
    jshintConfig = jshintOptions || {};
    if (config.aka) {
      alias.load();
    }
  },

  build: function(base, callback) {
    var files = glob.sync(path.join(base, '**', 'build.json')).reverse(),
      each = async.each;

    LOG.info(chalk.blue('Building ' + files.length + ' modules'));
    // Clean config.target folder
    LOG.debug('Removing target folder');
    rimraf.sync(config.target);

    // Alias need sequential loop.
    if (config.aka) {
      each = async.eachSeries;
    }

    each(files, builder.buildModule, function(err) {
      if (err) {
        callback(err);
      }
      builder.rollup(callback);
    });
  },

  buildModule: function(file, next) {
    var descriptor = JSON.parse(fs.readFileSync(file)),
      base = path.dirname(file),
      cache,
      assetsBase,
      moduleName,
      metaPath,
      meta;

    // prebuilds
    if (descriptor.prebuilds) {
      cache = descriptor;
      _.forEach(descriptor.prebuilds, function(prebuild) {
        LOG.debug('prebuild: ' + prebuild);
        builder.buildModule(path.join(base, '..', prebuild, 'build.json'), function(err) {
          if (err) {
            throw new Error(err);
          }
        });
      });
      descriptor = cache;
    }

    base = path.dirname(file);
    assetsBase = path.join(base, 'assets');
    moduleName = descriptor.name;
    metaPath = path.join(base, 'meta', moduleName + '.json');
    meta = getMeta(base);

    // This build was already built by pre/post builds
    if (fs.existsSync(path.join(config.target, moduleName)) && config.gallop) {
      next();
      return;
    }

    LOG.info('Building ' + moduleName);

    if (descriptor.rollups) {
      _.forEach(descriptor.rollups, function(rollup, name) {
        if (!rollup.name && !rollup.basefilename) {
          rollup.name = name;
        }
        if (_.findIndex(rollups, rollup) < 0) {
          rollups.push(rollup);
        }
      });
    }
    _.forEach(descriptor.builds, function(build, name) {
      if (typeof build === 'string') {
        return;
      }

      LOG.debug('Building ' + name);
      var content,
        properties = _.merge(build, getProperties(meta, name, moduleName));

      properties = _.merge(properties, {
        parent: descriptor.shifter || {}
      });

      if (properties.exec) {
        execute(properties.exec, base);
      }

      try {
        if (build.jsfiles && build.jsfiles.length) {
          builder.js(name, build.jsfiles, properties, base);
        } else if (build.cssfiles && build.cssfiles.length) {
          builder.css(name, build.cssfiles, properties, base);
        }
      } catch(e) {
        next(e);
      }

      if (properties.postexec) {
        execute(properties.postexec, base);
      }
    });

    if (fs.existsSync(assetsBase)) {
      LOG.debug('Copying assets for ' + moduleName);
      _.forEach(glob.sync('**/!(*.css)', {
        cwd: assetsBase
      }), function(file) {
        var filePath = path.join(assetsBase, file)
          outputPath = path.join(config.target, moduleName, 'assets', file);

        // Change glob to do this for us
        if (!fs.statSync(filePath).isFile()) {
            return;
        }

        if (file.indexOf('skins/') !== 0) {
          outputPath = file.split('/');
          outputPath.splice(1, 0, 'assets');
          outputPath = path.join(config.target, outputPath.join(path.sep));
        }

        mkdirp.sync(path.dirname(outputPath));
        fs.writeFileSync(path.join(outputPath), fs.readFileSync(filePath, 'utf8'));
      });
    }

    // postbuilds
    if (descriptor.postbuilds) {
      _.forEach(descriptor.postbuilds, function(prebuild) {
        LOG.debug('postbuilds: ' + prebuild);
        builder.buildModule(path.join(base, '..', prebuild, 'build.json'), function(err) {
          if (err) {
            throw new Error(err);
          }
        })
      });
    }
    next();
  },

  rollup: function(callback) {
    LOG.info('Building rollups');
    async.each(rollups, function(rollup) {
      var content= '',
        filename = rollup.basefilename || rollup.name;
      LOG.info('Creating rollup: ' + filename);

      _.forEach(rollup.files, function(file) {
        var filePath = path.join(config.target, file, file + '-debug.js');
        if (fs.existsSync(filePath)) {
          content += fs.readFileSync(filePath);
        } else {
          LOG.info(file + ' Does not exist.');
        }
      });

      content = templates.rollup({
        body: content,
        version: config.version,
        config: JSON.stringify(rollup.config),
        name: rollup.name
      });

      content = jsBeautify(replace(content, rollup.replace));
      mkdirp.sync(path.join(config.target, filename));
      fs.writeFileSync(path.join(config.target, filename, filename + '-debug.js'), content, 'utf8');
      if (config.regex || rollup.regex) {
        content = content.replace(rollup.regex || config.regex, '');
      }
      fs.writeFileSync(path.join(config.target, filename, filename + '.js'), content, 'utf8');
      fs.writeFileSync(path.join(config.target, filename, filename + '-min.js'), uglify.minify(content, uglifyConfig).code, 'utf8');
    });
    rollups = [];
    callback();
  },

  js: function(name, files, properties, base) {
    var content = "",
      valid,
      data = {
        dependencies: JSON.stringify(properties.requires || {}).replace(/\"/g, '\''),
        name: properties.name || name,
        version: config.version
      },
      filename = properties.basefilename || name,
      generated = properties.shifter && properties.shifter.generated,
      addStamp = properties.shifter && properties.shifter.jsstamp !== false,
      useStamp = properties.shifter && properties.shifter.usestamp;


    if (properties.lang) {
      data.lang= JSON.stringify(properties.lang).replace(/\"/g, '\'');
    }

    // This is not documented in shifter but used in autocomplete-base
    if (properties.optional) {
      data.optional = JSON.stringify(properties.optional || {}).replace(/\"/g, '\'');
    }

    if (properties.skinnable) {
      data.skinnable = properties.skinnable;
    }

    _.forEach(files, function(file) {
      var filePath = checkPath(base, file, 'js');
      if (fs.existsSync(filePath)) {
        content += fs.readFileSync(filePath, 'utf8');
      }
    });

    data.body = content;

    if (useStamp) {
      content = templates.use(data);
    } else if (!properties.shifter || addStamp) {
      content = templates.add(data);
    }

    // Preapend files
    if (properties.prependfiles) {
      _.forEach(properties.prependfiles, function(append) {
        var fileContent = fs.readFileSync(checkPath(base, append, 'js'), 'utf8');
        content = fileContent + EOL + content;
      });
    }

    // Append files
    if (properties.appendfiles) {
      _.forEach(properties.appendfiles, function(append) {
        var fileContent = fs.readFileSync(checkPath(base, append, 'js'), 'utf8');
        content = content + EOL + fileContent;
      });
    }

    content = replace(content, properties.replace);
    if (!generated && properties.parent.lint !== false && config.lint !== false) {
      valid = jshint(content, jshintConfig);
      jshintReporter.report(jshint.data(), name);
      if (!valid && properties.fail !== false && properties.parent.fail !== false && config.fail !== false) {
        throw new Error('JSHINT failed for module ' + name);
      }
    }

    content = jsBeautify(content);
    mkdirp.sync(path.join(config.target, filename));
    fs.writeFileSync(path.join(config.target, filename, filename + '-debug.js'), content, 'utf8');

    if (config.regex || properties.regex) {
      content = content.replace(properties.regex || config.regex, '');
    }

    fs.writeFileSync(path.join(config.target, filename, filename + '.js'), content, 'utf8');
    fs.writeFileSync(path.join(config.target, filename, filename + '-min.js'), uglify.minify(content, uglifyConfig).code, 'utf8');

    // i18n
    if (properties.lang) {
      _.forEach(properties.lang, function(lang) {
        var langPath = path.join(base, 'lang', name + '_' + lang + '.js'),
          i18n;
        data.body = jsonminify(fs.readFileSync(langPath, 'utf8'));
        data.lang = lang;
        mkdirp.sync(path.join(config.target, filename, 'lang'));
        fs.writeFileSync(path.join(config.target, filename, 'lang', filename + '_' + lang + '.js'), templates.lang(data), 'utf8');
      });

      // Default value. This should be remove from wria2 and add a default language value.
      var defaultLang = path.join(base, 'lang', name + '.js');
      if (fs.existsSync(defaultLang)) {
        data.body = jsonminify(fs.readFileSync(defaultLang, 'utf8'));
        data.lang = '';
        fs.writeFileSync(path.join(config.target, filename, 'lang', filename + '.js'), templates.lang(data), 'utf8');
      }
    }

    if (properties.skinnable) {
      builder.skin(name, filename, base, properties);
    }

    if (properties.copy) {
      _.forEach(properties.copy, function(copy) {
          var sources = glob.sync(path.join(base, copy[0],  '*')),
            destination = path.join(config.target, filename, copy[1]);
          _.forEach(sources, function(source) {
            var relativePath = path.relative(base, source),
              outputPath = path.join(destination, relativePath);
            mkdirp.sync(path.dirname(outputPath));
            fs.writeFileSync(outputPath, fs.readFileSync(source, 'utf8'));
          });
      });
    }
  },

  skin: function(name, filename, base, properties) {
    var basePath = path.join(base, 'assets'),
      skinPath = path.join(basePath, 'skins'),
      corePath = path.join(basePath, name + '-core.css'),
      core = '',
      skins;

      if (!fs.existsSync(skinPath)) {
        skinPath = path.join(basePath, name, 'skins');
        corePath = path.join(basePath, name, name + '-core.css');
        if (!fs.existsSync(skinPath)) {
          LOG.error(name + ' does not have a skin, please remove the skinnable attribute.');
          return;
        }
      }

      skins = fs.readdirSync(skinPath);
      mkdirp.sync(path.join(config.target, filename, 'assets', 'skins'));
      if (fs.existsSync(corePath)) {
        core = fs.readFileSync(corePath);
        fs.writeFileSync(path.join(config.target, filename, 'assets', filename + '-core.css'), core, 'utf8');
      }

      _.forEach(skins, function(skin) {
        var skinContent = fs.readFileSync(path.join(skinPath, skin, name + '-skin.css')),
          content = core + EOL + skinContent,
          targetPath = path.join(config.target, filename, 'assets', 'skins', skin);

        builder.buildCss(content, targetPath, filename, name, properties);
      });
  },

  css: function(name, files, properties, base) {
    var content,
      data = [],
      filename = properties.basefilename || name,
      targetPath = path.join(config.target, filename);

    _.forEach(files, function(file) {
      var filePath = checkPath(base, file, 'css');
      if (fs.existsSync(filePath)) {
        data.push(fs.readFileSync(filePath, 'utf8'));
      }
    });

    builder.buildCss(data.join(EOL), targetPath, filename, name, properties);
  },

  buildCss: function(data, targetPath, filename, moduleName, properties, callback) {
    var content = replace(data, properties.replace);

    if (config.csslint !== false && properties.csslint !== false) {
      result = cssLint.verify(content);
      csslintReporter.report(result, moduleName);
      valid = _.find(result.messages, {type: 'error'}) ? false : true;
      if (!valid && properties.fail !== false && properties.parent.fail !== false) {
        throw new Error('CSSLINT failed for module ' + moduleName);
      }
    }
    mkdirp.sync(targetPath);
    cssproc.parse({
      root: config.target,
      path: path.join(targetPath, filename + '.css'),
      base: path.join(targetPath)
    }, content, function (err, output) {
      content = templates.css({
        body: output,
        name: moduleName
      });

      content = uglifycss.processString(content, uglifyCssConfig);
      fs.writeFileSync(path.join(targetPath, filename + '.css'), content, 'utf8');
      fs.writeFileSync(path.join(targetPath, filename + '-min.css'), content, 'utf8');
      if (callback) {
        callback(content);
      }
    });
  }
};


module.exports = builder;
