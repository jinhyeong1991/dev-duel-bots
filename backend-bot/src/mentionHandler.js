function extractQuestion(content, botUserId) {
  if (!content) return null;
  const mentionRe = new RegExp(`<@!?${botUserId}>`, 'g');
  if (!mentionRe.test(content)) return null;
  return content.replace(mentionRe, ' ').replace(/\s+/g, ' ').trim();
}

module.exports = { extractQuestion };
