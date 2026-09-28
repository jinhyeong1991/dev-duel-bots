const FILE_COMMAND_RE = /^\/(파일|export)\s+(\S.*)$/is;

function parseFileCommand(question) {
  if (!question) return null;
  const match = question.match(FILE_COMMAND_RE);
  if (!match) return null;
  return match[2].trim();
}

module.exports = { parseFileCommand };
