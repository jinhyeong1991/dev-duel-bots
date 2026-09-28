# news-bot

네이버 뉴스 랭킹(많이 본 뉴스) TOP N을 매일 정해진 시간에 디스코드에 자동으로 올리는 스크립트. GitHub Actions로 실행되기 때문에 PC가 꺼져 있어도 동작합니다.

## 설정

1. 디스코드에서 뉴스를 받을 채널 → **채널 설정 → 연동 → 웹후크 → 새 웹후크 생성** → URL 복사
2. GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `DISCORD_WEBHOOK_URL`
   - Value: 복사한 웹후크 URL
3. `.github/workflows/daily-news.yml`이 매일 08:00 KST(23:00 UTC)에 자동 실행됩니다.

수동으로 바로 테스트하고 싶으면 GitHub 저장소의 **Actions 탭 → Daily Naver News to Discord → Run workflow**로 즉시 실행할 수 있습니다.

## 로컬 실행

```bash
npm install
DISCORD_WEBHOOK_URL=... node index.js
```

## 테스트

```bash
npm test
```
