'use strict';
var _ = require('lodash'),
  chalk = require('chalk'),
      logger = require('winston');

var reporter = {
  /**! Show the jshint result to the user.
   *
   * For more information check http://jshint.com/docs/api/.
   * @param data {object} the jshint results.
   * @param name {string} The name of the module.
   */
  report: function(data, name) {
    /**
    ```
    errors: [
      {
        id: '(error)',
        raw: 'Read only.',
        code: 'W020',
        evidence: 'foo = 3;',
        line: 2,
        character: 1,
        scope: '(main)',
        a: undefined,
        b: undefined,
        c: undefined,
        d: undefined,
        reason: 'Read only.'
      }
    ]
    ```
    */
    if (data.errors && data.errors.length > 0) {
      _.forEach(data.errors, function(error) {
        if (error) {
          logger.error(chalk.red('JSHint - ' + name + ': Error (' + error.code + '): ' + error.reason + ' @' + error.line + ':' + error.character + ' - Evidence: ' + error.evidence));
        }
      });
    }

    /**
    ```
    unused: [
      {
        name: 'goo',
        line: 1, character: 10
      }
    ]
    ```
    */
    if (data.unused && data.unused.length > 0) {
      _.forEach(data.unused, function(unused) {
        logger.info(chalk.yellow('JSHint - ' + name + ': Unsused variable [' + unused.name +'] @' + unused.line + ':' + unused.character));
      });
    }
  }
};

module.exports = reporter;
