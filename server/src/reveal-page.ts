type MediaItem = { id: string; kind: string; uri: string; name: string };

export const revealStyles = `
  :root {
    --ink: #17163f;
    --pink: #f21c92;
    --coral: #ff735e;
    --paper: #fff9fc;
    --soft: #ffd0e7;
  }
  * { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; }
  body {
    margin: 0;
    min-height: 100vh;
    display: grid;
    place-items: center;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #fff;
    background: linear-gradient(145deg, #24164a 0%, #7526d9 48%, #f21c92 100%);
    background-attachment: fixed;
  }
  .shell {
    width: min(560px, 100%);
    padding: 28px 22px 48px;
    text-align: center;
  }
  .brand {
    font-weight: 800;
    font-size: 1.05rem;
    letter-spacing: 0.02em;
    margin-bottom: 28px;
  }
  .brand span:first-child { color: #e8d9ff; }
  .brand span:last-child { color: #ffadd8; }
  .gift {
    font-size: 4.5rem;
    line-height: 1;
    filter: drop-shadow(0 12px 24px rgba(0,0,0,.25));
    animation: float 3s ease-in-out infinite;
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  .eyebrow {
    display: inline-block;
    margin-top: 22px;
    letter-spacing: 0.16em;
    font-weight: 800;
    font-size: 0.75rem;
    color: var(--soft);
  }
  h1 {
    font-size: clamp(2rem, 7vw, 3.4rem);
    line-height: 1.15;
    margin: 14px 0 0;
    font-weight: 900;
  }
  .for {
    color: #f5d6ea;
    margin: 14px 0 0;
    font-size: 1.05rem;
  }
  .message {
    margin: 28px auto 0;
    max-width: 36ch;
    font-size: 1.15rem;
    line-height: 1.7;
    color: #fff;
  }
  .media {
    margin: 24px 0 0;
    display: grid;
    gap: 14px;
  }
  .media img, .media video, .media audio {
    width: 100%;
    max-height: 360px;
    border-radius: 20px;
    background: rgba(0,0,0,.25);
    object-fit: cover;
  }
  .media video, .media audio { object-fit: contain; background: #1a0f33; }
  .media-note {
    margin-top: 12px;
    font-size: 0.9rem;
    color: #ffd0e7;
  }
  .card {
    margin-top: 28px;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.22);
    backdrop-filter: blur(10px);
    border-radius: 24px;
    padding: 22px;
  }
  input, textarea, button {
    width: 100%;
    padding: 16px 18px;
    border-radius: 16px;
    border: 0;
    font-size: 1rem;
    margin-top: 12px;
    font-family: inherit;
  }
  input, textarea { background: #fff; color: var(--ink); }
  textarea { min-height: 120px; resize: vertical; }
  .wishes { margin-top: 28px; text-align: left; }
  .wishes h2 { font-size: 1.1rem; margin: 0 0 12px; text-align: center; }
  .wish {
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.22);
    border-radius: 18px;
    padding: 14px 16px;
    margin-top: 10px;
  }
  .wish strong { display: block; color: #ffd0e7; margin-bottom: 4px; }
  button {
    background: linear-gradient(90deg, var(--coral), var(--pink), #9e22e4);
    color: #fff;
    font-weight: 800;
    cursor: pointer;
  }
  button:active { transform: scale(0.98); }
  .error { color: #ffd0e7; min-height: 1.2em; margin: 8px 0 0; }
  .muted { color: #f5d6ea; line-height: 1.55; }
  .reactions {
    display: flex;
    justify-content: center;
    gap: 14px;
    margin-top: 18px;
    flex-wrap: wrap;
  }
  .reaction {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.28);
    background: rgba(255,255,255,0.12);
    font-size: 1.4rem;
    cursor: pointer;
    display: grid;
    place-items: center;
  }
  .footer {
    margin-top: 36px;
    font-size: 0.8rem;
    color: rgba(255,255,255,0.65);
  }
`;

const csp =
  "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data: https: http:; media-src 'self' https: http:; connect-src 'self'; base-uri 'self'; form-action 'self'";

function isPlayableUri(uri: string) {
  return /^https?:\/\//i.test(uri);
}

export function renderMediaHtml(media: MediaItem[] = []) {
  if (!media.length) return '';
  const playable = media.filter(item => isPlayableUri(item.uri));
  if (!playable.length) {
    return `<p class="media-note">${media.length} photo/video attached on the creator’s device, but not uploaded to the cloud yet — recreate the surprise after updating the app to see media here.</p>`;
  }
  const items = playable
    .map(item => {
      const src = escape(item.uri);
      if (item.kind === 'video') {
        return `<video controls playsinline preload="metadata" src="${src}"></video>`;
      }
      if (item.kind === 'audio' || item.kind === 'music') {
        return `<audio controls src="${src}"></audio>`;
      }
      return `<img src="${src}" alt="${escape(item.name || 'Surprise photo')}" />`;
    })
    .join('');
  return `<div class="media">${items}</div>`;
}

export type WishItem = { authorName: string; message: string };

export function renderWishesHtml(wishes: WishItem[] = []) {
  if (!wishes.length) return '';
  const items = wishes
    .map(
      wish =>
        `<div class="wish"><strong>${escape(wish.authorName)}</strong>${escape(wish.message).replace(/\n/g, '<br>')}</div>`,
    )
    .join('');
  return `<div class="wishes"><h2>Messages from your people (${wishes.length})</h2>${items}</div>`;
}

