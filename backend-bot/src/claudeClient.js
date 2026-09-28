function isRetryable(err) {
  return err.status === 529 || err.status === 503 || /overloaded|503|UNAVAILABLE/i.test(err.message || '');
}

function extractText(content) {
  return (content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

async function askClaude({
  anthropic,
  model,
  prompt,
  systemInstruction,
  retries = 2,
  retryDelayMs = 1000,
  sleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await anthropic.messages.create({
        model,
        max_tokens: 1024,
        system: systemInstruction,
        messages: [{ role: 'user', content: prompt }],
      });
      return extractText(response.content);
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === retries) throw err;
      await sleepFn(retryDelayMs * 2 ** attempt);
    }
  }
  throw lastError;
}

module.exports = { askClaude };
