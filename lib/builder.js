'use strict';
var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    LOG = require('winston'),
    glob = require('glob'),
    chalk = require('chalk'),
    templates = require('./templates.js'),
    //! alias = require('./alias'),
    _ = require('lodash'),
    jsonminify = require('jsonminify'),
    rimraf = require('rimraf'),
    EOL = require('os').EOL,
    exec = require('./utils/executor'),
    copier = require('./utils/copier'),
    meta = require('./utils/meta'),
    writer = require('./writer'),
    linter = require('./lint/linter'),
    rollups = [],
    config = {},
    lintConfig = {},
    defaultConfig = {
      regex: /^.*?(?:Y.log).*?(?:;|).*;|(\/\*\@DBG\*\/)/mg,
      target: path.join(process.cwd(), 'target')
    };

/**! Replace the content with the given keys.
 * @param content {string} The current content.
 * @param keys {array} The keys to be replaced.
 */
function replace(content, keys) {
  _.forEach(_.merge(config, keys || {}), function(value, key) {
    // If the key does not have ```@key@```, it will be added.
    if (key.indexOf('\@') != 0) {
      key = '\@' + key + '\@';
    }
    // Replace the given key in the entire content.
    content = content.replace(new RegExp(key, 'gi'), value);
  });
  return content;
};

/**! Check that the path is valid.
 * @param base {string} The base path.
 * @param file {string} The current file.
 * @param type {string} The file type (js or css).
 */
function checkPath(base, file, type) {
  // Checks if the path starts with the type (```js or css```).
  if (path.normalize(file).indexOf(type + path.sep) != 0) {
    // If not add the type.
    return path.join(base, type, file);
  }
  return path.join(base, file);
};

