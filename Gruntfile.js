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
        tagMessage: 'Version <%= version %>'
      }
    },
    clean: {
       coverage: {
         src: ['./coverage/']
       }
     },
     copy: {
       coverage: {
         src: ['tests/**'],
         dest: './coverage/'
       }
     },
     blanket: {
       coverage: {
         src: ['./lib/'],
         dest: './coverage/lib/'
       }
     },
     mochaTest: {
       test: {
         options: {
           reporter: 'Nyan',
         },
         src: ['./coverage/tests/js/**/*.js']
       },
       coverage: {
         options: {
           reporter: 'html-cov',
           quiet: true,
           captureFile: './coverage/coverage.html'
         },
         src: ['./coverage/tests/js/**/*.js']
       },
       'travis-cov': {
         options: {
           reporter: 'travis-cov'
         },
         src: ['./coverage/tests/js/**/*.js']
       }
     }
  });


  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-blanket');
  grunt.registerTask('default', 'precompile');
  grunt.registerTask('test', ['clean', 'blanket', 'copy', 'mochaTest']);
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
