Unicorn dev guide
====================

Introduction
---------------------

The purpose of this document is to provide a high level understanding of the design and implementation for Unicorn. The document is intended for developers who want to understand and extend the platform features.

System overview
---------------------

The current build system is [Shifter](http://yui.github.io/shifter/). It have not had any change or improvement in long time. The decision was to create our own build tool.

The scope of the project is to create a new build tool that is backward compatible with Shifter but faster and easier to maintain.

The tool is a [nodejs](https://nodejs.org/en/) module that can be executed through command line or imported by another module.

###### Features:

* Wrap the code with YUI().use(), YUI.add() or nothing depending on the module configuration.
* Rollup creation.
* Linting with JSHint and CSSLint.
* Minification for JS, CSS and i18n files.
* Watch functionality to build on changes.

Usage
---------------------

* Command line

A node module needs to have a bin file to be executed on the terminal. The package.json file has the following attribute:

    "bin": {
      "unicorn": "./bin/unicorn"
    }

This means that when executing ```unicorn``` on the terminal the script ```bin/unicorn``` will be executed.

* Import in another module

Unicorn has a cli for other modules to access all the features provided. Add the following code your JS file:

    ES5
    var unicorn = require('unicorn-tool/lib/cli');

    ES6
    import unicorn from "unicorn-tool/lib/cli";

Under the hood
---------------------

The only entry point is the ```lib/cli.js``` file. The ```compile``` function will receive the options set by the user and start the configuration:

* Search for .shifter.json
* Search for .jshintrc
* Setting logging level.
* Set the output path.
* Enable/disable CSSlint nad/or JSHint.
* Load all the configuration to the builder.
* Start the build
    * Watch
    * Full build
    * Build module

The builder (```lib/builder.js```) is in charge of the build process. Due to a backward compatibility requirement the ```meta-data``` and ```build.json``` is loaded for each module. Once we have all the properties for the modules the actual build can start:

* Remove the output path.
* Find the files to build.
* Pre-execute scripts.
* Wrap the source and write the output.
* Post-execute scripts.
* Copy the assets under the assets/ folder, if any.
* Create the rollups.

The templates are using [DoT](http://olado.github.io/doT/index.html) engine. They are under ```lib/template/``` folder. The templates are pre-compiled to increase the performance. Compiling them is as easy as running ```grunt```. This is going to generate a ```lib/templates.js``` file that is imported to the builder.


###### JS

* Concatenate the JS files mentioned on the ```build.json```.
* Call the template for ```use``` or ```add```.
* Prepend files.
* Append files.
* Replace values specified on the ```.shifter.json``` files as ```replace--XXX```.
* Run JSHint.
* Run js-beautify.
* Create the debug version of the JS module.
* Run the regex to remove logging.
* Create the raw and the minify version of the JS module.
* Create the lang files, if any.
* Create the skin, if any.


###### CSS

* Concatenate the CSS files mentioned on the ```build.json```.
* Replace values specified on the ```.shifter.json``` files as ```replace--XXX```.
* Run CSSLint.
* Run uglify-css.
* Write the raw and minify version.

###### Skin

* Find and read the core css file, if any.
* Append the core css to all the skins and treat it as a css file.

JSHint and CSSLint reporters
---------------------

These two linting modules are being executed outside they reporting cycle. That is why custom reporters are needed. The folder ```lib/reporters``` contains terminal level reporters.

If another type of report is needed a new module can be created taking into consideration the information provided by the third party modules:

* [CSSLint](https://github.com/CSSLint/csslint/wiki/Using-in-a-Node.js-Application)
* [JSHint](http://jshint.com/docs/api/)

Finally change the reporters used by the builder.

APPENDIX A
---------------------

###### Dependencies

* async (^1.5.2)
* chalk (^1.1.1)
* commander (^2.9.0)
* csslint (^0.10.0)
* cssproc (0.0.7)
* findup-sync (^0.3.0)
* glob (^6.0.1)
* grunt (^0.4.5)
* grunt-cli (^0.1.13)
* grunt-release (^0.13.0)
* js-beautify (^1.5.10)
* jshint (^2.9.1)
* jsonminify (^0.2.3)
* load-grunt-tasks (^3.4.0)
* lodash (^4.2.1)
* mkdirp (^0.5.1)
* node-watch (^0.3.5)
* rimraf (^2.5.1)
* sync-exec (^0.6.2)
* time-grunt (^1.3.0)
* uglify-js (^2.6.1)
* uglifycss (0.0.19)
* winston (^2.1.1)

###### Dev Dependencies

* dot (^1.0.3)
