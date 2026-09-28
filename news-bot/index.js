const { fetchTopNews } = require('./src/naverNews');
const { postToDiscord } = require('./src/discordWebhook');

const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
const count = parseInt(process.env.NEWS_COUNT || '10', 10);

if (!webhookUrl) {
  console.error('DISCORD_WEBHOOK_URL must be set');
  process.exit(1);
}

async function main() {
  const articles = await fetchTopNews(count);
  await postToDiscord({ webhookUrl, articles });
  console.log(`Posted ${articles.length} articles to Discord.`);
}

main().catch((err) => {
  console.error('Failed to post daily news:', err);
  process.exit(1);
});
