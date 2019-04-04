#!/usr/bin/env node
const dep2neo4j = require('./dep2neo4j')
const argv = require('yargs')
  .option('no-node-modules', {
    alias: 'n',
    type: 'boolean',
    describe: 'exclude node_nodules'
  })
  .option('neo', {
    default: 'bolt://127.0.0.1',
    type: 'string',
    describe: 'url of neo4j server'
  })
  .usage('$0 [OPTIONS] filename')
  .example('$0 app.js"', 'list app.js and all its dependencies')
  .example('$0 app.js -n ', 'list app.js and all dependencies excluding node_modules')
  .demandCommand(1, 1)
  .help()
  .argv

dep2neo4j.genGraph(argv._[0], argv.neo, argv.n)
