'use strict';
var _ = require('lodash'),
  LOG = require('winston'),
  path = require('path'),
  exec = require('sync-exec');

// Returns the ```nodejs``` execute path depending on the platform.
function getNode() {
  // If the platform is windows double quotes must be added.
  if (/^win/.test(process.platform)) {
    return '"' + process.execPath + '"';
  }
  return process.execPath;
};

module.exports = {
  /**! Execute the given scripts.
   * @param scripts {array} The scripts to be executed.
   * @param base {string} The base path for the scripts.
   */
  execute: function(scripts, base) {
    var results = [];
    _.forEach(scripts, function(script) {
      var command = script,
        output;
      // The script is a nodejs file. Add nodejs to the command.
      if (path.extname(script) === '.js') {
        command = getNode() + ' ' + path.normalize(script);
      }
      LOG.debug('Executing: ' + command);
      // Execute the command.
      output = exec(command, {
        cwd: base
      });

      // An error occured, notify the user.
      if (output.stderr) {
        throw new Error(output.stderr);
      }
      // Show the user the output.
      if (output.stdout) {
        LOG.debug(output.stdout);
      }
      results.push(output);
    });
    return results;
  }
};
