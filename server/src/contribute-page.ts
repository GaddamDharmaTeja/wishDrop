import { escape, htmlPage } from './reveal-page.js';

export function contributeUnavailablePage() {
  return htmlPage(
    'Invite closed · WishDrop',
    `<div class="gift">💌</div>
     <span class="eyebrow">WISHDROP</span>
     <h1>This invite is closed</h1>
     <p class="muted">The surprise may have ended, or the creator turned off wishes.</p>`,
  );
}

export function contributePage(surprise: {
  recipientName: string;
  occasion: string;
  pageUrl: string;
  passwordRequired?: boolean;
}) {
  const script = `
    document.getElementById('wish-form').addEventListener('submit', async e => {
      e.preventDefault();
      const status = document.getElementById('status');
      const button = e.target.querySelector('button');
      status.textContent = '';
      button.disabled = true;
      const token = location.pathname.split('/').pop();
      const passwordEl = document.getElementById('password');
      const response = await fetch('/v1/public/contribute/' + token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: document.getElementById('name').value,
          message: document.getElementById('message').value,
          password: passwordEl ? passwordEl.value : undefined
        })
      });
      button.disabled = false;
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        status.textContent = body.message || 'Could not send your wish. Try again.';
        return;
      }
      document.getElementById('wish-form').outerHTML = '<div class="card"><h1 style="font-size:1.6rem">Sent!</h1><p class="muted">Your wish will be part of the surprise.</p></div>';
    });
  `;

  const name = escape(surprise.recipientName);
  const pageUrl = escape(surprise.pageUrl);
  const passwordField = surprise.passwordRequired
    ? `<input id="password" type="password" maxlength="64" placeholder="Contribution password" required />`
    : '';
  return htmlPage(
    `Add your wish for ${name} · WishDrop`,
    `<div class="gift">💌</div>
     <span class="eyebrow">${escape(surprise.occasion).toUpperCase()}</span>
     <h1>Add your wish for ${name}</h1>
     <p class="muted">Your message will appear when ${name} opens the surprise.</p>
     <form id="wish-form" class="card">
       ${passwordField}
       <input id="name" maxlength="60" placeholder="Your name" required />
       <textarea id="message" maxlength="500" placeholder="Write something from the heart..." required></textarea>
       <button type="submit">Send my wish</button>
       <p id="status" class="error" aria-live="polite"></p>
     </form>`,
    script,
    `<meta property="og:type" content="website" />
     <meta property="og:title" content="${pageUrl}" />
     <meta property="og:description" content="${pageUrl}" />
     <meta property="og:url" content="${pageUrl}" />
     <meta name="twitter:title" content="${pageUrl}" />
     <meta name="twitter:description" content="${pageUrl}" />`,
  );
}
