import { buildReducer } from '../src/index.js'
import { expect } from 'chai'
import { describe, it } from 'mocha'
import { createStore } from 'redux'

describe('buildReducer', function () {
  it('runs readme example', function () {
    function maxCount (state = 0, action) {
      return action.type === 'CHANGE_MAX_COUNT' ? action.payload : state
    }

    function counter (state = 0, action, peers) {
      return Math.min(
        peers.maxCount,
        action.type === 'INCREMENT' ? state + action.payload : state
      )
    }

    const rootReducer = buildReducer({ maxCount, counter })
    const store = createStore(rootReducer)

    store.dispatch({ type: 'CHANGE_MAX_COUNT', payload: 20 })
    expect(store.getState().maxCount).to.equal(20)

    store.dispatch({ type: 'INCREMENT', payload: 10 })
    expect(store.getState().counter).to.equal(10)

    // Changing the maximum should also change the count:
    store.dispatch({ type: 'CHANGE_MAX_COUNT', payload: 5 })
    expect(store.getState().maxCount).to.equal(5)
    expect(store.getState().counter).to.equal(5)

    // We cannot increment past the max:
    store.dispatch({ type: 'INCREMENT', payload: 10 })
    expect(store.getState().counter).to.equal(5)
  })

  it('updates the `unchanged` property', function () {
    const log = []
    function logger (state = 0, action, peers) {
      log.push(peers.unchanged)
      return state
    }

    function dirtier (state = 0, action) {
      return action.type === 'DIRTY' ? state + 1 : state
    }

    const rootReducer = buildReducer({ logger, dirtier })
    const store = createStore(rootReducer)
    store.dispatch({ type: 'IRRELEVANT' })
    store.dispatch({ type: 'DIRTY' })
    store.dispatch({ type: 'IRRELEVANT' })
    expect(log).to.deep.equal([false, true, false, true])
  })

  it('throws on undefined state', function () {
    function tester (state) {
      return state
    }

    const rootReducer = buildReducer({ tester })
    expect(() => createStore(rootReducer)).to.throw(
      TypeError,
      "Reducer 'tester' returned undefined"
    )
  })

  it('throws on circular references', function () {
    function a (state, action, peers) {
      return peers.b
    }

    function b (state, action, peers) {
      return peers.a
    }

    const rootReducer = buildReducer({ a, b })
    expect(() => createStore(rootReducer)).to.throw(
      ReferenceError,
      /depends on its own result/
    )
  })

  it('copies parent props', function () {
    const log = []
    function logger (state = 0, action, peers) {
      log.push(`${peers.unchanged} ${peers.settings}`)
      return state
    }

    function settings (state = 0, action) {
      return action.type === 'DIRTY' ? state + 1 : state
    }

    const rootReducer = buildReducer({
      app: buildReducer({ logger }, ({ settings }) => ({ settings })),
      settings
    })
    const store = createStore(rootReducer)
    store.dispatch({ type: 'IRRELEVANT' })
    store.dispatch({ type: 'DIRTY' })
    store.dispatch({ type: 'IRRELEVANT' })
    expect(log).to.deep.equal(['false 0', 'true 0', 'false 1', 'true 1'])
  })
})
