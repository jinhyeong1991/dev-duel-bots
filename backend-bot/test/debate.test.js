const test = require('node:test');
const assert = require('node:assert/strict');
const { parseTurn, formatTurnMarker, isDebateKickoff } = require('../src/debate');

test('parseTurn reads a valid turn marker', () => {
  assert.deepEqual(parseTurn('안녕 [턴 3/6]'), { turn: 3, maxTurns: 6 });
});

test('parseTurn returns null when there is no marker', () => {
  assert.equal(parseTurn('그냥 텍스트'), null);
});

test('formatTurnMarker builds the marker string', () => {
  assert.equal(formatTurnMarker(3, 6), '[턴 3/6]');
});

test('isDebateKickoff is true when a human mentions both bots and self is mentioned first', () => {
  assert.equal(
    isDebateKickoff('<@111> <@222> 토론해봐', '111', '222'),
    true,
  );
});

test('isDebateKickoff is false when self is mentioned second', () => {
  assert.equal(
    isDebateKickoff('<@222> <@111> 토론해봐', '111', '222'),
    false,
  );
});

test('isDebateKickoff is false when only self is mentioned', () => {
  assert.equal(isDebateKickoff('<@111> 안녕', '111', '222'), false);
});

test('isDebateKickoff is false when neither bot is mentioned', () => {
  assert.equal(isDebateKickoff('그냥 텍스트', '111', '222'), false);
});
