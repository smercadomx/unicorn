'use strict';

var uglify = require('uglify-js'),
    uglifycss = require('uglifycss'),
    mkdirp = require('mkdirp'),
    jsBeautify = require('js-beautify').js_beautify,
    _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    jsonminify = require('jsonminify'),
    templates = require('./templates.js'),
    uglifyConfig =  {
      fromString: true,
    	compress: {
    		sequences: true,
    		dead_code: true,
    		conditionals: true,
    		booleans: true,
    		unused: true,
    		if_return: true,
    		join_vars: true,
        drop_console: true,
        drop_debugger: true
    	}
    },
    uglifyCssConfig = {
      uglyComments: true,
      cuteComments: false,
      expandVars: false
    };

function compress(content) {
  return uglify.minify(content, uglifyConfig).code;
};

module.exports = {
 js: function(data, target, regex) {
   var content = jsBeautify(data);
   mkdirp.sync(path.dirname(target));
   fs.writeFileSync(target+ '-debug.js', content, 'utf8');

   if (regex) {
     content = content.replace(regex, '');
   }

   fs.writeFileSync(target + '.js', content, 'utf8');
   fs.writeFileSync(target + '-min.js', compress(content), 'utf8');
 },

 lang: function(langs, source, target, name, data) {
   _.forEach(langs, function(lang) {
     var langPath = path.join(source, name + '_' + lang + '.js'),
       i18n;
     data.body = jsonminify(fs.readFileSync(langPath, 'utf8'));
     data.lang = lang;
     mkdirp.sync(path.dirname(target));
     fs.writeFileSync(target + '_' + lang + '.js', compress(templates.lang(data)), 'utf8');
   });

   // Default value. This should be remove from wria2 and add a default language value.
   var defaultLang = path.join(source, name + '.js');
   if (fs.existsSync(defaultLang)) {
     data.body = jsonminify(fs.readFileSync(defaultLang, 'utf8'));
     data.lang = '';
     fs.writeFileSync(target + '.js', compress(templates.lang(data)), 'utf8');
   }
 },

 css: function(data, target) {
   mkdirp.sync(path.dirname(target));
   var content = uglifycss.processString(data, uglifyCssConfig);
   fs.writeFileSync(target + '.css', content, 'utf8');
   fs.writeFileSync(target + '-min.css', content, 'utf8');
 }
};
