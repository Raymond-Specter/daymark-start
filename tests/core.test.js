import test from 'node:test';
import assert from 'node:assert/strict';
import { clockParts, selectFocus, searchTarget, webUrl, daymarkOrigin } from '../extension/core.js';

const now = new Date('2026-10-13T02:30:00Z');
const task = (title, properties = {}) => ({ title, date: '2026-10-13', status: 'pending', priority: 2, ...properties });

test('uses DayMark timezone across a date boundary', () => {
  assert.equal(clockParts(new Date('2026-10-12T17:00:00Z')).date, '2026-10-13');
  assert.equal(selectFocus([task('today')], now, 'America/Los_Angeles').task, null);
});
test('current task takes precedence over a higher priority future task', () => {
  const result = selectFocus([task('later', { start_time: '11:00', priority: 1 }), task('now', { start_time: '10:00', end_time: '11:00' })], now);
  assert.equal(result.task.title, 'now'); assert.equal(result.next.title, 'later'); assert.equal(result.label, '现在');
});
test('end boundary is exclusive; next task starts at the boundary', () => {
  const result = selectFocus([task('ended', { start_time: '10:00', end_time: '10:30' }), task('starting', { start_time: '10:30', end_time: '11:00' })], now);
  assert.equal(result.task.title, 'starting');
});
test('skips completed, cancelled, blocked and other-day tasks', () => {
  const result = selectFocus([task('done', { status: 'completed' }), task('cancelled', { status: 'cancelled' }), task('blocked', { blocked: true }), task('tomorrow', { date: '2026-10-14' })], now);
  assert.equal(result.task, null);
});
test('upcoming tasks follow scheduled time; untimed tasks follow priority', () => {
  assert.equal(selectFocus([task('no time', { priority: 1 }), task('first', { start_time: '11:00' }), task('second', { start_time: '12:00', priority: 1 })], now).task.title, 'first');
  assert.equal(selectFocus([task('low', { priority: 3 }), task('high', { priority: 1 })], now).task.title, 'high');
});
test('infer a task interval from its estimated duration', () => {
  assert.equal(selectFocus([task('current', { start_time: '10:00', estimated_duration: 60 })], now).label, '现在');
  assert.equal(selectFocus([task('past', { start_time: '10:00', estimated_duration: 15 })], now).label, '待处理');
});
test('search safely encodes queries and recognizes web addresses', () => {
  assert.equal(searchTarget('   ', 'bing'), null);
  assert.equal(searchTarget('github.com', 'bing'), 'https://github.com/');
  assert.equal(searchTarget('localhost:3000', 'bing'), 'http://localhost:3000/');
  assert.equal(searchTarget('a&b 中文', 'google'), 'https://www.google.com/search?q=a%26b%20%E4%B8%AD%E6%96%87');
  assert.ok(searchTarget('javascript:alert(1)', 'bing').startsWith('https://www.bing.com/search?q='));
});
test('rejects unsafe shortcut and remote DayMark addresses', () => {
  assert.throws(() => webUrl('javascript:alert(1)'));
  assert.throws(() => webUrl('https://user:password@example.com'));
  assert.throws(() => daymarkOrigin('http://remote.example.com'));
  assert.throws(() => daymarkOrigin('https://plan.example.com/api'));
  assert.equal(daymarkOrigin('http://127.0.0.1:3000/'), 'http://127.0.0.1:3000');
});
