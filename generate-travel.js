const fs = require("fs-extra");
const path = require("path");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const API_URL =
  "https://genuine-compassion-eb21be0109.strapiapp.com/api/tourism-travel-trips?populate=*&sort[0]=publishedat:desc";

const OUTPUT_PATH = path.join(__dirname, "tourism-travel-trips.html");

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
      travel: [],
    };

    const uniqueTagMap = new Map();

    for (const article of data) {
      const attr = article.attributes || article;

      const hashtags = attr.hashtags || [];

      for (const tag of hashtags) {
        if (tag && tag.name && !uniqueTagMap.has(tag.name)) {
          uniqueTagMap.set(tag.name, tag);
        }
      }
    }

    for (const article of data) {
      const attr = article.attributes || article;
      const title = attr.Title || "Untitled";
      const slug = attr.slug || "";
      const category = attr.category?.toLowerCase(); // fallback to auto if missing
      const cover =
        attr.coverimage?.formats?.small?.url || attr.coverimage?.url || "";
      const coverUrl = cover || "";
      const publishedRaw = attr.publishedat || attr.publishedAt || attr.createdAt;
      const published = new Date(publishedRaw).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }); 
      const summary = (attr.Description_in_detail || "")
        .replace(/[#*_`>]/g, "")
        .replace(/\n/g, " ")
        .trim()
        .slice(0, 280); // conservative limit (not cutting mid-word)

      const tags = (attr.hashtags || [])
        .map((tag) => tag.name || "")
        .filter(Boolean)
        .map((name) => `<a href="/tags/${name.toLowerCase().replace(/\s+/g, "-")}">#${name}</a>`)
        .join(" ");

      const html = `
        <div class="article-item">
          <div class="article-text">
            <a href="tourism-travel-trips/${slug}">${title}</a>
            <div class="article-description">${summary}</div>
            <div class="article-meta">Published on ${published}</div>
            <div class="article-tags">
              ${tags }
            </div>
          </div>
          ${
            coverUrl
              ? `<img src="${coverUrl}" class="article-thumb" alt="${title}">`
              : ""
          } 
       
        </div>
        
      `;

      if (category.includes("tech")) sections.technology.push(html);
      else if (category.includes("finance")) sections.finance.push(html);
      else if (category.includes("automobile"))
        sections.automobile.push(html); // ✅ Add this
      else if (category.includes("tourism-travel-trip"))
        sections.travel.push(html); // ✅ Add this
      else sections.trending.push(html);
    }

    const tagBoxHtml = Array.from(uniqueTagMap.values())
  .map((tag) => {
    const name = tag.name || "";
    const slug = name.toLowerCase().replace(/\s+/g, "-");
    return `<span><a href="/tags/${slug}">#${name}</a></span>`;
  })
  .join("\n");

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
  <title>Stay updated with the latest travel news, explore expert destination guides, and decode unforgettable trip ideas. RagaDecode brings you curated content on tourism, travel trends, and smart travel tips. </title>
    ${gaScript}
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content=" — decoded by Raga" />

  <link rel="canonical" href="https://ragadecode.com/tourism-travel-trips" />

<link rel="stylesheet" href="/assets/main.css">
<link rel="stylesheet" href="/assets/listpage.css">
</head>
<body>
  <header>
    <h1>Raga Decode</h1>
    <p>Decoded News. Clear. Bold. Unfiltered.</p>
    <nav>
      <a href="/">Home</a>
      <a href="/news-article">Trending News</a>
      <a href="/technology">Technology</a>
      <a href="#finance">Finance</a>
      <a href="/decode-automobile-talks">Automobile</a>
      <a href="/tourism-travel-trips">Travel Trips</a>
    </nav>
  </header>

  <main>
      <div class="layout-wrapper">
        <div class="main-content">
          <div class="content-wrapper">
          <section>
  <h2>Tourism Travel Trips</h2>
  ${sections.travel.slice(0, 30).join("\n") || "<p>No articles available.</p>"}
  ${
    sections.travel.length > 30
      ? `<div style="text-align:right; margin-top:10px;"><a href="/tourism-travel-trips" class="more-link">More &gt;&gt;</a></div>`
      : ""
  }
</section>
 
    </div>
    </div>

   <div class="sidebar">
    <div class="tag-section">
      <h3>Tags</h3>
      <div class="tag-box">
        ${tagBoxHtml}
      </div>

      <!-- <h3 style="margin-top: 24px;">Sponsored</h3>
       <div class="ad-box">Your Ad Here</div> -->
    </div>
    </div>
  </div>
</main>
 <footer>
     <p>
            <a href="/static-pages/about-us">About Us</a> |
            <a href="/static-pages/editorial-policy">Editorial Policy </a> | 
            <a href="/static-pages/privacy-policy">Privacy Policy </a> |
            <a href="/static-pages/terms-and-conditions">Terms and Conditions </a> |
            <a href="/static-pages/contact-us">Contact Us </a>
        </p>
        <p>&copy; 2025 RagaDecode. All rights reserved.</p>
      

    </footer>
</body>
</html>
`;

    await fs.writeFile(OUTPUT_PATH, pageHtml);
    console.log(
      `✅ tourism-travel-trips.html generated with ${data.length} articles`
    );
  } catch (err) {
    console.error(
      "❌ Failed to generate tourism-travel-trips page:",
      err.message
    );
  }
})();
