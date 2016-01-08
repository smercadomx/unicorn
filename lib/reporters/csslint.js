var _ = require('lodash'),
  chalk = require('chalk'),
  logger = require('winston'),
  state = {
    error: chalk.red,
    warning: chalk.cyan
  };

var reporter = {
  // https://github.com/CSSLint/csslint/wiki/Using-in-a-Node.js-Application
  report: function(data, name) {
    if (data.messages && data.messages.length > 0) {
      _.forEach(data.messages, function(message) {
        var type = message.type;
        if (message.line) {
          logger.error(state[type]('CSSLint - ' + name + ' : %s (line %d, col %d): %s'), type, message.line, message.col, message.message);
        } else {
          logger.error(state[type]('CSSLint - ' + name + ' : %s - %s'), type, message.message);
        }
      });
    }
  }
};

module.exports = reporter;
