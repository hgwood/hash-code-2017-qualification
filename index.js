'use strict'

const _ = require('lodash')
const glob = require('glob')
const read = require('./read')
const write = require('./write')
const solve = require('./solve3')

const files = _(process.argv)
  .slice(2)
  .flatMap(filename => glob.sync(filename))
  .value()

if (_.isEmpty(files)) console.warn('No input files given.')

_.each(files, function (file) {
  const problem = read(file)
  const solution = solve(problem)
  write(`${file}.out.txt`, solution)
})
