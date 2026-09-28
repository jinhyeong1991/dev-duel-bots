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

async function askGeminiImages({
  ai,
  model,
  prompt,
  retries = 2,
  retryDelayMs = 1000,
  sleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await ai.models.generateContent({ model, contents: prompt });
      const parts = response.candidates?.[0]?.content?.parts || [];
      return parts
        .filter((part) => part.inlineData && part.inlineData.data)
        .map((part) => ({
          mimeType: part.inlineData.mimeType || 'image/png',
          data: Buffer.from(part.inlineData.data, 'base64'),
        }));
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === retries) throw err;
      await sleepFn(retryDelayMs * 2 ** attempt);
    }
  }
  throw lastError;
}

module.exports = { askGemini, askGeminiImages };
