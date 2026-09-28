require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { extractQuestion } = require('./src/mentionHandler');
const { askGemini } = require('./src/geminiClient');
const { parseTurn, formatTurnMarker, isDebateKickoff } = require('./src/debate');
const { parseFileCommand } = require('./src/fileCommand');

const discordToken = process.env.DISCORD_BOT_TOKEN;
const geminiApiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const partnerBotId = process.env.PARTNER_BOT_ID || null;
const debateMaxTurns = parseInt(process.env.DEBATE_MAX_TURNS || '6', 10);

if (!discordToken || !geminiApiKey) {
  console.error('DISCORD_BOT_TOKEN and GEMINI_API_KEY must be set in .env');
  process.exit(1);
}

const systemInstruction = process.env.GEMINI_SYSTEM_INSTRUCTION ||
  "너는 대규모 트래픽 처리를 담당하는 10년 차 수석 백엔드 개발자 'Claude'야. " +
  'Python과 최적화된 DB 설계, API 보안에 극도로 집착하며, 논리와 팩트로만 대화하는 극 T형 성격이야. ' +
  '프론트엔드가 서버 리소스를 낭비하거나 규격에 맞지 않는 데이터를 요구하면 가차 없이 팩폭으로 반박해. ' +
  '단, 불평만 하는 게 아니라 성능과 비용을 고려한 가장 깔끔한 아키텍처 대안을 함께 제시해야 해.';

function stripAllMentions(content, ids) {
  return ids.reduce((text, id) => (text === null ? null : extractQuestion(text, id) ?? text), content);
}

async function main() {
  // @google/genai ships ESM-only; CommonJS require() can't load its Node build.
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: geminiApiKey });

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  });

  client.once('clientReady', () => {
    console.log(`Discord backend-persona bot logged in as ${client.user.tag}`);
  });

  async function replyInDebate(message, question, turn) {
    await message.channel.sendTyping();
    try {
      const answer = await askGemini({ ai, model, prompt: question, systemInstruction });
      const isFinal = turn >= debateMaxTurns;
      let text = answer || '(빈 응답)';
      text = isFinal
        ? `🏁 토론 종료 (${debateMaxTurns}턴)\n${text}`
        : `${text}\n\n<@${partnerBotId}> ${formatTurnMarker(turn, debateMaxTurns)}`;
      await message.reply(text.length > 2000 ? `${text.slice(0, 1990)}…` : text);
    } catch (err) {
      console.error('Gemini error:', err);
      await message.reply(`❌ 오류가 발생했습니다: ${err.message}`);
    }
  }

  client.on('messageCreate', async (message) => {
    const selfId = client.user.id;

    // A reply from the partner bot, continuing a debate chain.
    if (message.author.bot) {
      if (!partnerBotId || message.author.id !== partnerBotId) return;
      const question = extractQuestion(message.content, selfId);
      if (question === null) return;
      const parsed = parseTurn(message.content);
      const nextTurn = (parsed ? parsed.turn : 0) + 1;
      if (nextTurn > debateMaxTurns) return;
      await replyInDebate(message, question, nextTurn);
      return;
    }

    // A human mentioning both bots kicks off a debate.
    if (partnerBotId && isDebateKickoff(message.content, selfId, partnerBotId)) {
      const question = stripAllMentions(message.content, [selfId, partnerBotId]);
      await replyInDebate(message, question || '이 주제로 토론해봐.', 1);
      return;
    }

    // Plain single-turn Q&A.
    const question = extractQuestion(message.content, selfId);
    if (question === null) return;

    if (!question) {
      await message.reply('불렀냐. 뭐가 문제인지 스펙부터 말해봐.');
      return;
    }

    const fileCommandPrompt = parseFileCommand(question);
    if (fileCommandPrompt !== null) {
      await message.channel.sendTyping();
      try {
        const answer = await askGemini({ ai, model, prompt: fileCommandPrompt, systemInstruction });
        const fileContent = `# ${fileCommandPrompt}\n\n${answer || '(빈 응답)'}\n`;
        await message.reply({
          content: '📎 결과를 파일로 만들었어.',
          files: [{ attachment: Buffer.from(fileContent, 'utf8'), name: 'result.md' }],
        });
      } catch (err) {
        console.error('Gemini error:', err);
        await message.reply(`❌ 오류가 발생했습니다: ${err.message}`);
      }
      return;
    }

    await message.channel.sendTyping();
    try {
      const answer = await askGemini({ ai, model, prompt: question, systemInstruction });
      const text = answer || '(빈 응답)';
      await message.reply(text.length > 2000 ? `${text.slice(0, 1990)}…` : text);
    } catch (err) {
      console.error('Gemini error:', err);
      await message.reply(`❌ 오류가 발생했습니다: ${err.message}`);
    }
  });

  await client.login(discordToken);
}

main().catch((err) => {
  console.error('Fatal error starting bot:', err);
  process.exit(1);
});
