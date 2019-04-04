const path = require('path')
const base = process.cwd()
const through = require('through2')
const browserify = require('browserify')

module.exports = { genGraph }
function genGraph (file, neo, nonode) {
  return new Promise(function (resolve, reject) {
    let deps = []
    const b = browserify()
    b.pipeline.get('deps').push(through.obj((row, enc, next) => { delete row.source; deps.push(row); next() }, () => resolve(sendToDatabase(deps, neo, nonode))))
    b.add(file)
    b.bundle()
  })
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

async function sendToDatabase (deps, neo, nonode) {
  const params = flattenDeps(deps).filter(p => !nonode || !p.src.includes('node'))
  await upload(neo, params)
}

async function upload (neo, params) {
  // connect
  const driver = require('neo4j-driver').v1.driver(neo)
  const db = driver.session()

  // delete all File nodes
  for (const query of [
    'MATCH(f:File) DETACH DELETE f;'
  ]) {
    await db.run(query)
  }

  for (const param of params) {
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
  await db.close()
  await driver.close()
}
