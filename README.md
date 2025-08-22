# AI Quest · Anime Chat Adventure

A tiny full-stack game where an anime-style AI Game Master guides you through a short, puzzle-rich story.
- Multilingual: English / Chinese / Japanese
- Difficulty: Easy / Medium / Hard
- Chat UI with missions and hints
- Uses OpenAI Chat Completions API

## 1) Run locally (VS Code)

**Requirements**
- Node.js 18+
- An OpenAI API key

**Steps**
```bash
git clone <your-fork-url>
cd ai-quest
cp .env.example .env
# edit .env and paste your OPENAI_API_KEY
npm install
npm start
```
Open http://localhost:3000

## 2) Project structure
```text
ai-quest/
  public/
    index.html
    styles.css
    app.js
    assets/ (placeholder anime-style images)
  server.js
  package.json
  .env.example
  .gitignore
  README.md
```

## 3) Deploy on Render.com

1. Push this folder to a **new GitHub repo**.
2. In Render, click **New → Web Service**, connect your repo.
3. **Environment**: Node
4. **Build Command**: `npm install`
5. **Start Command**: `node server.js`
6. Add **Environment Variable** `OPENAI_API_KEY` with your key (and optional `OPENAI_MODEL`).
7. Deploy. The site will serve the static frontend and the API from the same service.

See Render docs for Express apps for more details.
- OpenAI API (Chat): https://platform.openai.com/docs/api-reference/chat
- Render Express Deploy: https://render.com/docs/deploy-node-express-app

## 4) Change models & costs
In `.env`, set `OPENAI_MODEL`. Examples: `gpt-5`, `gpt-4o`, `gpt-4o-mini`.
Check your account/model availability and rate limits.

## 5) Replace the art
Drop your own images into `public/assets` and update paths in `index.html` / CSS if needed.
