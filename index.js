var cli = require('./lib/cli'),
    path = require('path'),
    program = require('commander'),
    fs = require('fs'),
    packageJSON = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json')));

function checkCWD(cwd) {
  if (cwd && path.isAbsolute(cwd)) {
    return cwd;
  } else if (cwd) {
    return path.join(process.cwd(), cwd);
  }
  return process.cwd();
}

program.version(packageJSON.version)
  .usage('[options]')
  .option('--watch', 'Starts the watcher')
  .option('-g, --gallop', 'Starts a full build')
  .option('-w, --whisper', 'Sets logger to error only')
  .option('-r, --roar', 'Adds verbose')
  .option('-s, --sprint', 'Disable jshint and csslint')
  .option('--jumpjs', 'Disable jshint')
  .option('--jumpcss', 'Disable csslint')
  // .option('-a, --aka', 'Replaces the modules for a short alias to reduce the length of the combo calls')
  .option('--cwd <path>', 'Sets the base path for the build', checkCWD)
  .parse(process.argv);

cli.compile(program);
