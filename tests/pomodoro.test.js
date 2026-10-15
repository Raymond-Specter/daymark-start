import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDuration, createCountdown, remainingMs, pauseCountdown, resumeCountdown, restoreCountdown } from '../extension/pomodoro-state.js';

test('pomodoro accepts whole minutes and rejects invalid settings', () => {
  assert.equal(parseDuration('25'), 25);
  assert.equal(parseDuration(1), 1); assert.equal(parseDuration(99), 99);
  for (const value of ['', 0, -1, 100, 2.5, 'abc', null, Infinity]) assert.throws(() => parseDuration(value));
});
test('countdown follows the deadline after a delayed or background tick', () => {
  const state = createCountdown(25, 1000);
  assert.equal(remainingMs(state, 1000), 1500000);
  assert.equal(remainingMs(state, -1000), 1500000);
  assert.equal(remainingMs(state, 601000), 900000);
  assert.equal(remainingMs(state, 1501000), 0);
  assert.equal(remainingMs(state, 9000000), 0);
});
test('pause and resume preserve fractional seconds without consuming paused time', () => {
  const paused = pauseCountdown(createCountdown(1, 1000), 12345);
  assert.equal(paused.remaining, 48655);
  assert.equal(remainingMs(paused, 999999), 48655);
  const resumed = resumeCountdown(paused, 1000000);
  assert.equal(remainingMs(resumed, 1001000), 47655);
  assert.equal(resumeCountdown(resumed, 2000000), resumed);
});
test('finished countdown stays at zero when paused or resumed', () => {
  const ended = pauseCountdown(createCountdown(1, 0), 60001);
  assert.equal(remainingMs(ended, 90000), 0);
  assert.equal(remainingMs(resumeCountdown(ended, 90000), 90000), 0);
});
test('restored session keeps its deadline and rejects corrupt state', () => {
  const state = createCountdown(25, 1000);
  assert.deepEqual(restoreCountdown(JSON.parse(JSON.stringify(state))), state);
  assert.equal(remainingMs(restoreCountdown(state), 1001000), 500000);
  for (const value of [null, {}, { ...state, minutes: 100 }, { ...state, remaining: -1 }, { ...state, remaining: Infinity }, { ...state, remaining: 99999999 }, { ...state, deadline: 'bad' }]) assert.equal(restoreCountdown(value), null);
});
