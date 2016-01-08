var _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    jsonminify = require('jsonminify'),
    findup = require('findup-sync'),
    aliasPath,
    id = 0,
    cache = {};

function next() {
    id++;
    return new Buffer(id + '', 'binary').toString('base64').replace(/=/g, '');
}

function generateArray(keys) {
  var result = [];
  _.forEach(keys, function(key) {
    result.push(alias.get(key));
  });
  return result;
};

var alias = {
  load: function() {
    var base = findup('package.json', {
      cwd: process.cwd(),
      nocase: true
    });

    aliasPath = path.join(path.dirname(base), 'alias.json');

    if (fs.existsSync(aliasPath)) {
      cache = JSON.parse(jsonminify(fs.readFileSync(aliasPath, 'utf8'))  || '{}');
    }

    id = _.keys(cache).length || 0;
  },

  save: function() {
    fs.writeFileSync(aliasPath, JSON.stringify(cache, null, 2));
  },

  get: function(key) {
    return key;
    if (!key) {
      return;
    }

    if (_.isArray(key)) {
      return generateArray(key);
    }

    if (key.indexOf('wf2-') === 0) {
      return key;
    }

    if (cache[key]) {
      return cache[key];
    }

    cache[key] = next();
    return cache[key];
  }
};

module.exports = alias;
