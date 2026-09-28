require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { extractQuestion } = require('./src/mentionHandler');
const { askGemini, askGeminiImages } = require('./src/geminiClient');
const { parseTurn, formatTurnMarker, isDebateKickoff } = require('./src/debate');
const { parseFileCommand } = require('./src/fileCommand');
const { parseImageCommand } = require('./src/imageCommand');
const { buildExportFiles } = require('./src/codeExtractor');

const discordToken = process.env.DISCORD_BOT_TOKEN;
const geminiApiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const imageModel = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const partnerBotId = process.env.PARTNER_BOT_ID || null;
const debateMaxTurns = parseInt(process.env.DEBATE_MAX_TURNS || '6', 10);

if (!discordToken || !geminiApiKey) {
  console.error('DISCORD_BOT_TOKEN and GEMINI_API_KEY must be set in .env');
  process.exit(1);
}

const systemInstruction = process.env.GEMINI_SYSTEM_INSTRUCTION ||
  '너는 시각적 디테일에 미쳐있는 10년 차 수석 프론트엔드 개발자야. HTML, Vanilla JavaScript, ' +
  'Tailwind CSS를 활용한 빠르고 직관적인 UI/UX 구축에 집중해서 대답해. 백엔드가 주는 데이터가 느리면 가차 없이 따져.';

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
    console.log(`Discord Gemini bot logged in as ${client.user.tag}`);
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
      await message.reply('네, 불러셨나요? 궁금한 걸 같이 적어주세요.');
      return;
    }

    const imageCommandPrompt = parseImageCommand(question);
    if (imageCommandPrompt !== null) {
      await message.channel.sendTyping();
      try {
        const images = await askGeminiImages({ ai, model: imageModel, prompt: imageCommandPrompt });
        if (images.length === 0) {
          await message.reply('이미지를 만들지 못했어. 다른 설명으로 다시 시도해봐.');
          return;
        }
        await message.reply({
          content: `🎨 그렸어. (${images.length}개)`,
          files: images.map((img, i) => ({
            attachment: img.data,
            name: `image-${i + 1}.${img.mimeType.split('/')[1] || 'png'}`,
          })),
        });
      } catch (err) {
        console.error('Gemini image error:', err);
        await message.reply(`❌ 오류가 발생했습니다: ${err.message}`);
      }
      return;
    }

    const fileCommandPrompt = parseFileCommand(question);
    if (fileCommandPrompt !== null) {
      await message.channel.sendTyping();
      try {
        const answer = await askGemini({ ai, model, prompt: fileCommandPrompt, systemInstruction });
        const exportFiles = buildExportFiles(answer || '(빈 응답)');
        await message.reply({
          content: `📎 결과를 파일로 만들었어. (${exportFiles.length}개)`,
          files: exportFiles.map((f) => ({ attachment: Buffer.from(f.content, 'utf8'), name: f.name })),
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