var builder = {
  /**! Load the configuration.
   * @param options {object} The given options for the builder.
   * @param lintOptions {object} The jshint options.
   */
  load: function(options, lintOptions) {
    // Merge the options with the default options.
    config = _.merge(defaultConfig, options || {});
    lintConfig = lintOptions || {};
    //! if (config.aka) {
    //!   alias.load();
    //! }
  },

  /**! Start a full build.
   * @param base {string} The base path.
   * @param callback {function} The callback to be called with the results.
   */
  build: function(base, callback) {
    // Search for every available module under the base path. ```Reverse``` is added to be compatible with ```shifter```.
    var files = glob.sync(path.join(base, '**', 'build.json')).reverse(),
      each = async.eachLimit;

    LOG.info(chalk.blue('Building ' + files.length + ' modules'));
    // Clean the target folder
    if (!config.dry) {
      LOG.debug('Removing target folder');
      rimraf.sync(config.target);
    }

    //! Alias need sequential loop.
    //! if (config.aka) {
    //!   each = async.eachSeries;
    //! }

    each(files, 20, builder.buildModule, function(err) {
      if (err) {
        callback(err);
      }
      builder.rollup(callback);
    });
  },

  /**! Build a single module.
   * @param file {string} The ```build.json``` file.
   * @param next {function} The callback to be called when the build is done.
   */
  buildModule: function(file, next) {
    var descriptor = JSON.parse(fs.readFileSync(file)),
      base = path.dirname(file),
      cache,
      assetsBase,
      moduleName,
      metaData;

    // Run the prebuilds for the current build.
    if (descriptor.prebuilds) {
      // Save the current descriptor to be used when the prebuilds are done.
      cache = descriptor;
      _.forEach(descriptor.prebuilds, function(prebuild) {
        LOG.debug('prebuild: ' + prebuild);
        // Build the prebuilds
        builder.buildModule(path.join(base, '..', prebuild, 'build.json'), function(err) {
          if (err) {
            LOG.debug(JSON.stringify(descriptor));
            throw new Error(err);
          }
        });
      });
      // Copy the original descriptor.
      descriptor = cache;
    }

    // The base path for the module.
    base = path.dirname(file);
    // The assets path for the module.
    assetsBase = path.join(base, 'assets');
    // The module name.
    moduleName = descriptor.name;
    // The meta data object for this module.
    metaData = meta.get(base);

    // This build was already built by pre/post builds
    if (fs.existsSync(path.join(config.target, moduleName)) && config.gallop) {
      LOG.debug('Skiping second build of ' + moduleName);
      next();
      return;
    }

    LOG.info('Building ' + moduleName);

    // Add the rollups to the rollups object so they can be build after the current build.
    if (descriptor.rollups) {
      _.forEach(descriptor.rollups, function(rollup, name) {
        // Set the rollup name.
        if (!rollup.name && !rollup.basefilename) {
          rollup.name = name;
        }
        if (_.findIndex(rollups, rollup) < 0) {
          rollups.push(rollup);
        }
      });
    }

    // Execute the execs defined by the descriptor.
    if (descriptor.exec) {
      exec.execute(descriptor.exec, base);
    }

    // Build each files.
    _.forEach(descriptor.builds, function(build, name) {
      if (typeof build === 'string') {
        return;
      }

      LOG.debug('Building ' + name);
      var content,
        properties = _.merge(build, meta.getProperties(metaData, name, moduleName));

      // Add the descriptor properties as the parent properties
      properties = _.merge(properties, {
        parent: descriptor.shifter || {}
      });

      // Execute the execs defined for the module.
      if (properties.exec) {
        exec.execute(properties.exec, base);
      }

      try {
        if (build.jsfiles && build.jsfiles.length) {
          // Build as javascript module.
          builder.js(name, build.jsfiles, properties, base);
        } else if (build.cssfiles && build.cssfiles.length) {
          // Build as css module.
          builder.css(name, build.cssfiles, properties, base);
        }
      } catch(e) {
        // If something went wrong, the ```next``` function is called with an error.
        next(e);
      }

      // Execute the post build execs defined for the module.
      if (properties.postexec) {
        exec.execute(properties.postexec, base);
      }
    });

    // If any rollup is present, build them.
    if (rollups.length > 0) {
      builder.rollup();
    }

    // Execute the post build execs defined by the descriptor.
    if (descriptor.postexec) {
      exec.execute(descriptor.postexec, base);
    }

    // If the assets folder is present copy all the static content.
    if (fs.existsSync(assetsBase) && !config.dry) {
      LOG.debug('Copying assets for ' + moduleName);
      copier.assets(assetsBase, config.target, moduleName);
    }

    // Run the postbuilds for the current build.
    if (descriptor.postbuilds) {
      _.forEach(descriptor.postbuilds, function(prebuild) {
        LOG.debug('postbuilds: ' + prebuild);
        // Build the postbuilds
        builder.buildModule(path.join(base, '..', prebuild, 'build.json'), function(err) {
          if (err) {
            throw new Error(err);
          }
        })
      });
    }
    // Run the next build without errors.
    next();
  },

  /**! Build the rollups for the current module.
   * @param file {string} The ```build.json``` file.
   * @param next {function} The callback to be called when the build is done.
   */
  rollup: function(callback) {
    LOG.info('Building rollups');
    async.each(rollups, function(rollup) {
      var content= '',
        filename = rollup.basefilename || rollup.name;
      LOG.info('Creating rollup: ' + filename);

      _.forEach(rollup.files, function(file) {
        // Concatenate all the ```debug``` versions of the modules.
        var filePath = path.join(config.target, file, file + '-debug.js');
        // If the file does not exist dont do anything. It must be a typo.
        if (fs.existsSync(filePath)) {
          content += fs.readFileSync(filePath);
        } else {
          LOG.info(file + ' Does not exist.');
        }
      });

      // Wrap the content with the necesary YUI custom template.
      content = templates.rollup({
        body: content,
        version: config.version,
        config: JSON.stringify(rollup.config),
        name: rollup.name
      });

      if (!config.dry) {
        // Write the output files.
        writer.js(replace(content, rollup.replace), path.join(config.target, filename, filename), rollup.regex || config.regex);
      }
    });
    // Clean the rollups for the next build.
    rollups = [];
    // Call the callback, if any.
    if (callback) {
      callback();
    }
  },

  /**! Build the javascript module.
   * @param name {string} The name of the module.
   * @param files {array} The files to concatenate.
   * @param properties {obejct} The properties for the module.
   * @param base {string} The base path for the module.
   */
  js: function(name, files, properties, base) {
    var content = "",
      valid,
      data = {
        dependencies: JSON.stringify(properties.requires || {}, null, 2).replace(/\"/g, '\''),
        name: properties.name || name,
        version: config.version
      },
      filename = properties.basefilename || name,
      generated = properties.shifter && properties.shifter.generated,
      addStamp = properties.shifter && properties.shifter.jsstamp !== false,
      useStamp = properties.shifter && properties.shifter.usestamp;


    // If lang is present, add lang to the template data.
    if (properties.lang) {
      data.lang= JSON.stringify(properties.lang, null, 2).replace(/\"/g, '\'');
    }

    // This is not documented in shifter but used in autocomplete-base.
    if (properties.optional) {
      data.optional = JSON.stringify(properties.optional || {}, null, 2).replace(/\"/g, '\'');
    }

    // If the module is skinnable, add it to the template data.
    if (properties.skinnable) {
      data.skinnable = properties.skinnable;
    }

    // Add any extra configuration present.
    if (properties.config) {
      data.config = JSON.stringify(properties.config).slice(1, -1).replace(/\"/g, '\'');
    }

    // Concatenate all the javascript files.
    _.forEach(files, function(file) {
      var filePath = checkPath(base, file, 'js');
      if (fs.existsSync(filePath)) {
        content += fs.readFileSync(filePath, 'utf8');
      }
    });

    data.body = content;

    // Wrape it using the ```use``` template.
    if (useStamp) {
      content = templates.use(data);
    } else if (!properties.shifter || addStamp) {
      // Wrape it using the ```add``` template.
      content = templates.add(data);
    }

    // Preapend files defined by the properties.
    if (properties.prependfiles) {
      _.forEach(properties.prependfiles, function(append) {
        var fileContent = fs.readFileSync(checkPath(base, append, 'js'), 'utf8');
        content = fileContent + EOL + content;
      });
    }

    // Append files defined by the properties.
    if (properties.appendfiles) {
      _.forEach(properties.appendfiles, function(append) {
        var fileContent = fs.readFileSync(checkPath(base, append, 'js'), 'utf8');
        content = content + EOL + fileContent;
      });
    }

    // Replace all the ```replace--XXX``` properties.
    content = replace(content, properties.replace);
    // If the files are not auto-generated and the lint is present, run jshint.
    if (!generated && properties.parent.lint !== false && config.lint !== false) {
      valid = linter.verify(config.linter, content, lintConfig, name);
      // If jshint fails and the properties does not cover it, fail the build.
      if (!valid && properties.fail !== false && properties.parent.fail !== false && config.fail !== false) {
        throw new Error('JSHINT failed for module ' + name);
      }
    }

    if (!config.dry) {
      // Write the output files.
      writer.js(content, path.join(config.target, filename, filename), config.regex || properties.regex);
    }

    // If I18N is present, write the language files.
    if (properties.lang && !config.dry) {
      writer.lang(properties.lang, path.join(base, 'lang'), path.join(config.target, filename, 'lang', filename), name, data);
    }

    // If skin is present, write the skin files.
    if (properties.skinnable) {
      builder.skin(name, filename, base, properties);
    }

    // Copy the folders expressed by the descriptor.
    if (properties.copy && !config.dry) {
      copier.copy(properties.copy, base, path.join(config.target, filename));
    }
    // Return the content for the javascript module.
    return content;
  },

  /**! Build the skin for the current module.
   * @param name {string} The name of the module.
   * @param filename {string} The name for the output file.
   * @param base {string} The base path for the module.
   * @param properties {obejct} The properties for the module.
   */
  skin: function(name, filename, base, properties) {
    var basePath = path.join(base, 'assets'),
      skinPath = path.join(basePath, 'skins'),
      corePath = path.join(basePath, name + '-core.css'),
      core = '',
      skins;

      /** Search for the skin folder. There are two options:
       * * base path + skins (for simple module).
       * * base path + module name + skins (for modules with submodules that contains skins).
       */
      if (!fs.existsSync(skinPath)) {
        skinPath = path.join(basePath, name, 'skins');
        corePath = path.join(basePath, name, name + '-core.css');
        if (!fs.existsSync(skinPath)) {
          // If the skin is not present return.
          LOG.error(name + ' does not have a skin, please remove the skinnable attribute.');
          return;
        }
      }

      skins = fs.readdirSync(skinPath);
      // Core css is not needed in the output.
      //! mkdirp.sync(path.join(config.target, filename, 'assets', 'skins'));
      if (fs.existsSync(corePath)) {
        core = fs.readFileSync(corePath);
        //! fs.writeFileSync(path.join(config.target, filename, 'assets', filename + '-core.css'), core, 'utf8');
      }

      /** Run the same procedure for each skin.
       * * Concatenate the core and the current skin.
       * * Apply the ```YUI``` template for css.
       * * Uglify and minify
       */
      _.forEach(skins, function(skin) {
        var skinContent = fs.readFileSync(path.join(skinPath, skin, name + '-skin.css')),
          content = core + EOL + skinContent,
          targetPath = path.join(config.target, filename, 'assets', 'skins', skin);

        // Build the css files.
        builder.buildCss(content, targetPath, filename, name, properties);
      });
  },

  /**! Build the css module.
   * @param name {string} The name of the module.
   * @param files {array} The files to concatenate.
   * @param properties {obejct} The properties for the module.
   * @param base {string} The base path for the module.
   */
  css: function(name, files, properties, base) {
    var content,
      data = [],
      filename = properties.basefilename || name,
      targetPath = path.join(config.target, filename);

    // Read and accumlate all the files.
    _.forEach(files, function(file) {
      var filePath = checkPath(base, file, 'css');
      if (fs.existsSync(filePath)) {
        data.push(fs.readFileSync(filePath, 'utf8'));
      }
    });

    // Concatenate all the files.
    content = data.join(EOL);
    // Build the css files.
    builder.buildCss(content, targetPath, filename, name, properties);
    return content;
  },

  /**! Build the css files.
   * @param data {string} The data to wrap and write to the output files.
   * @param targetPath {string} The output path for the module.
   * @param filename {string} The name for the output file.
   * @param moduleName {string} The name of the module.
   * @param properties {obejct} The properties for the module.
   * @param callback {function} The callback to be called with the results.
   */
  buildCss: function(data, targetPath, filename, moduleName, properties, callback) {
    // Replace all the ```replace--XXX``` properties.
    var content = replace(data, properties.replace),
      valid;

    // Run ```csslint```, if enabled.
    if (config.csslint !== false && properties.csslint !== false) {
      valid = linter.verify('csslint', content, {}, moduleName);
      // If an error occured and the fail is set, throw an exception.
      if (!valid && properties.fail !== false && properties.parent.fail !== false) {
        throw new Error('CSSLINT failed for module ' + moduleName);
      }
    }

    // Wrap the content with the ```css``` files to be compatibility with ```shifter```.
    content = templates.css({
      body: content,
      name: moduleName
    });

    if (!config.dry) {
      // Write the output files.
      writer.css(content, path.join(targetPath, filename));
    }
    // Call the callback, if any.
    if (callback) {
      callback(content);
    }
  }
};


module.exports = builder;
