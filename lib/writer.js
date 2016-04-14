'use strict';
var uglify = require('uglify-js'),
    uglifycss = require('uglifycss'),
    mkdirp = require('mkdirp'),
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

/**! Run uglifyjs.
 * @param content {string} The content to compress.
 */
function compress(content) {
  // Uglify and minify the content.
  return uglify.minify(content, uglifyConfig).code;
};

module.exports = {
 /**! Write the necessary files to build a js file.
  * @param content {string} The content for the js file.
  * @param target {string} The output directory.
  * @param regex {string} The regex to be applied to the raw and min version.
  */
 js: function(content, target, regex) {
   mkdirp.sync(path.dirname(target));
   // Write the ```debug``` version.
   fs.writeFileSync(target+ '-debug.js', content, 'utf8');

   // Apply the ```regex``` to remove logging and debug lines.
   if (regex) {
     content = content.replace(new RegExp(regex, 'gm'), '');
   }

   // Write the ```raw``` version.
   fs.writeFileSync(target + '.js', content, 'utf8');
   // Write the ```min``` version.
   fs.writeFileSync(target + '-min.js', compress(content), 'utf8');
 },

 /**! Write the necessary files to build a lang file.
  * @param langs {array} The available languages.
  * @param source {string} The source directory.
  * @param target {string} The output directory.
  * @param name {string} The name of the module.
  * @param data {object} The data for the template.
  */
 lang: function(langs, source, target, name, data) {
   mkdirp.sync(path.dirname(target));
   _.forEach(langs, function(lang) {
     var langPath = path.join(source, name + '_' + lang + '.js'),
       i18n;
     // Read the language file while removing the comments.
     data.body = jsonminify(fs.readFileSync(langPath, 'utf8'));
     data.lang = lang;
     // Write the ```min``` version.
     fs.writeFileSync(target + '_' + lang + '.js', compress(templates.lang(data)), 'utf8');
   });

   // Default value. This should be remove from wria2 and add a default language value.
   var defaultLang = path.join(source, name + '.js');
   if (fs.existsSync(defaultLang)) {
     // Read the default language file while removing the comments.
     data.body = jsonminify(fs.readFileSync(defaultLang, 'utf8'));
     data.lang = '';
     // Write the ```min``` version.
     fs.writeFileSync(target + '.js', compress(templates.lang(data)), 'utf8');
   }
 },

 /**! Write the necessary files to build a css file.
  * @param data {string} The content for the js file.
  * @param target {string} The output directory.
  */
 css: function(data, target) {
   mkdirp.sync(path.dirname(target));
   // Uglify and minify the content.
   var content = uglifycss.processString(data, uglifyCssConfig);
   // Write the ```min``` version.
   fs.writeFileSync(target + '.css', content, 'utf8');
   fs.writeFileSync(target + '-min.css', content, 'utf8');
 }
};
