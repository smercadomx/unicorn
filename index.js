var cli = require('./lib/cli'),
    path = require('path'),
    program = require('commander'),
    fs = require('fs'),
    _ = require('lodash'),
    packageJSON = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'))),
    options;

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
  .option('--jumpjs, --no-lint', 'Disable jshint')
  .option('--jumpcss, --no-csslint', 'Disable csslint')
  .option('-d, --dry', 'Dry run')
  //! .option('-a, --aka', 'Replaces the modules for a short alias to reduce the length of the combo calls')
  .option('--cwd <path>', 'Sets the base path for the build', checkCWD)
  .option('-u, --unique', 'Builds the rollup at the end')
  .parse(process.argv);

cli.compile({
  watch: program.watch,
  gallop: program.gallop,
  whisper: program.whisper,
  roar: program.roar,
  sprint: program.sprint,
  jumpjs: program.jumpjs || !program.lint,
  jumpcss: program.jumpcss || !program.csslint,
  cwd: program.cwd,
  dry: program.dry,
  unique: program.unique
});
