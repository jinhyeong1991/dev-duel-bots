const test = require('node:test');
const assert = require('node:assert/strict');
const { askClaude } = require('../src/claudeClient');

test('returns the concatenated text from the response content blocks', async () => {
  const anthropic = {
    messages: {
      create: async ({ model, system, messages }) => {
        assert.equal(model, 'claude-sonnet-5');
        assert.equal(system, '너는 백엔드 개발자야.');
        assert.deepEqual(messages, [{ role: 'user', content: '안녕' }]);
        return { content: [{ type: 'text', text: '안녕하세요.' }] };
      },
    },
  };

  const result = await askClaude({
    anthropic,
    model: 'claude-sonnet-5',
    prompt: '안녕',
    systemInstruction: '너는 백엔드 개발자야.',
  });

  assert.equal(result, '안녕하세요.');
});

test('joins multiple text blocks', async () => {
  const anthropic = {
    messages: {
      create: async () => ({
        content: [{ type: 'text', text: 'Part A. ' }, { type: 'text', text: 'Part B.' }],
      }),
    },
  };

  const result = await askClaude({ anthropic, model: 'claude-sonnet-5', prompt: 'hi' });

  assert.equal(result, 'Part A. Part B.');
});

test('returns an empty string when there are no text blocks', async () => {
  const anthropic = { messages: { create: async () => ({ content: [] }) } };

  const result = await askClaude({ anthropic, model: 'claude-sonnet-5', prompt: 'hi' });

  assert.equal(result, '');
});

test('propagates a non-retryable error', async () => {
  const anthropic = { messages: { create: async () => { throw new Error('invalid api key'); } } };

  await assert.rejects(
    askClaude({ anthropic, model: 'claude-sonnet-5', prompt: 'hi' }),
    /invalid api key/,
  );
});

test('retries on an overloaded (529) error and succeeds once the model recovers', async () => {
  let calls = 0;
  const anthropic = {
    messages: {
      create: async () => {
        calls += 1;
        if (calls < 3) {
          const err = new Error('Overloaded');
          err.status = 529;
          throw err;
        }
        return { content: [{ type: 'text', text: 'recovered' }] };
      },
    },
  };
  const sleeps = [];

  const result = await askClaude({
    anthropic,
    model: 'claude-sonnet-5',
    prompt: 'hi',
    retries: 3,
    sleepFn: async (ms) => { sleeps.push(ms); },
  });

  assert.equal(result, 'recovered');
  assert.equal(calls, 3);
  assert.equal(sleeps.length, 2);
});

test('gives up and throws the last error after exhausting retries', async () => {
  let calls = 0;
  const anthropic = {
    messages: {
      create: async () => {
        calls += 1;
        const err = new Error('Overloaded');
        err.status = 529;
        throw err;
      },
    },
  };

  await assert.rejects(
    askClaude({ anthropic, model: 'claude-sonnet-5', prompt: 'hi', retries: 2, sleepFn: async () => {} }),
    /Overloaded/,
  );
  assert.equal(calls, 3);
});
