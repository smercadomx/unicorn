var assert = require('chai').assert,
  builder = require('../../lib/builder'),
  rimraf = require('rimraf'),
  uglifycss = require('uglifycss'),
  path = require('path'),
  fs = require('fs'),
  LOG = require('winston'),
  source = path.join('tests', 'module'),
  mocks = path.join('tests', 'mocks'),
  target = 'aux-build';

function clean (data) {
  return data.replace(/(\r\n|\n|\r)/gm, '').replace(/\s+/gm, '');
}

describe('Builder', function() {
  before(function() {
    LOG.remove(LOG.transports.Console);
  });
  after(function() {
    LOG.add(LOG.transports.Console);
  });

  beforeEach(function() {
    rimraf.sync(target);
  });
  afterEach(function() {
    rimraf.sync(target);
  });

  describe('CSSLint', function () {
    beforeEach(function() {
      builder.load({
        gallop: true,
        dry: true,
        version: '1.0.0'
      });
    });

    it('CSSLint-pass', function () {
      try {
        builder.css('test', [path.join('css', 'css.css')], {
            target: target,
            replace: {},
            csslint: true,
            fail: true,
            parent: {}
        }, mocks);
        assert.ok('No errors', 'No errors');
      } catch (e) {
        assert.fail('CSSLint must not fail', '', 'CSSLint must not fail');
      }
    });

    it('CSSLint-disabled', function () {
      try {
        builder.css('test', [path.join('css', 'failCss.css')], {
            target: target,
            replace: {},
            csslint: false,
            fail: true,
            parent: {}
        }, mocks);
        assert.ok('No errors', 'No errors');
      } catch (e) {
        assert.fail('CSSLint must not fail', '', 'CSSLint must not fail');
      }
    });

    it('CSSLint-fail-false', function () {
      try {
        builder.css('test', [path.join('css', 'failCss.css')], {
            target: target,
            replace: {},
            csslint: true,
            fail: false,
            parent: {
              fail: true
            }
        }, mocks);
        assert.ok('No errors', 'No errors');
      } catch (e) {
        assert.fail('CSSLint must not fail', '', 'CSSLint must not fail');
      }
    });

    it('CSSLint-parent-fail-false', function () {
      try {
        builder.css('test', [path.join('css', 'failCss.css')], {
            target: target,
            replace: {},
            csslint: true,
            fail: true,
            parent: {
              fail: false
            }
        }, mocks);
        assert.ok('No errors', 'No errors');
      } catch (e) {
        assert.fail('CSSLint must not fail', '', 'CSSLint must not fail');
      }
    });

    it('CSSLint-fail', function () {
      try {
        builder.css('test', [path.join('css', 'failCss.css')], {
            target: target,
            replace: {},
            csslint: true,
            fail: true,
            parent: {}
        }, mocks);
        assert.fail('CSSLint must fail', '', 'CSSLint must fail');
      } catch (e) {
        assert.equal(e.message, 'CSSLINT failed for module test');
      }
    });
  });

  describe('JSHint', function () {
    beforeEach(function() {
      builder.load({
        gallop: true,
        dry: true,
        version: '1.0.0',
        linter: 'jshint'
      });
    });
    it('JSHint-fail', function () {
      try {
        builder.js('test', [path.join('js', 'failJs.js')], {
          shifter: {
          },
          parent: {}
        }, mocks);
        assert.fail('JSHint must fail', '', 'JSHint must fail');
      } catch (e) {
        assert.ok('No errors', 'No errors');
      }
    });

    it('JSHint-pass-generated', function () {
      try {
        builder.js('test', [path.join('js', 'failJs.js')], {
          shifter: {
            generated: true
          },
          parent: {}
        }, mocks);
        assert.ok('No errors', 'No errors');
      } catch (e) {
        assert.fail('JSHint must not fail', '', 'JSHint must not fail');
      }
    });


    it('JSHint-pass', function () {
      try {
        builder.js('test', [path.join('js', 'failJs.js')], {
          parent: {
            lint: false
          }
        }, mocks);
        assert.ok('No errors', 'No errors');
      } catch (e) {
        assert.fail('JSHint must not fail', '', 'JSHint must not fail');
      }
    });

    it('JSHint-pass-parent', function () {
      try {
        builder.js('test', [path.join('js', 'failJs.js')], {
          parent: {
            fail: false
          }
        }, mocks);
        assert.ok('No errors', 'No errors');
      } catch (e) {
        assert.fail('JSHint must not fail', '', 'JSHint must not fail');
      }
    });
  });

  describe('ESLint', function () {
    beforeEach(function() {
      builder.load({
        gallop: true,
        dry: true,
        version: '1.0.0',
        linter: 'eslint'
      }, {
        rules: {
          semi: 2
        }
      });
    });
    it('ESLint-fail', function () {
      try {
        builder.js('test', [path.join('js', 'failJs.js')], {
          shifter: {
          },
          parent: {}
        }, mocks);
        assert.fail('ESLint must fail', '', 'ESLint must fail');
      } catch (e) {
        assert.ok('No errors', 'No errors');
      }
    });

    it('ESLint-pass-generated', function () {
      try {
        builder.js('test', [path.join('js', 'failJs.js')], {
          shifter: {
            generated: true
          },
          parent: {}
        }, mocks);
        assert.ok('No errors', 'No errors');
      } catch (e) {
        assert.fail('ESLint must not fail', '', 'ESLint must not fail');
      }
    });


    it('ESLint-pass', function () {
      try {
        builder.js('test', [path.join('js', 'failJs.js')], {
          parent: {
            lint: false
          }
        }, mocks);
        assert.ok('No errors', 'No errors');
      } catch (e) {
        assert.fail('ESLint must not fail', '', 'ESLint must not fail');
      }
    });

    it('ESLint-pass-parent', function () {
      try {
        builder.js('test', [path.join('js', 'failJs.js')], {
          parent: {
            fail: false
          }
        }, mocks);
        assert.ok('No errors', 'No errors');
      } catch (e) {
        assert.fail('ESLint must not fail', '', 'ESLint must not fail');
      }
    });
  });
});
