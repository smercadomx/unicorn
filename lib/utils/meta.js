'use strict';
var fs = require('fs'),
    path = require('path'),
    _ = require('lodash'),
    jsonminify = require('jsonminify'),
    glob = require('glob');

module.exports = {
  /**! Return the properties for the given module/submodule
   * @param meta {object} The current metadata object.
   * @param module {string} The current module being built.
   * @param parent {string} The parent module of the current module being built.
   */
  getProperties: function(meta, module, parent) {
    // The module is being built.
    if (meta[module]) {
      return meta[module];
    }

    // A submodule is being built.
    if (meta[parent] && meta[parent].submodules && meta[parent].submodules[module]) {
      return meta[parent].submodules[module];
    }

    // A plugin is being built.
    if (meta[parent] && meta[parent].plugins && meta[parent].plugins[module]) {
      return meta[parent].plugins[module];
    }

    // Anything else does not have meta-data to be added.
    return {};
  },

  /**! Return the meta-data for the module.
   * @param base {string} The base for the module being built.
   */
  get: function(base) {
    // Search for the meta-data.
    var files = glob.sync(path.join(base, 'meta', '*.json')),
      meta = {};
    // Merge all the files under the ```meta``` folder.
    _.forEach(files, function(file) {
      meta = _.merge(meta, JSON.parse(jsonminify(fs.readFileSync(file, 'utf8'))));
    });
    // Return the meta-data for the module.
    return meta;
  }
}
