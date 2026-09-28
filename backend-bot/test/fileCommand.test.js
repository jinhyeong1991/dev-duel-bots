const test = require('node:test');
const assert = require('node:assert/strict');
const { parseFileCommand } = require('../src/fileCommand');

test('extracts the prompt after /파일', () => {
  assert.equal(parseFileCommand('/파일 이 사이트 구조 분석해줘'), '이 사이트 구조 분석해줘');
});

test('extracts the prompt after /export', () => {
  assert.equal(parseFileCommand('/export analyze this site'), 'analyze this site');
});

test('is case-insensitive for /export', () => {
  assert.equal(parseFileCommand('/EXPORT hello'), 'hello');
});

test('returns null when there is no file command prefix', () => {
  assert.equal(parseFileCommand('그냥 질문이야'), null);
});

test('returns null for empty or missing input', () => {
  assert.equal(parseFileCommand(''), null);
  assert.equal(parseFileCommand(undefined), null);
});

test('returns null when the command has no prompt after it', () => {
  assert.equal(parseFileCommand('/파일'), null);
  assert.equal(parseFileCommand('/파일   '), null);
});
