#!/usr/bin/env node
const path = require('path')
const base = process.cwd()
const through = require('through2')
const browserify = require('browserify')

const argv = require('yargs')
  .option('no-node-modules', {
    alias: 'n',
    type: 'boolean',
    describe: 'exclude the node_nodules folder'
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

main(argv._[0], argv.neo)

function main (file, neo) {
  let deps = []
  const b = browserify()
  console.warn("PARSING.")
  b.pipeline.get('deps').push(through.obj((row, enc, next) => { delete row.source; deps.push(row); next() }, () => sendToDatabase(deps, neo)))
  b.add(file)
  b.bundle()
}

function flattenDeps (deps) {
  let res = []
  for (const dep of deps) {
    for (const target of Object.keys(dep.deps)) {
      const src = path.relative(base, dep.file)
      const srcbase = path.basename(dep.file)
      const destbase = target
      const dest = path.relative(base, dep.deps[target])
      const param = { src, dest, srcbase, destbase }
      res.push(param)
    }
  }
  return res
}

async function sendToDatabase (deps, neo) {
  const params = flattenDeps(deps)
  await upload(neo, params)
}

async function upload (neo, params) {
  // connect
  const driver = require('neo4j-driver').v1.driver(neo)
  const db = driver.session()

  console.warn("SENDING TO DATABASE.")
  // clear old entries
  // TOO MUCH MEMORY REQUIRED for 'MATCH((:File)-[r]-()) MATCH(f:File) MATCH((:node_module)-[r2]-()) MATCH((n:node_module)) DELETE r,f,r2,n;'
  for (const query of [
    'MATCH((:File)-[r]-()) DELETE r;',
    'MATCH(f:File) DELETE f;',
    'MATCH((:Dep)-[r]-()) DELETE r;',
    'MATCH((n:Dep)) DELETE n',
    'MATCH((:Dependency)-[r]-()) DELETE r;',
    'MATCH((n:Dependency)) DELETE n'
  ]) {
    await db.run(query)
  }

  for (const param of params) {
    if (argv.verbose) {
      console.log(JSON.stringify(param))
    }
    await db.run(`
      MERGE(s:File {fullname:$src})
      MERGE(d:File {fullname:$dest})
      CREATE (s)-[:DEPENDS]->(d)
      SET d.name=$destbase
      SET d:Dependency`
    // SET d:${param.dtype}` // WARNING: Cypher-injection possible ( this is a workaround as a label can not be a parameter)
    , param)
  }
  await db.run("MATCH(s:File) WHERE s.fullname=~ 'node_modules.*' SET s:NodeModule")
  await db.run('MATCH (a) WHERE NOT ()-[:DEPENDS]->(a) set a:Master RETURN a')
  await db.run('MATCH (a) WHERE NOT (a)-[:DEPENDS]->() set a:Destination RETURN a')

  // disconnect
  db.close()
  driver.close()
  console.warn("READY.")
}
