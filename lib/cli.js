'use strict';
var builder = require('./builder'),
    path = require('path'),
    findup = require('findup-sync'),
    logger = require('winston'),
    fs = require('fs'),
    _ = require('lodash'),
    chalk = require('chalk'),
    configPath,
    jshintrcPath,
    watch = require('node-watch'),
    jsonminify = require('jsonminify'),
    config,
    jshintrc;

/**! Run a single module build.
 * @param current {string} The directory to build.
 * @param callback {function} The callback to be called when the build is done.
 */
function build(current, callback) {
  // Searching for the ```build.json``` for the module to build.
  var buildFile = findup('build.json', {
      cwd: path.normalize(current)
    });

  if (!buildFile) {
    // If the ```build.json``` file is not found, it means that the directory is not a valid module.
    logger.error(chalk.red('No build file found in this location.'));
    return;
  }

  // Triggering the build.
  builder.buildModule(buildFile, function(err) {
    if (err) {
      // An error occur, throw an exception.
      throw new Error(err);
    } else {
      // Build rollups, if any.
      builder.rollup(function() {
        if (err) {
          // An error occur while building rollups, throw an exception.
          throw new Error(err);
        }
        logger.info(chalk.green('Build successfully'));
        // Call callback, if any.
        if (callback) {
          callback();
        }
      });
    }
  });
}

module.exports =  {
  /**! Main entry for compilation
   * @param options {object} The options entered by the user.
   * @param callback {function} The callback to be called when the build is done.
   */
  compile: function(options, callback) {
    var base = options.cwd || process.cwd(), packagePath;

    // Search for shifter configuration
    configPath = findup('.shifter.json', {
      cwd: options.cwd,
      nocase: true
    });

    // Search for jshint configuration
    jshintrcPath = findup('.jshintrc', {
      cwd: options.cwd,
      nocase: true
    });

    if (jshintrcPath) {
      // ```jshint``` configuration found.
      jshintrc = JSON.parse(jsonminify(fs.readFileSync(jshintrcPath, 'utf8')));
    }

    if (!configPath) {
      // If not ```.shifter.json``` file was found throw an error.
      logger.error(chalk.red('No .shifter.json file found.'));
      throw new Error('No .shifter.json file found.');
    }

    // Configure the logger level with the configuration.
    logger.level = options.whisper? 'error': options.roar? 'silly' : 'info';
    // Reading the ```.shifter.json file to obtain the basic configurations
    logger.info(chalk.blue('Found .shifter file at ' + configPath));
    config = JSON.parse(jsonminify(fs.readFileSync(configPath, 'utf8')));

    // Getting the target directory by doing the relative path with the current ```.shifter.json``` location.
    if (config['build-dir']) {
      config.target = path.resolve(path.dirname(configPath), config['build-dir']);
    }

    // Merging the configuration files with the user options
    config = _.merge(config, options);

    // Remove `replace-` from the replacers
    config = _.mapKeys(config, function(value, key) {
      return key.replace(/replace\-/g, '');
    });

    // If no version was found in the ```.shifter.json```, the version on the ```package.json``` is going to be used.
    if (!config.version) {
      packagePath = findup('package.json', {
        cwd: options.cwd,
        nocase: true
      });
      config.version = JSON.parse(jsonminify(fs.readFileSync(packagePath, 'utf8'))).version;
    }

    // Checking if ```jshint``` need to be used.
    config.lint = !(options.sprint || options.jumpjs);
    // Checking if ```csslint``` need to be used.
    config.csslint = !(options.sprint || options.jumpcss);
    // Loading the config to the builder.
    builder.load(config, jshintrc);

    if (options.watch) {
      // Running watch builder.
      watch(base, function(filename) {
        logger.profile('watch');
        try {
          build(filename);
        } catch (e) {
          logger.error(chalk.red('Build failed.'));
        }
        logger.profile('watch');
      });
    } else if (options.gallop) {
      // Run full build.
      logger.profile('gallop');
      builder.build(base, function(err) {
        if (err) {
          throw new Error(err);
        }
        logger.profile('gallop');
        if (callback) {
          callback()
        }
      });
    } else {
      // Running the single module build.
      logger.profile('build');
      build(base, callback);
      logger.profile('build');
    }
  }
}
