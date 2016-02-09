'use strict';
var _ = require('lodash'),
  LOG = require('winston'),
  path = require('path'),
  exec = require('sync-exec');

function getNode() {
  if (/^win/.test(process.platform)) {
    return '"' + process.execPath + '"';
  }
  return process.execPath;
};

module.exports = {
  execute: function(scripts, base) {
    _.forEach(scripts, function(script) {
      var command = script,
        output;
      if (path.extname(script) === '.js') {
        command = getNode() + ' ' + path.normalize(script);
      }
      LOG.debug('Executing: ' + command);
      output = exec(command, {
        cwd: base
      });

      if (output.stderr) {
        throw new Error(output.stderr);
      }
      if (output.stdout) {
        LOG.debug(output.stdout);
      }
    });
  }
};
