// Scarica le ultime news di ArcheAge Chronicles dall'API pubblica di Steam
// e le inietta nella pagina archeage/index.html, tra i marcatori
// <!-- STEAM-NEWS-START --> e <!-- STEAM-NEWS-END -->.
//
// Eseguito automaticamente dal workflow GitHub Actions
// .github/workflows/update-archeage-news.yml (nessuna azione manuale richiesta).

const fs = require('fs');
const path = require('path');

const APP_ID = 3218230; // ArcheAge Chronicles su Steam
const PAGE_PATH = path.join(__dirname, '..', 'archeage', 'index.html');
const START_MARKER = '<!-- STEAM-NEWS-START -->';
const END_MARKER = '<!-- STEAM-NEWS-END -->';
const MAX_ITEMS = 5;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pulisciTesto(bbcode) {
  return String(bbcode)
    .replace(/\[[^\]]*\]/g, ' ')       // rimuove i tag BBCode di Steam ([b], [url], ecc.)
    .replace(/https?:\/\/\S+/g, '')     // rimuove URL nudi nel testo
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v0002/?appid=${APP_ID}&count=${MAX_ITEMS}&maxlength=400&format=json`;

  const res = await fetch(url, { headers: { 'User-Agent': 'confraternita-dei-mastri-sito/1.0' } });
  if (!res.ok) {
    throw new Error(`Steam API ha risposto ${res.status}`);
  }
  const data = await res.json();
  const items = (data && data.appnews && data.appnews.newsitems) || [];

  let html;
  if (items.length === 0) {
    html = '<div class="news-empty">Nessuna notizia pubblicata ancora da Steam per ArcheAge Chronicles.</div>';
  } else {
    html = items.slice(0, MAX_ITEMS).map((item) => {
      const date = new Date(item.date * 1000).toLocaleDateString('it-IT', {
        day: 'numeric', month: 'long', year: 'numeric',
      });
      let excerpt = pulisciTesto(item.contents).slice(0, 220);
      if (pulisciTesto(item.contents).length > 220) excerpt += '…';

      return `      <a class="news-card" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">
        <div class="news-date">${escapeHtml(date)}</div>
        <div class="news-title">${escapeHtml(item.title)}</div>
        <div class="news-excerpt">${escapeHtml(excerpt)}</div>
        <div class="news-source">Fonte: Steam ↗</div>
      </a>`;
    }).join('\n');
  }

  const page = fs.readFileSync(PAGE_PATH, 'utf8');
  const startIdx = page.indexOf(START_MARKER);
  const endIdx = page.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`Marcatori ${START_MARKER} / ${END_MARKER} non trovati in ${PAGE_PATH}`);
  }

  const updated =
    page.slice(0, startIdx + START_MARKER.length) +
    '\n' + html + '\n      ' +
    page.slice(endIdx);

  fs.writeFileSync(PAGE_PATH, updated);
  console.log(`Aggiornate ${items.length} news di ArcheAge Chronicles in ${PAGE_PATH}`);
}

main().catch((err) => {
  console.error('Errore nel recupero delle news Steam:', err.message);
  process.exit(1);
});
