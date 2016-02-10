var assert = require('chai').assert,
  copier = require('../../../lib/utils/copier'),
  rimraf = require('rimraf'),
  path = require('path'),
  mkdirp = require('mkdirp'),
  fs = require('fs'),
  target = path.join('aux'),
  source = path.join('tests', 'module', 'assets');

describe('Copier', function() {
  beforeEach(function() {
    rimraf.sync(path.dirname(target));
  });
  afterEach(function() {
    rimraf.sync(path.dirname(target));
  });

  describe('assets', function () {
    it('copy-assets', function () {
      var output = path.join(target, 'test', 'assets', 'skins');
      copier.assets(source, target, 'test');
      try {
        fs.statSync(path.join(output, 'adamantium', 'claw.png'));
        fs.statSync(path.join(output, 'static', 'picture.png'));
        fs.statSync(path.join(target, 'skinless', 'assets', 'cloth.jpg'));
      } catch (e) {
        assert.fail('Files not copied', '', 'Files not copied');
      }

      try {
        fs.statSync(path.join(output, 'adamantium', 'test.css'));
        fs.statSync(path.join(output, 'test-core.css'));
        assert.fail('Files not copied', '', 'Files  not copied');
      } catch(e) {
        assert.ok('CSS not copied', 'Everything is ok');
      }
    });
  });

  describe('copy', function () {
    it('copy-assets', function () {
      copier.copy([['./bin', './copy']], process.cwd(), target);
      try {
        fs.statSync(path.join(target, 'copy', 'bin', 'unicorn'));
        assert.ok('CSS not copied', 'Everything is ok');
      } catch(e) {
        assert.fail('Files not copied', '', 'Files  not copied');
      }
    });
  });
});
