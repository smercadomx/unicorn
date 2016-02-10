var assert = require('chai').assert,
  expect = require('chai').expect,
  meta = require('../../../lib/utils/meta'),
  path = require('path'),
  fs = require('fs'),
  source = path.join('tests', 'module'),
  metaData;

describe('Meta', function() {
  describe('meta', function () {
    it('get', function () {
      var output = meta.get(source);
      assert.equal(output.test.requires, 'test-submodule');
      assert.equal(output.test.submodules['test-submodule'].requires, 'dependency');
    });
  });

  describe('properties', function () {
    before(function() {
      metaData = meta.get(source);
    });

    it('module', function () {
      assert.equal(meta.getProperties(metaData, 'test').requires, 'test-submodule');
    });

    it('submodule', function () {
      assert.equal(meta.getProperties(metaData, 'test-submodule', 'test').requires, 'dependency');
    });

    it('module-plugins', function () {
      assert.equal(meta.getProperties(metaData, 'plugin', 'test').requires, 'something');
    });

    it('empty', function () {
      expect(meta.getProperties(metaData, 'nothing')).to.be.empty;
    });
  });
});
