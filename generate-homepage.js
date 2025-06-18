const fs = require('fs-extra');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const API_URL = 'https://genuine-compassion-eb21be0109.strapiapp.com/api/news-articles?populate=coverimage';
const OUTPUT_PATH = path.join(__dirname, 'index.html');


(async () => {
  try {
    const res = await fetch(API_URL);
    const { data } = await res.json();

    const articlesHtml = data.map(article => {
      const attr = article.attributes || article;
      const title = attr.Title || 'Untitled';
      const slug = attr.slug || '';
      const cover = attr.coverimage?.formats.small.url || '';
      const coverUrl = cover || '';

       
      const published = new Date(attr.publishedAt || '').toLocaleDateString();
      const summary = (attr.Description_in_detail || '').split("\n")[0].replace(/[#*_`>]/g, '').slice(0, 150) + '...';

      return `
        <div class="article-item">
          <div class="article-text">
            <a href="news-article/${slug}.html">${title}</a>
            <div class="article-description">${summary}</div>
            <div class="article-meta">Published on ${published}</div>
          </div>
          ${coverUrl ? `<img src="${coverUrl}" class="article-thumb" alt="${title}">` : ''}
        </div>
      `;
    }).join('\n');

    const pageHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>RagaDecode | Latest News</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Latest news from RagaDecode — decoded by Raga" />
  <style>
    body { font-family: "Segoe UI", sans-serif; margin: 0; background: #f9f9f9; color: #333; }
    header, footer { background-color: #1e2a38; color: white; text-align: center; padding: 24px 20px; }
    header h1 { margin: 0; font-size: 1.8rem; }
    main { max-width: 900px; margin: auto; padding: 40px 20px; }
    .article-item { display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding: 24px 0; gap: 24px; }
    .article-text { flex: 1.5; }
    .article-text a { text-decoration: none; font-weight: bold; font-size: 1.3rem; color: #2c3e50; }
    .article-text a:hover { text-decoration: underline; }
    .article-description { font-size: 1rem; margin: 10px 0; color: #444; }
    .article-meta { font-size: 0.8rem; color: #777; }
    .article-thumb { width: 140px; height: 100px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
    footer p { font-size: 0.85rem; color: #ccc; }
    @media (max-width: 768px) {
      .article-item { flex-direction: column; }
      .article-thumb { width: 100%; height: auto; margin-top: 16px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>📰 RagaDecode</h1>
    <p>Decoded News. Clear. Bold. Unfiltered.</p>
  </header>
  <main>
    <div id="articles">
      ${articlesHtml}
    </div>
  </main>
  <footer>
    <p>© 2025 RagaDecode. All rights reserved.</p>
  </footer>
</body>
</html>`;

    await fs.writeFile(OUTPUT_PATH, pageHtml);
    console.log(`✅ index.html generated with ${data.length} articles`);

  } catch (err) {
    console.error('❌ Failed to generate homepage:', err.message);
  }
})();
