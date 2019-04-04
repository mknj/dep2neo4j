/* eslint-env jasmine */
const dep2neo4j = require('../src/dep2neo4j')
const n4j = require('neo4j-driver')
describe('dep2neo4j', function () {
  let oldDriverFun
  let driverSpyObject
  let sessionSpyObject

  afterEach(function () {
    n4j.v1.driver = oldDriverFun
  })

  beforeEach(function () {
    oldDriverFun = n4j.v1.driver // we can't use spies directly as ...driver() returns an object with functions
    n4j.v1.driver = function () {
      driverSpyObject = {
        session: function () {
          sessionSpyObject = jasmine.createSpyObj('session', ['run', 'close'])
          return sessionSpyObject
        },
        close: jasmine.createSpy('close')
      }
      return driverSpyObject
    }
  })

  it('creates full dependency graph', async function () {
    await dep2neo4j.genGraph('test/start.js', 'FAKE', false)
    expect(sessionSpyObject.run).toHaveBeenCalled()
    expect(sessionSpyObject.run).not.toHaveBeenCalledTimes(8)
    expect(sessionSpyObject.close).toHaveBeenCalledTimes(1)
    expect(driverSpyObject.close).toHaveBeenCalledTimes(1)
  })

  it('creates "local" dependency graph', async function () {
    await dep2neo4j.genGraph('test/start.js', 'FAKE', true)
    expect(sessionSpyObject.run).toHaveBeenCalledTimes(8)
    expect(sessionSpyObject.close).toHaveBeenCalledTimes(1)
    expect(driverSpyObject.close).toHaveBeenCalledTimes(1)
  })
})
