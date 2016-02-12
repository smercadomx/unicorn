var fs = require('fs'),
    path = require('path'),
    jshint = require('jshint/src/jshint').JSHINT,
    jshintReporter = require('./reporters/jshint'),
    cssLint = require('csslint').CSSLint,
    csslintReporter = require('./reporters/csslint'),
    async = require('async'),
    LOG = require('winston'),
    glob = require('glob'),
    chalk = require('chalk'),
    templates = require('./templates.js'),
    // alias = require('./alias'),
    _ = require('lodash'),
    jsonminify = require('jsonminify'),
    rimraf = require('rimraf'),
    EOL = require('os').EOL,
    exec = require('./utils/executor'),
    copier = require('./utils/copier'),
    meta = require('./utils/meta'),
    writer = require('./writer'),
    rollups = [],
    config = {},
    jshintConfig = {},
    defaultConfig = {
      regex: /^.*?(?:Y.log).*?(?:;|).*;|(\/\*\@DBG\*\/)/mg,
      target: path.join(__dirname, 'target')
    };

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
  if (path.normalize(file).indexOf(type + path.sep) != 0) {
    return path.join(base, type, file);
  }
  return path.join(base, file);
};

var builder = {
  load: function(options, jshintOptions) {
    config = _.merge(defaultConfig, options || {});
    jshintConfig = jshintOptions || {};
    // if (config.aka) {
    //   alias.load();
    // }
  },

  build: function(base, callback) {
    var files = glob.sync(path.join(base, '**', 'build.json')).reverse(),
      each = async.each;

    LOG.info(chalk.blue('Building ' + files.length + ' modules'));
    // Clean config.target folder
    LOG.debug('Removing target folder');
    if (!config.dry) {
      rimraf.sync(config.target);
    }

    // Alias need sequential loop.
    // if (config.aka) {
    //   each = async.eachSeries;
    // }

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
      metaData;

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
    metaData = meta.get(base);

    // This build was already built by pre/post builds
    if (fs.existsSync(path.join(config.target, moduleName)) && config.gallop) {
      LOG.debug('Skiping second build of ' + moduleName);
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

    if (descriptor.exec) {
      exec.execute(descriptor.exec, base);
    }

    _.forEach(descriptor.builds, function(build, name) {
      if (typeof build === 'string') {
        return;
      }

      LOG.debug('Building ' + name);
      var content,
        properties = _.merge(build, meta.getProperties(metaData, name, moduleName));

      properties = _.merge(properties, {
        parent: descriptor.shifter || {}
      });

      if (properties.exec) {
        exec.execute(properties.exec, base);
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
        exec.execute(properties.postexec, base);
      }
    });

    if (rollups.length > 0) {
      builder.rollup();
    }

    if (descriptor.postexec) {
      exec.execute(descriptor.postexec, base);
    }

    if (fs.existsSync(assetsBase) && !config.dry) {
      LOG.debug('Copying assets for ' + moduleName);
      copier.assets(assetsBase, config.target, moduleName);
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

      if (!config.dry) {
        writer.js(replace(content, rollup.replace), path.join(config.target, filename, filename), rollup.regex || config.regex);
      }
    });
    rollups = [];
    if (callback) {
      callback();
    }
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

    if (properties.config) {
      data.config = JSON.stringify(properties.config).slice(1, -1).replace(/\"/g, '\'');
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

    if (!config.dry) {
      writer.js(content, path.join(config.target, filename, filename), config.regex || properties.regex);
    }

    // i18n
    if (properties.lang && !config.dry) {
      writer.lang(properties.lang, path.join(base, 'lang'), path.join(config.target, filename, 'lang', filename), name, data);
    }

    if (properties.skinnable) {
      builder.skin(name, filename, base, properties);
    }

    if (properties.copy && !config.dry) {
      copier.copy(properties.copy, base, path.join(config.target, filename));
    }
    return content;
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
      // Core css is not needed in the output.
      //mkdirp.sync(path.join(config.target, filename, 'assets', 'skins'));
      if (fs.existsSync(corePath)) {
        core = fs.readFileSync(corePath);
        //fs.writeFileSync(path.join(config.target, filename, 'assets', filename + '-core.css'), core, 'utf8');
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

    content = data.join(EOL);
    builder.buildCss(content, targetPath, filename, name, properties);
    return content;
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

    content = templates.css({
      body: content,
      name: moduleName
    });
    if (!config.dry) {
      writer.css(content, path.join(targetPath, filename));
    }
    if (callback) {
      callback(content);
    }
  }
};


module.exports = builder;
