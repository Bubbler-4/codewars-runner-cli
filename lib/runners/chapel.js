"use strict";

const fs = require('fs-extra');
const path = require('path');
const exec = require('child_process').exec;

const temp = require('temp');

const shovel = require('../shovel');

module.exports.run = function run(opts, cb) {
  temp.track();
  const dir = temp.mkdirSync('chpl');
  shovel.start(opts, cb, {
    solutionOnly: function(runCode, fail) {
      const executable = path.join(dir, 'solution');
      const solutionFile = path.join(dir, 'solution.chpl');
      fs.outputFileSync(solutionFile, (opts.setup ? opts.setup + '\n' : '') + opts.solution);

      exec(['chpl', solutionFile, '-o', executable].join(' '), function(error, stdout, stderr) {
        if (error) return fail(error, stdout, stderr);
        opts.publish('stdout', stdout);
        runCode({name: executable, args: []});
      });
    },

    testIntegration: function(runCode, fail) {
      const executable = path.join(dir, 'solution');
      const solutionFile = path.join(dir, 'solution.chpl');
      fs.outputFileSync(solutionFile, [
        fs.readFileSync('/runner/frameworks/chapel/cw-2.chpl'),
        (opts.setup ? opts.setup + '\n' : '') + opts.solution,
        opts.fixture,
      ].join('\n'));

      exec(['chpl', solutionFile, '-o', executable].join(' '), function(error, stdout, stderr) {
        if (error) return fail(error, stdout, stderr);
        opts.publish('stdout', stdout);
        runCode({name: executable, args: []});
      });
    },

    sanitizeStdErr: function(error) {
      error = error || '';
      return error
        .replace(/\/tmp.*(solution\.chpl|solution)[:0-9]*/g, '')
        .replace(/Error: Command failed:/g, '')
        .replace(/error: uncaught error/g, '')
        .replace('\n', '')
        .replace('  ', ' ');
    }
  });
};
