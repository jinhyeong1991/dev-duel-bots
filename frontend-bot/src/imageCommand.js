const IMAGE_COMMAND_RE = /^\/(그림|image)\s+(\S.*)$/is;

function parseImageCommand(question) {
  if (!question) return null;
  const match = question.match(IMAGE_COMMAND_RE);
  if (!match) return null;
  return match[2].trim();
}

module.exports = { parseImageCommand };
