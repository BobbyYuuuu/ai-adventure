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

async function safeFetchJSON(url, init) {
  try {
    const resp = await fetch(url, init);
    const ct = resp.headers.get('content-type') || '';
    let data;
    if (ct.includes('application/json')) {
      data = await resp.json();
    } else {
      const text = await resp.text();
      data = { ok: false, error: text || `HTTP ${resp.status}` };
    }
    if (!resp.ok && data.ok !== true) {
      data.ok = false;
      data.error = data.error || `HTTP ${resp.status}`;
    }
    return data;
  } catch (e) {
    return { ok: false, error: e.message || 'Network error' };
  }
}

async function startGame() {
  history = [];
  chatEl.innerHTML = '';
  addMessage('assistant', '⏳ Starting your adventure...');
  const data = await safeFetchJSON('/api/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state())
  });
  chatEl.lastChild && chatEl.lastChild.remove(); // remove loading
  if (data && data.text) {
    addMessage('assistant', data.text);
    history.push({ role: 'assistant', content: data.text });
  } else {
    addMessage('assistant', `⚠️ ${data?.error || 'Something went wrong. Starting offline mode.'}`);
  }
}

async function sendMessage(text) {
  if (!text) return;
  addMessage('user', text);
  history.push({ role: 'user', content: text });

  const data = await safeFetchJSON('/api/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...state(), history, userMessage: text })
  });

  if (data && data.text) {
    addMessage('assistant', data.text);
    history.push({ role: 'assistant', content: data.text });
  } else {
    addMessage('assistant', `⚠️ ${data?.error || 'No response received. Using offline puzzle.'}`);
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
