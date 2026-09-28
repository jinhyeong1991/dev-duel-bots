const test = require('node:test');
const assert = require('node:assert/strict');
const { askGemini, askGeminiImages } = require('../src/geminiClient');

test('returns the response text from the model', async () => {
  const ai = {
    models: {
      generateContent: async ({ model, contents }) => {
        assert.equal(model, 'gemini-2.5-flash');
        assert.equal(contents, '안녕');
        return { text: '안녕하세요!' };
      },
    },
  };

  const result = await askGemini({ ai, model: 'gemini-2.5-flash', prompt: '안녕' });

  assert.equal(result, '안녕하세요!');
});

test('passes systemInstruction through to the model config when provided', async () => {
  const ai = {
    models: {
      generateContent: async ({ config }) => {
        assert.equal(config.systemInstruction, '너는 프론트엔드 개발자야.');
        return { text: 'ok' };
      },
    },
  };

  await askGemini({ ai, model: 'gemini-2.5-flash', prompt: 'hi', systemInstruction: '너는 프론트엔드 개발자야.' });
});

test('omits config when no systemInstruction is provided', async () => {
  const ai = {
    models: {
      generateContent: async ({ config }) => {
        assert.equal(config, undefined);
        return { text: 'ok' };
      },
    },
  };

  await askGemini({ ai, model: 'gemini-2.5-flash', prompt: 'hi' });
});

test('returns an empty string when the response has no text', async () => {
  const ai = { models: { generateContent: async () => ({}) } };

  const result = await askGemini({ ai, model: 'gemini-2.5-flash', prompt: 'hi' });

  assert.equal(result, '');
});

test('propagates an error when the API call fails', async () => {
  const ai = { models: { generateContent: async () => { throw new Error('quota exceeded'); } } };

  await assert.rejects(
    askGemini({ ai, model: 'gemini-2.5-flash', prompt: 'hi' }),
    /quota exceeded/,
  );
});

test('retries on a 503 Service Unavailable error and succeeds once the model recovers', async () => {
  let calls = 0;
  const ai = {
    models: {
      generateContent: async () => {
        calls += 1;
        if (calls < 3) throw new Error('got status: 503 Service Unavailable. {"error":{"status":"UNAVAILABLE"}}');
        return { text: 'recovered' };
      },
    },
  };
  const sleeps = [];

  const result = await askGemini({
    ai,
    model: 'gemini-2.5-flash',
    prompt: 'hi',
    retries: 3,
    sleepFn: async (ms) => { sleeps.push(ms); },
  });

  assert.equal(result, 'recovered');
  assert.equal(calls, 3);
  assert.equal(sleeps.length, 2);
});

test('does not retry a non-503 error', async () => {
  let calls = 0;
  const ai = { models: { generateContent: async () => { calls += 1; throw new Error('quota exceeded'); } } };

  await assert.rejects(
    askGemini({ ai, model: 'gemini-2.5-flash', prompt: 'hi', retries: 3 }),
    /quota exceeded/,
  );
  assert.equal(calls, 1);
});

test('gives up and throws the last 503 error after exhausting retries', async () => {
  let calls = 0;
  const ai = {
    models: {
      generateContent: async () => {
        calls += 1;
        throw new Error('got status: 503 Service Unavailable. {"error":{"status":"UNAVAILABLE"}}');
      },
    },
  };

  await assert.rejects(
    askGemini({ ai, model: 'gemini-2.5-flash', prompt: 'hi', retries: 2, sleepFn: async () => {} }),
    /503/,
  );
  assert.equal(calls, 3);
});

test('askGeminiImages extracts inline image data from the response parts', async () => {
  const pngBytes = Buffer.from('fake-png-bytes').toString('base64');
  const ai = {
    models: {
      generateContent: async ({ model, contents }) => {
        assert.equal(model, 'gemini-2.5-flash-image');
        assert.equal(contents, '빨간 원');
        return {
          candidates: [
            {
              content: {
                parts: [
                  { text: '여기 있어' },
                  { inlineData: { mimeType: 'image/png', data: pngBytes } },
                ],
              },
            },
          ],
        };
      },
    },
  };

  const images = await askGeminiImages({ ai, model: 'gemini-2.5-flash-image', prompt: '빨간 원' });

  assert.equal(images.length, 1);
  assert.equal(images[0].mimeType, 'image/png');
  assert.deepEqual(images[0].data, Buffer.from('fake-png-bytes'));
});

test('askGeminiImages returns an empty array when the response has no image parts', async () => {
  const ai = {
    models: {
      generateContent: async () => ({ candidates: [{ content: { parts: [{ text: '이미지 없음' }] } }] }),
    },
  };

  const images = await askGeminiImages({ ai, model: 'gemini-2.5-flash-image', prompt: 'x' });

  assert.deepEqual(images, []);
});

test('askGeminiImages retries on a 503 error like askGemini', async () => {
  let calls = 0;
  const pngBytes = Buffer.from('ok').toString('base64');
  const ai = {
    models: {
      generateContent: async () => {
        calls += 1;
        if (calls < 2) throw new Error('got status: 503 Service Unavailable. {"error":{"status":"UNAVAILABLE"}}');
        return { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: pngBytes } }] } }] };
      },
    },
  };

  const images = await askGeminiImages({
    ai,
    model: 'gemini-2.5-flash-image',
    prompt: 'x',
    retries: 2,
    sleepFn: async () => {},
  });

  assert.equal(calls, 2);
  assert.equal(images.length, 1);
});
