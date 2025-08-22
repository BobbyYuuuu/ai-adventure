const chatEl = document.getElementById('chat');
const msgEl = document.getElementById('msg');
const sendBtn = document.getElementById('sendBtn');
const hintBtn = document.getElementById('hintBtn');
const startBtn = document.getElementById('startBtn');
const langEl = document.getElementById('lang');
const diffEl = document.getElementById('difficulty');
const nameEl = document.getElementById('playerName');

let history = []; // {role:'user'|'assistant', content:string}
const avatars = {
  assistant: '/assets/hero.png',
  user: '/assets/ally.png'
};

function addMessage(role, content) {
  const wrap = document.createElement('div');
  wrap.className = 'msg ' + (role === 'user' ? 'you' : 'ai');
  wrap.innerHTML = `
    <img class="avatar" src="${role==='user' ? avatars.user : avatars.assistant}" alt="${role}" />
    <div class="bubble"></div>
  `;
  const bubble = wrap.querySelector('.bubble');
  bubble.textContent = content;
  chatEl.appendChild(wrap);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function state() {
  return {
    language: langEl.value,
    difficulty: diffEl.value,
    playerName: nameEl.value || 'Player'
  };
}

async function startGame() {
  history = [];
  chatEl.innerHTML = '';
  addMessage('assistant', '⏳ Starting your adventure...');
  try {
    const resp = await fetch('/api/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state())
    });
    const data = await resp.json();
    chatEl.lastChild.remove(); // remove loading
    if (data.ok) {
      addMessage('assistant', data.text);
      history.push({ role: 'assistant', content: data.text });
    } else {
      addMessage('assistant', '⚠️ ' + (data.error || 'Failed to start.'));
    }
  } catch (e) {
    chatEl.lastChild.remove();
    addMessage('assistant', '⚠️ Network error: ' + e.message);
  }
}

async function sendMessage(text) {
  if (!text) return;
  addMessage('user', text);
  history.push({ role: 'user', content: text });

  try {
    const resp = await fetch('/api/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...state(), history, userMessage: text })
    });
    const data = await resp.json();
    if (data.ok) {
      addMessage('assistant', data.text);
      history.push({ role: 'assistant', content: data.text });
    } else {
      addMessage('assistant', '⚠️ ' + (data.error || 'Failed to reply.'));
    }
  } catch (e) {
    addMessage('assistant', '⚠️ Network error: ' + e.message);
  }
}

startBtn.addEventListener('click', startGame);
sendBtn.addEventListener('click', () => {
  const t = msgEl.value.trim();
  msgEl.value = '';
  sendMessage(t);
});
msgEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const t = msgEl.value.trim();
    msgEl.value = '';
    sendMessage(t);
  }
});
hintBtn.addEventListener('click', () => sendMessage('hint'));
