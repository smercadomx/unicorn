'use strict';
var _ = require('lodash'),
  chalk = require('chalk'),
  logger = require('winston'),
  state = {
    error: chalk.red,
    warning: chalk.cyan
  };

var reporter = {
  /**! Show the eslint result to the user.
   *
   * For more information check http://eslint.org/docs/developer-guide/nodejs-api
   * @param message {object} the eslint results.
   * @param name {string} The name of the module.
   */
  report: function(messages, name) {
    _.forEach(messages, function(message) {
        var text = 'ESLint - ' + name + ' : (line: %d, column: %d) rule: %s - %s',
          type = message.fatal? 'error' : 'warning';
        logger.error(state[type](text), message.line, message.column, message.message, message.ruleId);
    });
  }
};

module.exports = reporter;
