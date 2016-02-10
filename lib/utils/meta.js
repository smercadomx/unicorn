var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    jsonminify = require('jsonminify'),
    glob = require('glob');

module.exports = {
  getProperties: function(meta, module, parent) {
    if (meta[module]) {
      return meta[module];
    }

    if (meta[parent] && meta[parent].submodules && meta[parent].submodules[module]) {
      return meta[parent].submodules[module];
    }

    if (meta[parent] && meta[parent].plugins && meta[parent].plugins[module]) {
      return meta[parent].plugins[module];
    }

    return {};
  },

  get: function(base) {
    var files = glob.sync(path.join(base, 'meta', '*.json')),
      meta = {};
    _.forEach(files, function(file) {
      meta = _.merge(meta, JSON.parse(jsonminify(fs.readFileSync(file, 'utf8'))));
    });
    return meta;
  }
}
