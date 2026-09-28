const test = require('node:test');
const assert = require('node:assert/strict');
const { parseTopNews } = require('../src/naverNews');

function fixtureHtml(items) {
  const anchors = items
    .map(([title, url]) => `<a href="${url}" class="list_title" data-something="x">${title}</a>`)
    .join('\n');
  return `<html><body><div class="rankingnews_box">${anchors}</div></body></html>`;
}

test('parses titles and urls from list_title anchors, in document order', () => {
  const html = fixtureHtml([
    ['첫 번째 기사', 'https://n.news.naver.com/article/1'],
    ['두 번째 기사', 'https://n.news.naver.com/article/2'],
  ]);

  assert.deepEqual(parseTopNews(html, 10), [
    { title: '첫 번째 기사', url: 'https://n.news.naver.com/article/1' },
    { title: '두 번째 기사', url: 'https://n.news.naver.com/article/2' },
  ]);
});

test('limits the result to the requested count', () => {
  const html = fixtureHtml([
    ['A', 'https://n.news.naver.com/article/1'],
    ['B', 'https://n.news.naver.com/article/2'],
    ['C', 'https://n.news.naver.com/article/3'],
  ]);

  assert.deepEqual(parseTopNews(html, 2), [
    { title: 'A', url: 'https://n.news.naver.com/article/1' },
    { title: 'B', url: 'https://n.news.naver.com/article/2' },
  ]);
});

test('trims whitespace around titles', () => {
  const html = fixtureHtml([['  공백 있는 제목  ', 'https://n.news.naver.com/article/1']]);

  assert.equal(parseTopNews(html, 10)[0].title, '공백 있는 제목');
});

test('returns an empty array when there are no list_title anchors', () => {
  assert.deepEqual(parseTopNews('<html><body>없음</body></html>', 10), []);
});
