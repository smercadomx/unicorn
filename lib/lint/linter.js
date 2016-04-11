'use strict';
var _ = require('lodash'),
  jshint = require('jshint/src/jshint').JSHINT,
  jshintReporter = require('./reporters/jshint'),
  eslint = require("eslint").linter,
  eslintReporter = require('./reporters/eslint'),
  cssLint = require('csslint').CSSLint,
  csslintReporter = require('./reporters/csslint');

// List of linters available.
var linters = {
  /**! Run a jshint on the content with the given config.
   *
   * The content is valid if no fatal errors are found.
   * @param content {string} The content to verify.
   * @param config {object} The configuration for the linter.
   * @param name {string} The name of the current module.
   * @return True if the content is valid, false otherwise.
   */
  jshint: function(content, config, name) {
    // Run the linter.
    var valid = jshint(content, config);
    // Show to result to the user.
    jshintReporter.report(jshint.data(), name);
    return valid;
  },

  /**! Run a eslint on the content with the given config.
   *
   * The content is valid if no fatal errors are found.
   * @param content {string} The content to verify.
   * @param config {object} The configuration for the linter.
   * @param name {string} The name of the current module.
   * @return True if the content is valid, false otherwise.
   */
  eslint: function(content, config, name) {
    // Run the linter.
    var data = eslint.verify(content, config);
    // Show to result to the user.
    eslintReporter.report(data, name);
    return _.find(data, function(error) { return error.severity && error.severity > 1}) ? false : true;
  },

  /**! Run a csslint on the content with the given config.
   *
   * The content is valid if no fatal errors are found.
   * @param content {string} The content to verify.
   * @param config {object} The configuration for the linter.
   * @param name {string} The name of the current module.
   * @return True if the content is valid, false otherwise.
   */
  csslint: function(content, config, name) {
    // Run the linter.
    var result = cssLint.verify(content, config);
    // Show to result to the user.
    csslintReporter.report(result, name);
    return _.find(result.messages, {type: 'error'}) ? false : true;
  }
};

module.exports = {
  /**! Run the given linter on the content with the given config.
   *
   * The content is valid if no fatal errors are found.
   * @param linter {string} The linter to run.
   * @param content {string} The content to verify.
   * @param config {object} The configuration for the linter.
   * @param name {string} The name of the current module.
   * @return True if the content is valid, false otherwise.
   */
  verify: function(linter, content, config, name) {
    return linters[linter || 'jshint'](content, config, name);
  }
};
