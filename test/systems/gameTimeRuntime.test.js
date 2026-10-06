import test from 'node:test';
import assert from 'node:assert/strict';

import GameTimeRuntime from '../../dist/systems/time/GameTimeRuntime.js';

test('GameTimeRuntime creates deterministic calendar for identical generation seed', () => {
  const first = new GameTimeRuntime(null, 123456789);
  const second = new GameTimeRuntime(null, 123456789);

  assert.deepEqual(first.getState(), second.getState());
  assert.equal(first.getHudClockText(), second.getHudClockText());
  assert.equal(first.getHudDateText(), second.getHudDateText());
});

test('GameTimeRuntime usually differs for different generation seeds', () => {
  const first = new GameTimeRuntime(null, 111);
  const second = new GameTimeRuntime(null, 222);

  assert.notDeepEqual(first.getState(), second.getState());
});

test('GameTimeRuntime first month name is seed-dependent and not hardcoded', () => {
  const first = new GameTimeRuntime(null, 111).getState();
  const second = new GameTimeRuntime(null, 222).getState();
  const firstMonthA = first.months[0]?.name;
  const firstMonthB = second.months[0]?.name;

  assert.equal(typeof firstMonthA, 'string');
  assert.equal(typeof firstMonthB, 'string');
  assert.notEqual(firstMonthA, firstMonthB);
});

test('GameTimeRuntime exposes full generated calendar snapshot with current month marker data', () => {
  const runtime = new GameTimeRuntime(null, 424242);
  const snapshot = runtime.getCalendarSnapshot();

  assert.equal(typeof snapshot.startYear, 'number');
  assert.equal(typeof snapshot.currentYear, 'number');
  assert.equal(typeof snapshot.currentMonthName, 'string');
  assert.ok(snapshot.months.length >= 1);
  assert.ok(snapshot.currentMonthIndex >= 0);
  assert.ok(snapshot.currentMonthIndex < snapshot.months.length);
  assert.ok(snapshot.currentDay >= 1);
  assert.ok(snapshot.daysPerYear >= snapshot.months.length);
});

test('GameTimeRuntime keeps month and day counts within the 1..30 calendar range', () => {
  for (let seed = 1; seed <= 500; seed += 1) {
    const snapshot = new GameTimeRuntime(null, seed).getCalendarSnapshot();
    assert.ok(snapshot.months.length >= 1 && snapshot.months.length <= 30);
    for (const month of snapshot.months) {
      assert.ok(month.days >= 1 && month.days <= 30);
    }
  }
});

test('GameTimeRuntime still produces uniform, slightly-varied, and random month-length worlds', () => {
  const seenStyles = new Set();
  for (let seed = 1; seed <= 400; seed += 1) {
    const monthDays = new GameTimeRuntime(null, seed).getCalendarSnapshot().months.map((month) => month.days);
    const uniqueDays = new Set(monthDays);
    const minDays = Math.min(...monthDays);
    const maxDays = Math.max(...monthDays);
    if (uniqueDays.size === 1) {
      seenStyles.add('uniform');
    } else if (maxDays - minDays <= 4) {
      seenStyles.add('slightly-varied');
    } else {
      seenStyles.add('random');
    }
    if (seenStyles.size === 3) {
      break;
    }
  }

  assert.deepEqual(new Set(['uniform', 'slightly-varied', 'random']), seenStyles);
});
