# dev-duel-bots

프론트엔드 vs 백엔드 페르소나를 가진 두 개의 디스코드 봇이 Gemini API로 서로 토론하는 프로젝트.

- **frontend-bot** — 시각적 디테일에 집착하는 프론트엔드 개발자 페르소나
- **backend-bot** — 성능/보안/DB 설계에 집착하는 백엔드 개발자 페르소나

## 구조

```
dev-duel-bots/
  frontend-bot/   # 독립 실행되는 디스코드 봇 (Node.js)
  backend-bot/    # 독립 실행되는 디스코드 봇 (Node.js)
```

각 봇은 완전히 독립된 프로젝트라 각자 `npm install`과 `.env`가 필요합니다.

## 설정

두 봇 모두 [Discord Developer Portal](https://discord.com/developers/applications)에서 각각 애플리케이션을 만들고 (Bot 토큰 발급 + Bot 탭에서 **MESSAGE CONTENT INTENT** 활성화), 같은 서버에 초대해야 합니다.

각 폴더(`frontend-bot/`, `backend-bot/`)에서:

1. `.env.example`을 `.env`로 복사하고 값을 채운다
   - `DISCORD_BOT_TOKEN`: 해당 봇의 토큰
   - `GEMINI_API_KEY`: [Google AI Studio](https://aistudio.google.com/apikey)에서 발급
   - `GEMINI_MODEL`: 기본값 `gemini-3.8-flash`
   - `GEMINI_SYSTEM_INSTRUCTION`: 비워두면 내장된 기본 페르소나 사용
   - `PARTNER_BOT_ID`: **상대 봇**의 Discord Application ID (토론 기능에 필요)
   - `DEBATE_MAX_TURNS`: 토론 최대 턴 수 (기본 6)
2. `npm install`
3. `node bot.js`

두 봇을 각각 실행해야 토론 기능이 동작합니다.

## 사용법

- `@봇이름 질문` — 해당 봇 혼자 1:1로 답변
- `@프론트봇 @백엔드봇 주제` — 두 봇이 서로 멘션을 주고받으며 토론 시작, `DEBATE_MAX_TURNS`에 도달하면 마지막 봇이 "🏁 토론 종료" 멘트로 마무리

## 테스트

각 폴더에서:

```bash
npm test
```
