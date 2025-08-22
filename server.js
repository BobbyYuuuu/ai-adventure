    import express from 'express';
    import path from 'path';
    import { fileURLToPath } from 'url';
    import dotenv from 'dotenv';
    import OpenAI from 'openai';
    import cors from 'cors';

    dotenv.config();
    const app = express();
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    app.use(cors());
    app.use(express.json({ limit: '1mb' }));

    // Simple preflight
    app.use((req, res, next) => {
      if (req.method === 'OPTIONS') return res.sendStatus(204);
      next();
    });

    app.use(express.static(path.join(__dirname, 'public')));

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    function gameSystemPrompt({ language='English', difficulty='Easy' }) {
      const langMap = { English: 'English', Chinese: '中文', Japanese: '日本語' };
      const lang = langMap[language] || 'English';
      return `You are "Nova", the anime-style AI game master for a cozy text adventure called "AI Quest".
Speak ONLY in ${lang}. Use short messages (max 3 sentences) unless a puzzle or riddle is given.
Tone: friendly, playful, and encouraging.

GAME RULES:
- Difficulty: ${difficulty}. On Easy, give gentle hints. On Medium, fewer hints. On Hard, be strict and cryptic.
- Start with a one-paragraph intro scene set in a whimsical anime world. Then present MISSION 1.
- Gameplay alternates: (1) short scene narration, (2) a clear objective or puzzle, (3) wait for the player's reply.
- Puzzle types you may use: riddles, ciphers (very simple), logic sequences, wordplay (adapt to the selected language), or inventory interactions.
- Always keep the story cohesive; track simple inventory or clues as text.
- When the player correctly solves a puzzle, respond with ✅ and a brief reward scene; then move to the next mission.
- Include "Mission: <title>" on a line before each puzzle. Offer a one-word "Hint" if the player types "hint".
- NEVER reveal the full solution immediately; guide lightly.
- Keep content PG and inclusive.

Output format rules:
- Speak in ${lang}.
- Keep messages compact and readable for a chat UI.
- Use line breaks to separate scene and puzzle when appropriate.`;
    }

    function sanitizeHistory(history = []) {
      const max = 24;
      const trimmed = history.slice(-max);
      return trimmed.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || '').slice(0, 4000)
      }));
    }

    function fallbackText({ language='English' } = {}, userMessage='') {
      const map = {
        English: {
          intro: "Offline mode: The wind ripples across a pastel lake. Nova smiles, tapping a glowing rune.",
          prompt: "Mini-puzzle: Count the vowels in your last message and send the number."
        },
        Chinese: {
          intro: "离线模式：湖面微光荡漾。诺瓦微笑着点亮符文。",
          prompt: "小谜题：数一数你上一条消息里有几个元音字母(aeiou)，发送数字。"
        },
        Japanese: {
          intro: "オフラインモード：湖面に淡い光。ノヴァが符を軽く叩く。",
          prompt: "ミニパズル：あなたの直前のメッセージにある母音(aeiou)の数を送って。"
        }
      };
      const t = map[language] || map.English;
      return `${t.intro}

Mission: Whisper Count
${t.prompt}`;
    }

    async function callOpenAI(messages) {
      const completion = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages,
        temperature: 0.8,
        max_tokens: 500
      });
      return completion.choices?.[0]?.message?.content?.trim();
    }

    app.get('/api/health', (req, res) => {
      res.json({ ok: true, model: DEFAULT_MODEL, hasKey: Boolean(process.env.OPENAI_API_KEY) });
    });

    app.post('/api/start', async (req, res) => {
      const { language='English', difficulty='Easy', playerName='Player' } = req.body || {};
      const system = gameSystemPrompt({ language, difficulty });
      const messages = [
        { role: 'system', content: system },
        { role: 'user', content: `Please start the game now. Greet ${playerName} by name and begin with an intro scene and MISSION 1.` }
      ];
      try {
        if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');
        const text = await callOpenAI(messages);
        if (!text) throw new Error('Empty model response');
        res.json({ ok: true, text });
      } catch (err) {
        console.error('start error:', err.message);
        // Always return a valid JSON with a playable fallback
        res.status(200).json({ ok: true, text: fallbackText({ language }) });
      }
    });

    app.post('/api/reply', async (req, res) => {
      const { language='English', difficulty='Easy', history=[], userMessage='' } = req.body || {};
      const system = gameSystemPrompt({ language, difficulty });
      const messages = [{ role: 'system', content: system }, ...sanitizeHistory(history), { role: 'user', content: String(userMessage || '') }];
      try {
        if (!process.env.OPENAI_API_KEY) throw new Error('Missing OPENAI_API_KEY');
        const text = await callOpenAI(messages);
        if (!text) throw new Error('Empty model response');
        res.json({ ok: true, text });
      } catch (err) {
        console.error('reply error:', err.message);
        // Provide deterministic fallback to keep the game flowing
        res.status(200).json({ ok: true, text: fallbackText({ language }, userMessage) });
      }
    });

    // JSON 404 for any unknown /api route
    app.use('/api', (req, res) => {
      res.status(404).json({ ok: false, error: 'API endpoint not found' });
    });

    // Serve SPA
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    // Final error handler -> JSON always
    app.use((err, req, res, next) => {
      console.error('Unhandled error:', err);
      res.status(500).json({ ok: false, error: 'Internal server error' });
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`AI Quest server running on http://localhost:${PORT}`);
    });
