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
    app.use(express.static(path.join(__dirname, 'public')));

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    function gameSystemPrompt({ language='English', difficulty='Easy' }) {
      const langMap = {
        English: 'English',
        Chinese: '中文',
        Japanese: '日本語'
      };
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
      // Keep the last 12 turns max (system + 24 messages roughly)
      const max = 24;
      const trimmed = history.slice(-max);
      return trimmed.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || '').slice(0, 4000)
      }));
    }

    app.post('/api/start', async (req, res) => {
      try {
        const { language='English', difficulty='Easy', playerName='Player' } = req.body || {};
        const system = gameSystemPrompt({ language, difficulty });
        const messages = [
          { role: 'system', content: system },
          { role: 'user', content: `Please start the game now. Greet ${playerName} by name and begin with an intro scene and MISSION 1.` }
        ];

        const completion = await openai.chat.completions.create({
          model: DEFAULT_MODEL,
          messages,
          temperature: 0.8,
          max_tokens: 500
        });

        const text = completion.choices?.[0]?.message?.content?.trim() || 'Sorry, I could not start the game.';
        res.json({ ok: true, text });
      } catch (err) {
        console.error(err);
        res.status(500).json({ ok: false, error: err?.message || 'Server error' });
      }
    });

    app.post('/api/reply', async (req, res) => {
      try {
        const { language='English', difficulty='Easy', history=[], userMessage='' } = req.body || {};
        const system = gameSystemPrompt({ language, difficulty });
        const messages = [{ role: 'system', content: system }, ...sanitizeHistory(history), { role: 'user', content: String(userMessage || '') }];

        const completion = await openai.chat.completions.create({
          model: DEFAULT_MODEL,
          messages,
          temperature: 0.8,
          max_tokens: 500
        });

        const text = completion.choices?.[0]?.message?.content?.trim() || '...';
        res.json({ ok: true, text });
      } catch (err) {
        console.error(err);
        const status = err?.status || 500;
        let msg = err?.message || 'Server error';
        if (status == 401) msg = 'Invalid or missing OpenAI API key.';
        if (status == 429) msg = 'Rate limit reached; try again in a moment.';
        res.status(status).json({ ok: false, error: msg });
      }
    });

    // Serve the app
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`AI Quest server running on http://localhost:${PORT}`);
    });
