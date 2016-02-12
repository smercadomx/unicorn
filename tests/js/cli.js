var assert = require('chai').assert,
  cli = require('../../lib/cli'),
  builder = require('../../lib/builder'),
  watch = require('node-watch'),
  LOG = require('winston'),
  path = require('path'),
  sinon = require('sinon'),
  source = 'tests',
  sandbox;


describe('cli', function() {
  before(function() {
    LOG.remove(LOG.transports.Console);
  });
  after(function() {
    LOG.add(LOG.transports.Console);
  });

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('compile', function () {
    it('gallop', function (done) {
      sandbox.stub(builder, 'build').callsArgWith(1, false);
      cli.compile({
        cwd: source,
        gallop: true,
        dry: true
      }, function() {
        done();
      });
    });

    it('gallop-fail', function (done) {
      sandbox.stub(builder, 'build').callsArgWith(1, true);
      try {
        cli.compile({
          cwd: source,
          gallop: true,
          dry: true
        }, function() {
          assert.fail('This must fail', '', 'This must fail');
        });
      } catch(e) {
        done();
      }
    });

    it('build-model', function (done) {
      sandbox.stub(builder, 'buildModule').callsArgWith(1, false);
      sandbox.stub(builder, 'rollup').callsArg(0);
      try {
        cli.compile({
          cwd: path.join(source, 'module'),
          dry: true
        }, function() {
          done();
        });
      } catch(e) {
        assert.fail('This must not fail', '', 'This must not fail');
      }
    });

    it('build-model-fail', function (done) {
      sandbox.stub(builder, 'buildModule').callsArgWith(1, true);
      try {
        cli.compile({
          cwd: path.join(source, 'module'),
          dry: true
        }, function() {
          assert.fail('This must not fail', '', 'This must not fail');
        });
      } catch(e) {
        done();
      }
    });

    it('no-shifter-file', function () {
      try {
        cli.compile({
          cwd: __dirname
        }, function() {});
        assert.fail('This must fail', '', 'This must fail');
      } catch(e) {
        assert.ok('No .shifter.json', 'No .shifter.json');
      }
    });
  });
});
