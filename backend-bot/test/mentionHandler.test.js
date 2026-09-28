const test = require('node:test');
const assert = require('node:assert/strict');
const { extractQuestion } = require('../src/mentionHandler');

const BOT_ID = '1554151989254819901';

test('extracts the text after a plain mention', () => {
  assert.equal(extractQuestion(`<@${BOT_ID}> 안녕`, BOT_ID), '안녕');
});

test('extracts the text after a nickname-style mention (<@!id>)', () => {
  assert.equal(extractQuestion(`<@!${BOT_ID}> 이 API 설계 어때?`, BOT_ID), '이 API 설계 어때?');
});

test('strips a mention that appears in the middle of the message', () => {
  assert.equal(extractQuestion(`얘들아 <@${BOT_ID}> 이거 봐봐`, BOT_ID), '얘들아 이거 봐봐');
});

test('returns an empty string when the bot is mentioned with no other text', () => {
  assert.equal(extractQuestion(`<@${BOT_ID}>`, BOT_ID), '');
});

test('returns null when the message does not mention the bot at all', () => {
  assert.equal(extractQuestion('그냥 아무 말', BOT_ID), null);
});

test('returns null when the message mentions a different user', () => {
  assert.equal(extractQuestion('<@999999999999999999> 안녕', BOT_ID), null);
});

test('returns null for empty or missing content', () => {
  assert.equal(extractQuestion('', BOT_ID), null);
  assert.equal(extractQuestion(undefined, BOT_ID), null);
});
