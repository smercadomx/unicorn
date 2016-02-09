var assert = require('assert'),
  writer = require('../lib/writer'),
  rimraf = require('rimraf'),
  path = require('path'),
  fs = require('fs'),
  target = path.join('aux', 'test');

describe('Writer', function() {
  beforeEach(function() {
    rimraf.sync(target);
  });
  afterEach(function() {
    rimraf.sync(target);
  });

  describe('js', function () {
    it('generation', function () {
      var content = 'var content;',
        result;

      writer.js(content, target);
      result = fs.readFileSync(target + '.js', 'utf-8');
      assert.equal(result, content);
      result = fs.readFileSync(target + '-min.js', 'utf-8');
      assert.equal(result, content);
      result = fs.readFileSync(target + '-debug.js', 'utf-8');
      assert.equal(result, content);
    });

    it('generation-regex', function () {
      var content = 'var content;',
        debug = content + '\nY.log(\'log\');',
        result;

      writer.js(debug, target, /^.*?(?:Y.log).*?(?:;|).*;|(\/\*\@DBG\*\/)/mg);
      result = fs.readFileSync(target + '.js', 'utf-8');
      assert.equal(result.replace(/(\r\n|\n|\r)/gm, ''), content);
      result = fs.readFileSync(target + '-min.js', 'utf-8');
      assert.equal(result, content);
      result = fs.readFileSync(target + '-debug.js', 'utf-8');
      assert.equal(result, debug);
    });
  });

  describe('css', function () {
    it('generation', function () {
      var content = '.klass {\ndisplay:none;\n}',
        output = '.klass{display:none}',
        result;
      writer.css(content, target);

      result = fs.readFileSync(target + '.css', 'utf-8');
      assert.equal(result, output);
      result = fs.readFileSync(target + '-min.css', 'utf-8');
      assert.equal(result, output);
    });
  });

  describe('lang', function () {
    it('generation', function () {});
    it('generation-default-lang', function () {});
  });
});
