const test = require('node:test');
const assert = require('node:assert/strict');
const { extractCodeBlocks, extensionForLang, buildExportFiles } = require('../src/codeExtractor');

test('extracts a single fenced code block with its language', () => {
  const text = '설명\n```html\n<div>hi</div>\n```\n끝';
  assert.deepEqual(extractCodeBlocks(text), [{ lang: 'html', code: '<div>hi</div>' }]);
});

test('extracts multiple fenced code blocks in order', () => {
  const text = '```html\n<div></div>\n```\n그리고\n```css\nbody { color: red; }\n```';
  assert.deepEqual(extractCodeBlocks(text), [
    { lang: 'html', code: '<div></div>' },
    { lang: 'css', code: 'body { color: red; }' },
  ]);
});

test('returns an empty array when there are no code blocks', () => {
  assert.deepEqual(extractCodeBlocks('그냥 설명 텍스트야.'), []);
});

test('treats a fence with no language tag as lang null', () => {
  const text = '```\nplain text block\n```';
  assert.deepEqual(extractCodeBlocks(text), [{ lang: null, code: 'plain text block' }]);
});

test('extensionForLang maps common languages to file extensions', () => {
  assert.equal(extensionForLang('html'), 'html');
  assert.equal(extensionForLang('css'), 'css');
  assert.equal(extensionForLang('javascript'), 'js');
  assert.equal(extensionForLang('js'), 'js');
  assert.equal(extensionForLang('json'), 'json');
  assert.equal(extensionForLang('python'), 'py');
});

test('extensionForLang falls back to txt for unknown or missing language', () => {
  assert.equal(extensionForLang('brainfuck'), 'txt');
  assert.equal(extensionForLang(null), 'txt');
});

test('buildExportFiles wraps plain prose as a single markdown file when there are no code blocks', () => {
  assert.deepEqual(buildExportFiles('그냥 설명이야'), [{ name: 'result.md', content: '그냥 설명이야' }]);
});

test('buildExportFiles names a single code block result.<ext>', () => {
  const answer = '설명\n```html\n<div>hi</div>\n```';
  assert.deepEqual(buildExportFiles(answer), [{ name: 'result.html', content: '<div>hi</div>' }]);
});

test('buildExportFiles numbers multiple code blocks in order', () => {
  const answer = '```html\n<div></div>\n```\n```css\nbody{}\n```';
  assert.deepEqual(buildExportFiles(answer), [
    { name: 'result-1.html', content: '<div></div>' },
    { name: 'result-2.css', content: 'body{}' },
  ]);
});
