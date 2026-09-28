const test = require('node:test');
const assert = require('node:assert/strict');
const { parseImageCommand } = require('../src/imageCommand');

test('extracts the prompt after /그림', () => {
  assert.equal(parseImageCommand('/그림 노을 지는 바다'), '노을 지는 바다');
});

test('extracts the prompt after /image', () => {
  assert.equal(parseImageCommand('/image a red circle on white background'), 'a red circle on white background');
});

test('is case-insensitive for /image', () => {
  assert.equal(parseImageCommand('/IMAGE hello'), 'hello');
});

test('returns null when there is no image command prefix', () => {
  assert.equal(parseImageCommand('그냥 질문이야'), null);
});

test('returns null for empty or missing input', () => {
  assert.equal(parseImageCommand(''), null);
  assert.equal(parseImageCommand(undefined), null);
});

test('returns null when the command has no prompt after it', () => {
  assert.equal(parseImageCommand('/그림'), null);
  assert.equal(parseImageCommand('/그림   '), null);
});
