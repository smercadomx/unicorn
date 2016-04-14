'use strict';
var _ = require('lodash'),
  mkdirp = require('mkdirp'),
  glob = require('glob'),
  fs = require('fs'),
  path = require('path');

module.exports = {
  /**! Copy folders.
   * @param copies {array} Array with source and destination.
   * @param base {string} The base for the copies.
   * @param target {string} The output path.
   */
  copy: function(copies, base, target) {
    _.forEach(copies, function(copy) {
        var sources = glob.sync(path.join(base, copy[0],  '*')),
          destination = path.join(target, copy[1]);
        _.forEach(sources, function(source) {
          var relativePath = path.relative(base, source),
            outputPath = path.join(destination, relativePath);
          mkdirp.sync(path.dirname(outputPath));
          // Copy the file.
          fs.writeFileSync(outputPath, fs.readFileSync(source, 'utf8'));
        });
    });
  },

  /**! Copy the assets folder.
   * @param base {string} The base for the copies.
   * @param target {string} The output path.
   * @param moduleName {string} The name of the module being built.
   */
  assets: function(base, target, moduleName) {
    // Search for all the files that are not css.
    _.forEach(glob.sync('**/!(*.css)', {
      cwd: base
    }), function(file) {
      var filePath = path.join(base, file),
        outputPath = path.join(target, moduleName, 'assets', file);

      // Change glob to do this for us
      if (!fs.statSync(filePath).isFile()) {
          return;
      }

      // If the files are part of the skin, add assets to the path.
      if (file.indexOf('skins/') !== 0) {
        outputPath = file.split('/');
        outputPath.splice(1, 0, 'assets');
        outputPath = path.join(target, outputPath.join(path.sep));
      }

      mkdirp.sync(path.dirname(outputPath));
      // Copy the file.
      fs.createReadStream(filePath).pipe(fs.createWriteStream(path.join(outputPath)));
    });
  }
}