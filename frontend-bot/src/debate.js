const TURN_MARKER_RE = /\[턴 (\d+)\/(\d+)\]/;
const MENTION_RE = /<@!?(\d+)>/g;

function parseTurn(content) {
  const match = content.match(TURN_MARKER_RE);
  if (!match) return null;
  return { turn: parseInt(match[1], 10), maxTurns: parseInt(match[2], 10) };
}

function formatTurnMarker(turn, maxTurns) {
  return `[턴 ${turn}/${maxTurns}]`;
}

// A human message kicks off a debate when it mentions both bots, and this
// bot is the one mentioned first (so only one of the two bots starts it).
function isDebateKickoff(content, selfId, partnerId) {
  const ids = [...content.matchAll(MENTION_RE)].map((m) => m[1]);
  return ids.includes(selfId) && ids.includes(partnerId) && ids[0] === selfId;
}

module.exports = { parseTurn, formatTurnMarker, isDebateKickoff };
