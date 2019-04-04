/* eslint-env jasmine */
const dep2neo4j = require('../src/dep2neo4j')
const n4j = require('neo4j-driver')
describe('Multiple spies, when created manually', function () {
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

  it('creates spies for each requested function', async function () {
    await dep2neo4j.genGraph('test/start.js', 'bolt://127.0.0.1', false)
    expect(sessionSpyObject.run).toHaveBeenCalled()
    expect(sessionSpyObject.run).not.toHaveBeenCalledTimes(8)
    expect(sessionSpyObject.close).toHaveBeenCalledTimes(1)
    expect(driverSpyObject.close).toHaveBeenCalledTimes(1)
  })

  it('creates spies for each requested function', async function () {
    await dep2neo4j.genGraph('test/start.js', 'bolt://127.0.0.1', true)
    expect(sessionSpyObject.run).toHaveBeenCalledTimes(8)
    expect(sessionSpyObject.close).toHaveBeenCalledTimes(1)
    expect(driverSpyObject.close).toHaveBeenCalledTimes(1)
  })
})
