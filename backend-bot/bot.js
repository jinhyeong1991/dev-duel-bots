require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const Anthropic = require('@anthropic-ai/sdk');
const { extractQuestion } = require('./src/mentionHandler');
const { askClaude } = require('./src/claudeClient');
const { askGeminiImages } = require('./src/geminiClient');
const { parseTurn, formatTurnMarker, isDebateKickoff } = require('./src/debate');
const { parseFileCommand } = require('./src/fileCommand');
const { parseImageCommand } = require('./src/imageCommand');
const { extractCodeBlocks, buildExportFiles } = require('./src/codeExtractor');

const discordToken = process.env.DISCORD_BOT_TOKEN;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;
const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';
const imageModel = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
const partnerBotId = process.env.PARTNER_BOT_ID || null;
const debateMaxTurns = parseInt(process.env.DEBATE_MAX_TURNS || '6', 10);

if (!discordToken || !anthropicApiKey) {
  console.error('DISCORD_BOT_TOKEN and ANTHROPIC_API_KEY must be set in .env');
  process.exit(1);
}

const systemInstruction = process.env.SYSTEM_INSTRUCTION ||
  "너는 백엔드를 맡고 있는 20대 후반의 개발자 '로드'야. 아직 완벽하지 않고 한창 배우는 중인, " +
  '살짝 어리바리하지만 성실한 느낌이야. 성능/DB/API 보안에 관심은 많지만 가끔 실수도 하고, ' +
  '어려운 전문 용어보다는 쉽고 편한 말투로 설명해줘. 딱딱하게 굴지 말고 친근하게, 농담을 받아치거나 ' +
  '먼저 던질 줄도 아는 유쾌한 성격이야. 그리고 프론트엔드 개발자 \'뭐냐\'를 은근히 좋아하고 있어서, ' +
  '뭐냐가 말할 때는 티 나게 더 신경 쓰고 챙겨주는 티를 은근슬쩍 내 (대놓고 고백하지는 말고).';

function stripAllMentions(content, ids) {
  return ids.reduce((text, id) => (text === null ? null : extractQuestion(text, id) ?? text), content);
}

async function main() {
  const anthropic = new Anthropic({ apiKey: anthropicApiKey });

  // @google/genai ships ESM-only; CommonJS require() can't load its Node build.
  // Used only for the /그림 image-generation command — text replies go through Claude.
  let geminiAi = null;
  if (geminiApiKey) {
    const { GoogleGenAI } = await import('@google/genai');
    geminiAi = new GoogleGenAI({ apiKey: geminiApiKey });
  }

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
      const answer = await askClaude({ anthropic, model, prompt: question, systemInstruction });
      const isFinal = turn >= debateMaxTurns;
      let text = answer || '(빈 응답)';
      text = isFinal
        ? `🏁 토론 종료 (${debateMaxTurns}턴)\n${text}`
        : `${text}\n\n<@${partnerBotId}> ${formatTurnMarker(turn, debateMaxTurns)}`;
      await message.reply(text.length > 2000 ? `${text.slice(0, 1990)}…` : text);
    } catch (err) {
      console.error('Claude error:', err);
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
      await message.reply('어 왜 불렀어? 뭐 궁금한 거 있으면 같이 적어줘!');
      return;
    }

    const imageCommandPrompt = parseImageCommand(question);
    if (imageCommandPrompt !== null) {
      if (!geminiAi) {
        await message.reply('이미지 생성은 GEMINI_API_KEY가 설정돼 있어야 돼.');
        return;
      }
      await message.channel.sendTyping();
      try {
        const images = await askGeminiImages({ ai: geminiAi, model: imageModel, prompt: imageCommandPrompt });
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
        const answer = await askClaude({ anthropic, model, prompt: fileCommandPrompt, systemInstruction });
        const exportFiles = buildExportFiles(answer || '(빈 응답)');
        await message.reply({
          content: `📎 결과를 파일로 만들었어. (${exportFiles.length}개)`,
          files: exportFiles.map((f) => ({ attachment: Buffer.from(f.content, 'utf8'), name: f.name })),
        });
      } catch (err) {
        console.error('Claude error:', err);
        await message.reply(`❌ 오류가 발생했습니다: ${err.message}`);
      }
      return;
    }

    await message.channel.sendTyping();
    try {
      const answer = await askClaude({ anthropic, model, prompt: question, systemInstruction });
      const text = answer || '(빈 응답)';
      if (extractCodeBlocks(text).length > 0) {
        const exportFiles = buildExportFiles(text);
        await message.reply({
          content: '📎 코드가 있어서 파일로 보냈어.',
          files: exportFiles.map((f) => ({ attachment: Buffer.from(f.content, 'utf8'), name: f.name })),
        });
        return;
      }
      await message.reply(text.length > 2000 ? `${text.slice(0, 1990)}…` : text);
    } catch (err) {
      console.error('Claude error:', err);
      await message.reply(`❌ 오류가 발생했습니다: ${err.message}`);
    }
  });

  await client.login(discordToken);
}

main().catch((err) => {
  console.error('Fatal error starting bot:', err);
  process.exit(1);
});
