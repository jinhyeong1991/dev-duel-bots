function isRetryable(err) {
  return /503|UNAVAILABLE/i.test(err.message || '');
}

async function askGemini({
  ai,
  model,
  prompt,
  systemInstruction,
  retries = 2,
  retryDelayMs = 1000,
  sleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const config = systemInstruction ? { systemInstruction } : undefined;
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt, config });
      return response.text || '';
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === retries) throw err;
      await sleepFn(retryDelayMs * 2 ** attempt);
    }
  }
  throw lastError;
}

module.exports = { askGemini };
