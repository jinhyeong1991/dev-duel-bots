function formatNewsMessage(articles) {
  if (articles.length === 0) {
    return '📰 오늘의 네이버 주요 뉴스를 가져오지 못했습니다.';
  }
  const lines = articles.map((a, i) => `${i + 1}. [${a.title}](${a.url})`);
  return ['📰 오늘의 네이버 주요 뉴스', '', ...lines].join('\n');
}

async function postToDiscord({ webhookUrl, articles, fetchFn = fetch }) {
  const content = formatNewsMessage(articles);
  const response = await fetchFn(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!response.ok) {
    const body = response.text ? await response.text() : '';
    throw new Error(`Discord webhook request failed: ${response.status} ${body}`);
  }
}

module.exports = { formatNewsMessage, postToDiscord };
