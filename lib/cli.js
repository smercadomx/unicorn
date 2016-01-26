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

function build(current) {
  var buildFile = findup('build.json', {
      cwd: path.normalize(current)
    });

  if (!buildFile) {
    logger.error(chalk.red('No build file found in this location.'));
    return;
  }

  builder.buildModule(buildFile, function(err) {
    if (err) {
      throw new Error(err);
    } else {
      builder.rollup(function() {
        if (err) {
          throw new Error(err);
        }
        logger.info(chalk.green('Build successfully'));
      });
    }
  });
}

module.exports =  {
  compile: function(options, callback) {
    var base = options.cwd || process.cwd();

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
      jshintrc = JSON.parse(jsonminify(fs.readFileSync(jshintrcPath, 'utf8')));
    }

    if (!configPath) {
      logger.error(chalk.red('No .shifter.json file found.'));
      return;
    }

    logger.level = options.whisper? 'error': options.roar? 'silly' : 'info';
    // Search for .shifter
    logger.info(chalk.blue('Found .shifter file at ' + configPath));
    config = JSON.parse(jsonminify(fs.readFileSync(configPath, 'utf8')));

    // Building target dir.
    if (config['build-dir']) {
      config.target = path.resolve(path.dirname(configPath), config['build-dir']);
    }

    config = _.merge(config, options);

    // Remove `replace-` from the replacers
    config = _.mapKeys(config, function(value, key) {
      return key.replace(/replace\-/g, '');
    });

    // Should we lint the js?
    config.lint = !(options.sprint || options.jumpjs);
    // Should we lint the css?
    config.csslint = !(options.sprint || options.jumpcss);
    // Loading the config
    builder.load(config, jshintrc);

    // watch
    if (options.watch) {
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
      // Run full build
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
      // module
      logger.profile('build');
      build(base);
      logger.profile('build');
    }
  }
}
