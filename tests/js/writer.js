var assert = require('chai').assert,
  writer = require('../../lib/writer'),
  rimraf = require('rimraf'),
  path = require('path'),
  mkdirp = require('mkdirp'),
  fs = require('fs'),
  target = path.join('aux', 'test');

describe('Writer', function() {
  beforeEach(function() {
    rimraf.sync(path.dirname(target));
  });
  afterEach(function() {
    rimraf.sync(path.dirname(target));
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
    it('generation', function () {
      var langs = ['en', 'es', 'fr'],
        data = {
          version: '1.0.0',
          name: 'test'
        },
        result;

      writer.lang(langs, path.join('tests', 'module', 'lang'), target, 'test', data);
      result = fs.readFileSync(target + '_en.js', 'utf-8');
      assert.isTrue(result.indexOf('"en"') > 0);
      assert.isTrue(result.indexOf('"es"') < 0);
      result = fs.readFileSync(target + '_es.js', 'utf-8');
      assert.isTrue(result.indexOf('"es"') > 0);
      assert.isTrue(result.indexOf('"en"') < 0);
      result = fs.readFileSync(target + '_fr.js', 'utf-8');
      assert.isTrue(result.indexOf('"fr"') > 0);
      assert.isTrue(result.indexOf('"es"') < 0);
    });

    it('generation-default-lang', function () {
      var data = {
          version: '1.0.0',
          name: 'test'
        },
        result;


        // create the default lang file.
        mkdirp.sync(path.dirname(target));
        fs.writeFileSync(target + '.js', JSON.stringify({
          value: 'key'
        }), 'utf8');

        writer.lang([], path.dirname(target), target, 'test', data);
        result = fs.readFileSync(target + '.js', 'utf-8');
        assert.equal(result, 'YUI.add("lang/test",function(t){t.Intl.add("test","",{value:"key"})},"1.0.0");');
    });
  });
});
