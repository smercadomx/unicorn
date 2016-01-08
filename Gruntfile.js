var path = require('path'),
  dot = require('dot'),
  _ = require('lodash'),
  EOL = require('os').EOL,
  uglify = require('uglify-js');

module.exports = function(grunt) {
  // Show elapsed time at the end
  require('time-grunt')(grunt);
  // Load all grunt tasks
  require('load-grunt-tasks')(grunt);
  grunt.initConfig({
    release: {
      options: {
        npm: false,
        npmtag: false,
        tagMessage: 'Version <%= version %>'
      }
    }
  });


  grunt.registerTask('default', 'precompile');
  grunt.registerTask('precompile', 'Pre-compile templates', function() {
    var output = '',
        dots = dot.process({
          path: path.join('lib', 'templates'),
          templateSettings: {
            strip: false
          }
        });

    _.forEach(dots, function(value, key) {
      output += 'exports.' + key + '=' + value + ';' + EOL;
    });

    grunt.file.write(path.join('lib', 'templates.js'), output);
  });
};
