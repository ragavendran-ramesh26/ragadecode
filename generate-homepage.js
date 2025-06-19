const fs = require('fs-extra');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const API_URL = 'https://genuine-compassion-eb21be0109.strapiapp.com/api/news-articles?populate=coverimage&sort[0]=id:desc';
const OUTPUT_PATH = path.join(__dirname, 'index.html');

const gaScript = `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-QEL34RBXBH"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-QEL34RBXBH');
</script>
`;


(async () => {
  try {
    const res = await fetch(API_URL);
    const { data } = await res.json();

    const sections = {
      trending: [],
      technology: [],
      finance: [],
       automobile: [],
    };

    for (const article of data) {
      const attr = article.attributes || article;
      const title = attr.Title || 'Untitled';
      const slug = attr.slug || '';
      const category = attr.Category?.toLowerCase() || 'trending'; // fallback to trending if missing
      const cover = attr.coverimage?.formats.small.url || '';
      const coverUrl = cover || '';
      const published = new Date(attr.publishedAt || '').toLocaleDateString();
      const summary = (attr.Description_in_detail || '')
        .replace(/[#*_`>]/g, '')
        .replace(/\n/g, ' ')
        .trim()
        .slice(0, 280); // conservative limit (not cutting mid-word)

      const html = `
        <div class="article-item">
          <div class="article-text">
            <a href="news-article/${slug}.html">${title}</a>
            <div class="article-description">${summary}</div>
            <div class="article-meta">Published on ${published}</div>
          </div>
          ${coverUrl ? `<img src="${coverUrl}" class="article-thumb" alt="${title}">` : ''}
        </div>
      `;

      if (category.includes('tech')) sections.technology.push(html);
else if (category.includes('finance')) sections.finance.push(html);
else if (category.includes('auto')) sections.automobile.push(html); // ✅ Add this
else sections.trending.push(html);
    }

    const pageHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
<link rel="icon" type="image/png" sizes="32x32" href="favicon_io/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="favicon_io/favicon-16x16.png">
<link rel="shortcut icon" href="favicon_io/favicon.ico">

<!-- Apple Touch Icon -->
<link rel="apple-touch-icon" sizes="180x180" href="favicon_io/apple-touch-icon.png">

<!-- Android Chrome -->
<link rel="icon" type="image/png" sizes="192x192" href="favicon_io/android-chrome-192x192.png">
<link rel="icon" type="image/png" sizes="512x512" href="favicon_io/android-chrome-512x512.png">

<!-- Web Manifest (Optional but good for PWA support) -->
<link rel="manifest" href="favicon_io/site.webmanifest">
  <meta charset="UTF-8" />
  <title>RagaDecode | Trending News, Technology Updates, Financial Insights & Automobile Reports</title>
    ${gaScript}
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Stay ahead with RagaDecode — your trusted source for decoded trending news, expert technology insights, financial analysis, and the latest automobile updates. Explore editorial-grade articles that break down complex topics into sharp, readable insights." />
  <style>
    body { font-family: "Segoe UI", sans-serif; margin: 0; background: #f9f9f9; color: #333; }
    
      header {
  background-color: transparent;
  color: black;
  text-align: center;
  padding: 16px 20px 8px 20px; /* Less bottom padding */
}

header h1 {
  margin: 0;
  font-size: 2rem;
}

header p {
  margin: 6px 0 16px; /* Add bottom margin to separate from nav */
  font-size: 1rem;
  color: #857e7e;
  border-bottom: 1px solid #ccc;
  padding-bottom: 20px;
}




    nav a {
  display: inline-block;
  margin: 6px 6px;
  padding: 6px 12px;
  background-color: #0660c9;
  color: #fff;
  text-decoration: none;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 500;
  transition: background-color 0.2s ease;
}

nav a:hover {
  background-color: #ffffff;
  color: #0660c9;
  text-decoration: none;
}

     main {
  padding: 40px 20px;
}

.content-wrapper {
  display: flex;
  gap: 40px;
  max-width: 1200px;
  margin: 0 auto;
}

    section { margin-bottom: 48px; }
    section h2 {
      font-size: 1.5rem;
      color: #1e2a38;
      margin-bottom: 16px;
      border-left: 4px solid #1e2a38;
      padding-left: 12px;
    }

    .article-item {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #eee;
      padding: 24px 0;
      gap: 24px;
    }
    .article-text { flex: 1.5; }
    .article-text a { text-decoration: none; font-weight: bold; font-size: 1.3rem; color: #2c3e50; }
    .article-text a:hover { text-decoration: underline; }
.article-description {
  font-size: 1rem;
  margin: 10px 0;
  color: #444;
  display: -webkit-box;
  -webkit-line-clamp: 3;             /* Show up to ~2.5-3 lines */
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  max-height: 4.8em;                 /* Fallback for older browsers */
}
    .article-meta { font-size: 0.8rem; color: #777; }
    .article-thumb { width: 140px; height: 100px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }

    footer {
      background-color: transparent;
      color: #000;
      text-align: center;
      padding: 24px 20px;
      border-top: 1px solid #e7e7e7;
    }

    footer a {
      color: #000;
      text-decoration: none;
      margin: 0 12px;
      font-weight: 500;
    }
    footer a:hover { text-decoration: underline; }

    @media (max-width: 768px) {
      .article-item { flex-direction: column; }
      .article-thumb { width: 100%; height: auto; margin-top: 16px; }
      nav {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}
      nav a { margin: 0; }
    }



.main-content {
  flex: 1 1 65%;
}

.sidebar {
  flex: 1 1 30%;
  background: #fff;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 10px;
  height: fit-content;
}

.sidebar h3 {
  font-size: 1.2rem;
  margin-bottom: 10px;
  border-bottom: 1px solid #ccc;
  padding-bottom: 6px;
}

.tag-box span {
  display: inline-block;
  background: #eef2f5;
  padding: 6px 12px;
  margin: 4px;
  border-radius: 20px;
  font-size: 0.85rem;
  color: #1e2a38;
}

.ad-box {
  margin-top: 16px;
  padding: 40px 20px;
  background-color: #f1f1f1;
  text-align: center;
  border: 1px dashed #bbb;
  border-radius: 6px;
  font-size: 0.95rem;
  color: #333;
}

@media (max-width: 768px) {
  .content-wrapper {
    flex-direction: column;
  }
  .main-content, .sidebar {
    flex: 1 1 100%;
  }
}
.more-link {
  display: inline-block;
  margin-top: 8px;
  padding: 6px 12px;
  background-color: #1e2a38;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 500;
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.more-link:hover {
  background-color: #000;
  text-decoration: none;
  color: #fff;
}


  </style>
</head>
<body>
  <header>
    <h1>Raga Decode</h1>
    <p>Decoded News. Clear. Bold. Unfiltered.</p>
    <nav>
      <a href="index.html">Home</a>
      <a href="#trending">Trending News</a>
      <a href="#technology">Technology</a>
      <a href="#finance">Finance</a>
      <a href="decode-automobile-talks.html">Automobile</a>
    </nav>
  </header>

  <main>
  <div class="content-wrapper">
    <div class="main-content">
      <section id="trending">
  <h2>Trending News</h2>
  ${sections.trending.slice(0, 30).join('\n') || '<p>No articles available.</p>'}
  ${sections.trending.length > 30 ? `<div style="text-align:right; margin-top:10px;"><a href="/#" class="more-link">More &gt;&gt;</a></div>` : ''}
</section>

<section id="technology">
  <h2>Technology</h2>
  ${sections.technology.slice(0, 3).join('\n') || '<p>No articles available.</p>'}
  ${sections.technology.length > 3 ? `<div style="text-align:right; margin-top:10px;"><a href="/technology.html" class="more-link">More &gt;&gt;</a></div>` : ''}
</section>

<section id="finance">
  <h2>Finance</h2>
  ${sections.finance.slice(0, 3).join('\n') || '<p>No articles available.</p>'}
  ${sections.finance.length > 3 ? `<div style="text-align:right; margin-top:10px;"><a href="/finance.html" class="more-link">More &gt;&gt;</a></div>` : ''}
</section>

<section id="automobile">
  <h2>Automobile</h2>
  ${sections.automobile.slice(0, 3).join('\n') || '<p>No articles available.</p>'}
  ${sections.automobile.length > 3 ? `<div style="text-align:right; margin-top:10px;"><a href="/automobile.html" class="more-link">More &gt;&gt;</a></div>` : ''}
</section>
    </div>

    <aside class="sidebar">
      <h3>Tags</h3>
      <div class="tag-box">
        <span>#Breaking</span>
        <span>#Tech</span>
        <span>#Markets</span>
        <span>#India</span>
      </div>

      <!-- <h3 style="margin-top: 24px;">Sponsored</h3>
       <div class="ad-box">Your Ad Here</div> -->
    </aside>
  </div>
</main>

  <footer>
    <a href="#">About Us</a> | <a href="#">Contact Us</a>
  </footer>
</body>
</html>
`;

    await fs.writeFile(OUTPUT_PATH, pageHtml);
    console.log(`✅ index.html generated with ${data.length} articles`);

  } catch (err) {
    console.error('❌ Failed to generate homepage:', err.message);
  }
})();