export function htmlPage(title: string, body: string, script = '', extraHead = '') {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="theme-color" content="#7526d9" />
  <title>${title}</title>
  ${extraHead}
  <style>${revealStyles}</style>
</head>
<body>
  <div class="shell">
    <div class="brand"><span>Wish</span><span>Drop</span></div>
    ${body}
    <p class="footer">Made with WishDrop · lives only for a little while</p>
  </div>
  ${script ? `<script>${script}</script>` : ''}
</body>
</html>`;
}

export function unavailablePage() {
  return htmlPage(
    'Unavailable · WishDrop',
    `<div class="gift">⏳</div>
     <span class="eyebrow">WISHDROP</span>
     <h1>This surprise isn’t available</h1>
     <p class="muted">It may not be open yet, or its reveal window has ended.</p>`,
  );
}

export function openRevealPage(surprise: {
  title: string;
  occasion: string;
  recipientName: string;
  message: string;
  allowWishes?: boolean;
  media?: MediaItem[];
  wishes?: WishItem[];
}) {
  const wishes =
    surprise.allowWishes !== false
      ? `<div class="card">
         <p class="muted" style="margin:0">Send some love</p>
         <div class="reactions" id="reactions">
           <button type="button" class="reaction" data-emoji="❤️">❤️</button>
           <button type="button" class="reaction" data-emoji="🥹">🥹</button>
           <button type="button" class="reaction" data-emoji="✨">✨</button>
           <button type="button" class="reaction" data-emoji="🎉">🎉</button>
         </div>
         <p class="error" id="react-status" aria-live="polite"></p>
       </div>`
      : '';

  return {
    csp,
    html: htmlPage(
      `${escape(surprise.title)} · WishDrop`,
      `<div class="gift">🎁</div>
       <span class="eyebrow">${escape(surprise.occasion).toUpperCase()}</span>
       <h1>${escape(surprise.title)}</h1>
       <p class="for">Made especially for ${escape(surprise.recipientName)}</p>
       ${renderMediaHtml(surprise.media ?? [])}
       <p class="message">${escape(surprise.message).replace(/\n/g, '<br>')}</p>
       ${renderWishesHtml(surprise.wishes ?? [])}
       ${wishes}`,
      surprise.allowWishes !== false
        ? `document.getElementById('reactions')?.addEventListener('click',async e=>{
            const btn=e.target.closest('[data-emoji]');
            if(!btn) return;
            const status=document.getElementById('react-status');
            status.textContent='';
            const token=location.pathname.split('/').pop();
            const res=await fetch('/v1/public/surprises/'+token+'/reactions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({emoji:btn.dataset.emoji})});
            status.textContent=res.ok?'Sent — thank you!':'Could not send. Try again.';
          });`
        : '',
    ),
  };
}

export function pinRevealPage(token: string) {
  const script = `
    document.getElementById('pin-form').addEventListener('submit', async e => {
      e.preventDefault();
      const pin = document.getElementById('pin').value;
      const error = document.getElementById('error');
      error.textContent = '';
      const response = await fetch('/v1/public/surprises/${token}', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      if (!response.ok) {
        error.textContent = 'That PIN is not correct. Try again.';
        return;
      }
      const { surprise } = await response.json();
      const main = document.getElementById('reveal');
      const media = Array.isArray(surprise.media) ? surprise.media : [];
      const playable = media.filter(item => /^https?:\\/\\//i.test(item.uri || ''));
      let mediaHtml = '';
      if (playable.length) {
        mediaHtml = '<div class="media">' + playable.map(item => {
          const src = String(item.uri).replace(/"/g, '&quot;');
          if (item.kind === 'video') return '<video controls playsinline preload="metadata" src="' + src + '"></video>';
          if (item.kind === 'audio' || item.kind === 'music') return '<audio controls src="' + src + '"></audio>';
          return '<img src="' + src + '" alt="" />';
        }).join('') + '</div>';
      } else if (media.length) {
        mediaHtml = '<p class="media-note">Media was attached but is not available on this link.</p>';
      }
      main.innerHTML = \`
        <div class="gift">🎁</div>
        <span class="eyebrow"></span>
        <h1></h1>
        <p class="for"></p>
        \${mediaHtml}
        <p class="message"></p>
      \`;
      main.querySelector('.eyebrow').textContent = surprise.occasion.toUpperCase();
      main.querySelector('h1').textContent = surprise.title;
      main.querySelector('.for').textContent = 'Made especially for ' + surprise.recipientName;
      main.querySelector('.message').textContent = surprise.message;
      const wishes = Array.isArray(surprise.wishes) ? surprise.wishes : [];
      if (wishes.length) {
        const list = document.createElement('div');
        list.className = 'wishes';
        const heading = document.createElement('h2');
        heading.textContent = 'Messages from your people (' + wishes.length + ')';
        list.appendChild(heading);
        wishes.forEach(wish => {
          const item = document.createElement('div');
          item.className = 'wish';
          const author = document.createElement('strong');
          author.textContent = wish.authorName;
          item.appendChild(author);
          item.appendChild(document.createTextNode(wish.message));
          list.appendChild(item);
        });
        main.appendChild(list);
      }
    });
  `;

  return {
    csp,
    html: htmlPage(
      'PIN required · WishDrop',
      `<div id="reveal">
         <div class="gift">🔒</div>
         <span class="eyebrow">WISHDROP SURPRISE</span>
         <h1>Enter the PIN</h1>
         <p class="muted">The creator protected this moment with a PIN.</p>
         <p id="error" class="error" aria-live="polite"></p>
         <form id="pin-form" class="card">
           <input id="pin" type="password" inputmode="numeric" minlength="4" maxlength="12" placeholder="4–12 character PIN" required autofocus />
           <button type="submit">Open surprise</button>
         </form>
       </div>`,
      script,
    ),
  };
}

export function escape(value: string) {
  return value.replace(/[&<>'"]/g, character =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character,
  );
}

export { csp as revealCsp };
