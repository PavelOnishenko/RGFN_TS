import test from 'node:test';
import assert from 'node:assert/strict';

import StateMachine from '../../dist/utils/StateMachine.js';

test('StateMachine transitions call exit and enter callbacks', () => {
  const log = [];
  const sm = new StateMachine('idle');

  sm.addState('idle', { exit: data => log.push(['idle-exit', data]) });
  sm.addState('battle', { enter: data => log.push(['battle-enter', data]) });

  const result = sm.transition('battle', { from: 'test' });

  assert.equal(result, true);
  assert.equal(sm.getCurrentState(), 'battle');
  assert.deepEqual(log, [
    ['idle-exit', { from: 'test' }],
    ['battle-enter', { from: 'test' }],
  ]);
});

test('StateMachine does not transition to unknown or same state', () => {
  const sm = new StateMachine();
  sm.addState('one');

  assert.equal(sm.transition('missing'), false);
  assert.equal(sm.transition('one'), true);
  assert.equal(sm.transition('one'), false);
});

test('StateMachine update calls update callback only for current state', () => {
  let calls = 0;
  const sm = new StateMachine();

  sm.addState('run', { update: (dt, data) => {
    calls += 1;
    assert.equal(dt, 16);
    assert.deepEqual(data, { payload: true });
  } });

  sm.update(16, { payload: true });
  assert.equal(calls, 0);

  sm.transition('run');
  sm.update(16, { payload: true });
  assert.equal(calls, 1);
  assert.equal(sm.isInState('run'), true);
});
