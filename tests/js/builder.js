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
    builder.load({
      gallop: true,
      dry: true,
      version: '1.0.0'
    });
  });
  afterEach(function() {
    rimraf.sync(target);
  });

  describe('build-css', function () {
    it('content', function () {
        var result = '.someClass{display:none}#yui3-css-stamp.test{display:none}';
        builder.buildCss(fs.readFileSync(path.join(mocks, 'css', 'css.css'), 'utf8'),
          target, 'test', 'test', {
            target: target,
            replace: {},
            csslint: true,
            fail: true,
            parent: {}
        }, function(content) {
          assert.equal(uglifycss.processString(content, {}), result);
        });
    });
  });


  describe('build-js', function () {
    it('build', function () {
      var output = 'YUI.add(\'test\',function(Y/**,NAME*/){vara=1;console.log(a);},\'1.0.0\',{\'requires\':{}});',
        result;
      result = builder.js('test', [path.join('js', 'js.js')], {
        parent: {}
      }, mocks);
      assert.equal(clean(result), output);
    });

    it('build-lang', function () {
      var output = 'YUI.add(\'test\',function(Y/**,NAME*/){vara=1;console.log(a);},\'1.0.0\',{\'requires\':{},\'lang\':[\'es\',\'en\']});',
        result;
      result = builder.js('test', [path.join('js', 'js.js')], {
        lang: ['es', 'en'],
        parent: {}
      }, mocks);
      assert.equal(clean(result), output);
    });

    it('build-skinnable', function () {
      var output = 'YUI.add(\'test\',function(Y/**,NAME*/){vara=1;console.log(a);},\'1.0.0\',{\'skinnable\':true,\'requires\':{}});',
        result;
      result = builder.js('test', [path.join('js', 'js.js')], {
        skinnable: true,
        parent: {}
      }, mocks);
      assert.equal(clean(result), output);
    });

    it('build-optional', function () {
      var output = 'YUI.add(\'test\',function(Y/**,NAME*/){vara=1;console.log(a);},\'1.0.0\',{\'optional\':{\'key\':\'value\'},\'requires\':{}});',
        result;
      result = builder.js('test', [path.join('js', 'js.js')], {
        optional: {
          key: 'value'
        },
        parent: {}
      }, mocks);
      assert.equal(clean(result), output);
    });

    it('build-config', function () {
      var output = 'YUI.add(\'test\',function(Y/**,NAME*/){vara=1;console.log(a);},\'1.0.0\',{\'key\':\'value\',\'key2\':\'value2\',\'requires\':{}});',
        result;
      result = builder.js('test', [path.join('js', 'js.js')], {
        config: {
          key: 'value',
          key2: 'value2'
        },
        parent: {}
      }, mocks);
      assert.equal(clean(result), output);
    });

    it('build-use', function () {
      var output = 'YUI().use({},function(Y){vara=1;console.log(a);});',
        result;
      result = builder.js('test', [path.join('js', 'js.js')], {
        shifter: {
          usestamp: true
        },
        parent: {}
      }, mocks);
      assert.equal(clean(result), output);
    });

    it('build-preappend-append', function () {
      var output = 'vara=1;console.log(a);YUI.add(\'test\',function(Y/**,NAME*/){vara=1;console.log(a);},\'1.0.0\',{\'requires\':{}});vara=1;console.log(a);',
        result;
      result = builder.js('test', [path.join('js', 'js.js')], {
        prependfiles: [path.join('js', 'js.js')],
        appendfiles: [path.join('js', 'js.js')],
        parent: {}
      }, mocks);
      assert.equal(clean(result), output);
    });

    it('build-no-stamp', function () {
      var output = 'vara=1;console.log(a);',
        result;
      result = builder.js('test', [path.join('js', 'js.js')], {
        shifter: {
          usestamp: false,
          jsstamp: false
        },
        parent: {}
      }, mocks);
      assert.equal(clean(result), output);
    });

    it('build-full', function () {
      var output = 'YUI.add(\'test\',function(Y/**,NAME*/){},\'1.0.0\',{\'skinnable\':true,\'requires\':{},\'lang\':[\'es\',\'en\']});',
        result,
        outputPath = path.join(target, 'test');
      builder.load({
        gallop: true,
        version: '1.0.0',
        target: target,
        dry: false
      });
      result = builder.js('test', [path.join('js', 'test.js')], {
        lang: ['es', 'en'],
        skinnable: true,
        copy: [
          ['assets/skinless', 'copy/']
        ],
        parent: {}
      }, source);
      assert.equal(clean(result), output);
      // Checking files
      try {
        // Lang
        fs.statSync(path.join(outputPath, 'lang', 'test_en.js'));
        fs.statSync(path.join(outputPath, 'lang', 'test_es.js'));
        // Copy
        fs.statSync(path.join(outputPath, 'copy', 'assets', 'skinless', 'cloth.jpg'));
        // JS
        fs.statSync(path.join(outputPath, 'test.js'));
        fs.statSync(path.join(outputPath, 'test-min.js'));
        fs.statSync(path.join(outputPath, 'test-debug.js'));
        // Skin
        fs.statSync(path.join(outputPath, 'assets', 'skins', 'adamantium', 'test-min.css'));
        fs.statSync(path.join(outputPath, 'assets', 'skins', 'static', 'test-min.css'));
      } catch (e) {
        assert.fail('Some file is missing', '', 'Some file is missing: ' + e.message);
      }
    });
  });

  describe('build', function () {
    it('build', function () {
      var outputPath = path.join(target, 'test');
      builder.load({
        gallop: true,
        version: '1.0.0',
        target: target,
        dry: false
      });
      builder.build(source, function(err) {
        assert.isUndefined(err);
      });
      try {
        // Lang
        fs.statSync(path.join(outputPath, 'lang', 'test_en.js'));
        fs.statSync(path.join(outputPath, 'lang', 'test_es.js'));
        // JS
        fs.statSync(path.join(outputPath, 'test.js'));
        fs.statSync(path.join(outputPath, 'test-min.js'));
        fs.statSync(path.join(outputPath, 'test-debug.js'));
        // Skin
        fs.statSync(path.join(outputPath, 'assets', 'skins', 'adamantium', 'test-min.css'));
        fs.statSync(path.join(outputPath, 'assets', 'skins', 'static', 'test-min.css'));
      } catch (e) {
        assert.fail('Some file is missing', '', 'Some file is missing: ' + e.message);
      }
    });

    it('build-rollup', function () {
      var outputPath = path.join(target, 'test'),
        content;
      builder.load({
        gallop: true,
        version: '1.0.0',
        target: target,
        dry: false
      });
      builder.build(source, function(err) {
        assert.isUndefined(err);
      });
      try {
        // Rollup
        fs.statSync(path.join(target, 'test-pkg', 'test-pkg.js'));
        fs.statSync(path.join(target, 'test-pkg', 'test-pkg-debug.js'));
        fs.statSync(path.join(target, 'test-pkg', 'test-pkg-min.js'));
      } catch (e) {
        assert.fail('Some file is missing', '', 'Some file is missing: ' + e.message);
      }
      // Lang
      content = fs.readFileSync(path.join(target, 'test-pkg', 'test-pkg.js'), 'utf8');
      assert.isTrue(content.indexOf('lang/test_en') > 0);
      assert.isTrue(content.indexOf('lang/test_es') > 0);
      assert.isTrue(content.indexOf('lang/test_fr') < 0);
    });

    it('build-error', function () {
      builder.load({
        gallop: true,
        version: '1.0.0',
        target: target,
        dry: false
      });
      builder.build(source, function(err) {
        assert.isUndefined(err);
      });
    });
  });
});
