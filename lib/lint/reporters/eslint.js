'use strict';
var _ = require('lodash'),
  chalk = require('chalk'),
  logger = require('winston'),
  EOL = require('os').EOL,
  state = {
    error: {
      color: chalk.red,
      logType: 'error'
    },
    warning: {
      color: chalk.yellow,
      logType: 'warn'
    }
  };

var reporter = {
  /**! Show the eslint result to the user.
   *
   * For more information check http://eslint.org/docs/developer-guide/nodejs-api
   * @param message {object} the eslint results.
   * @param name {string} The name of the module.
   */
  report: function (messages, name) {
    console.log();
    logger.info(chalk.cyan('ESLint: ' + name));
    _.forEach(messages, function (message) {
      var rule, type = message.severity > 1 ? 'error' : 'warning';

      if (message.message && message.message.trim().length) {
        rule = message.message;
      }
      if (message.ruleId && message.ruleId.trim().length) {
        rule += ' (' + message.ruleId + ')';
      }

      logger.log(state[type].logType, '%d:%d\t' +
        state[type].color(type) + '\t %s',
        message.line, message.column, rule);
    });
  }
};

module.exports = reporter;
