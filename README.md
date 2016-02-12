### Unicorn

![travis](https://travis-ci.org/jrubstein/unicorn.svg?branch=master)
[![Dependency Status](https://david-dm.org/jrubstein/unicorn.svg)](https://david-dm.org/jrubstein/unicorn)
[![devDependency Status](https://david-dm.org/jrubstein/unicorn/dev-status.svg)](https://david-dm.org/jrubstein/unicorn#info=devDependencies)

Simple build platform for wria2 and sheath projects.

###### Features:

* Wrap the code with YUI().use(), YUI.add() or nothing depending on the module configuration.
* Rollup creation.
* Linting with JSHint and CSSLint.
* Minification for JS, CSS and i18n files.
* Watch functionality to build on demand.

###### Usage

  unicorn [options]

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
    --watch        Starts the watcher
    -g, --gallop   Starts a full build
    -w, --whisper  Sets logger to error only
    -r, --roar     Adds verbose
    -s, --sprint   Disable jshint and csslint
    --jumpjs       Disable jshint
    --jumpcss      Disable csslint
    -d, --dry      Dry run
    --cwd <path>   Sets the base path for the build

###### Examples

* Build a module

      unicorn

* Build a module skipping linting and setting the logger to error

	  unicorn -s -w

* Building the whole project

	  unicorn -g --cwd <path to the root of the project>

* Run watch command

      unicorn --watch --cwd <path to the root of the project>

###### Development

Contributing to the projects is simple. Follow these steps:

* Clone the repository
* Run ```npm install .``` on the root level.
* Run ```grunt``` on the root level.
* Run ```npm link .``` to get global access to unicorn.

Once the changes are complete, create a pull request.
