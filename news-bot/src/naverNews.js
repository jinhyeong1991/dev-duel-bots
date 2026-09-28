const cheerio = require('cheerio');
const iconv = require('iconv-lite');

const RANKING_URL = 'https://news.naver.com/main/ranking/popularDay.naver';

function parseTopNews(html, count) {
  const $ = cheerio.load(html);
  const articles = [];
  $('.list_title').each((_, el) => {
    const $el = $(el);
    articles.push({ title: $el.text().trim(), url: $el.attr('href') });
  });
  return articles.slice(0, count);
}

async function fetchTopNews(count = 10) {
  const res = await fetch(RANKING_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) {
    throw new Error(`Naver ranking page request failed: ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const html = iconv.decode(buf, 'euc-kr');
  return parseTopNews(html, count);
}

module.exports = { parseTopNews, fetchTopNews };
