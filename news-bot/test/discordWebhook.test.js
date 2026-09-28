const test = require('node:test');
const assert = require('node:assert/strict');
const { formatNewsMessage, postToDiscord } = require('../src/discordWebhook');

const SAMPLE_ARTICLES = [
  { title: '첫 번째 기사', url: 'https://n.news.naver.com/article/1' },
  { title: '두 번째 기사', url: 'https://n.news.naver.com/article/2' },
];

test('formatNewsMessage numbers each article as a markdown link', () => {
  const message = formatNewsMessage(SAMPLE_ARTICLES);
  assert.match(message, /1\. \[첫 번째 기사\]\(https:\/\/n\.news\.naver\.com\/article\/1\)/);
  assert.match(message, /2\. \[두 번째 기사\]\(https:\/\/n\.news\.naver\.com\/article\/2\)/);
});

test('formatNewsMessage includes a header', () => {
  const message = formatNewsMessage(SAMPLE_ARTICLES);
  assert.match(message, /오늘의 네이버 주요 뉴스/);
});

test('formatNewsMessage reports when there are no articles', () => {
  const message = formatNewsMessage([]);
  assert.match(message, /가져오지 못했/);
});

test('postToDiscord POSTs the formatted content to the webhook url', async () => {
  const calls = [];
  const fetchFn = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 204 };
  };

  await postToDiscord({
    webhookUrl: 'https://discord.com/api/webhooks/123/abc',
    articles: SAMPLE_ARTICLES,
    fetchFn,
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://discord.com/api/webhooks/123/abc');
  assert.equal(calls[0].options.method, 'POST');
  const body = JSON.parse(calls[0].options.body);
  assert.match(body.content, /첫 번째 기사/);
});

test('postToDiscord throws when the webhook responds with an error status', async () => {
  const fetchFn = async () => ({ ok: false, status: 404, text: async () => 'Unknown Webhook' });

  await assert.rejects(
    postToDiscord({ webhookUrl: 'https://discord.com/api/webhooks/bad', articles: SAMPLE_ARTICLES, fetchFn }),
    /404/,
  );
});
