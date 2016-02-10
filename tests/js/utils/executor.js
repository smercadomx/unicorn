var assert = require('chai').assert,
  path = require('path'),
  executor = require('../../../lib/utils/executor');

describe('Executor', function() {
  beforeEach(function() {
  });

  afterEach(function() {
  });

  describe('execute', function () {
    it('execute-script', function () {
      var output;
      output = executor.execute([path.join('scripts', 'script.js')],
          path.join(__dirname, '..', '..', 'module'));

      assert.equal(output.length, 1);
      assert.equal(output[0].stdout.replace(/(\r\n|\n|\r)/gm, ''), 'script');
      assert.equal(output[0].stderr, '');
    });

    it('execute-script-error', function () {
      try {
      executor.execute([path.join('scripts', 'error.js')],
          path.join(__dirname, '..', '..', 'module'));
      } catch(e) {
        assert.isTrue(e.message.indexOf('this is an error message') > 0);
      }
    });

    it('execute-command', function () {
      var output;
      output = executor.execute(['echo command'],
          path.join(__dirname, '..', '..', 'module'));

      assert.equal(output.length, 1);
      assert.equal(output[0].stdout.replace(/(\r\n|\n|\r)/gm, ''), 'command');
      assert.equal(output[0].stderr, '');
    });
  });
});
