const fs = require("fs-extra");
const path = require("path");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const TAGS_API =
  "https://genuine-compassion-eb21be0109.strapiapp.com/api/hashtags";
const OUTPUT_DIR = path.join(__dirname, "tags");

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

const buildTagPageHTML = (tagName, tagTitle, articles, allTags) => {
  const formattedTag = tagName.replace(/[^a-zA-Z0-9\-]/g, "-");

  return `
  <!DOCTYPE html>
<html lang="en">
<head>
  <link rel="icon" type="image/png" sizes="32x32" href="favicon_io/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="favicon_io/favicon-16x16.png">
  <link rel="shortcut icon" href="favicon_io/favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="favicon_io/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="192x192" href="favicon_io/android-chrome-192x192.png">
  <link rel="icon" type="image/png" sizes="512x512" href="favicon_io/android-chrome-512x512.png">
  <link rel="manifest" href="/favicon_io/site.webmanifest">
<link rel="stylesheet" href="/assets/main.css">
<link rel="stylesheet" href="/assets/listpage.css">
  <meta charset="UTF-8" />
<title>${tagTitle} Articles: Decoded News & Insights | RagaDecode</title>
   ${gaScript}
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Explore decoded articles about ${tagTitle}, including news, insights, and stories curated by RagaDecode." />

  <link rel="canonical" href="https://ragadecode.com/tags/${formattedTag}" />

</head>
<body>
  <header>
    <h1>Raga Decode</h1>
    <p>Decoded News. Clear. Bold. Unfiltered.</p>
    <nav>
      <a href="/">Home</a>
      <a href="/news-article">Trending News</a>
      <a href="/technologies">Technology</a>
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
          <h2>${tagTitle}</h2>
          ${articles
            .map((article) => {
              const title = article.Title || "Untitled";
              const slug = article.slug || "#";
              const category = article.category || ""; // Assuming category is a string like "news-article" or "automobile"

              const summary = (article.Description_in_detail || "")
                .replace(/[#*_`>]/g, "")
                .replace(/\n/g, " ")
                .trim()
                .slice(0, 280); // conservative limit (not cutting mid-word)

                const publishedRaw = article.publishedat || article.publishedAt || article.createdAt;
                const published = new Date(publishedRaw).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }); 

               

             
              return `
              <div class="article-item">
                <div class="article-text">
                  <a href="/${category}/${slug}">${title}</a>
                  <div class="article-description">${summary}</div>
                  <div class="article-meta">Published on ${published}</div>
                  
                </div>
               
              </div>`;
            })
            .join("")}
        </section>
      </div>
      </div>

      <div class="sidebar">
      <div class="tag-section">
        <h3>All Tags</h3>
        <div class="tag-box">
        
          ${allTags
            .map((tag) => {
              const name = tag.name || "untitled-tag";
              const tagSlug = name.replace(/[^a-zA-Z0-9\-]/g, "-");
              return `<span><a href="${tagSlug}">#${name}</a></span>`;
            })
            .join("")}
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
        <div class="disclaimer">
    <strong>Transparency Notice:</strong> RagaDecode.com is a digital media publication. We do not sell products or services. If our domain name has ever been misused elsewhere, please report it by<a href="/static-pages/contact-us">contacting us</a>.
  </div>
        
        <p>&copy; 2025 RagaDecode. All rights reserved.</p>
      

    </footer>
</body>
</html>
`;
};

(async () => {
  try {
    const allTagsRes = await fetch(`${TAGS_API}?pagination[page]=1&pagination[pageSize]=1000&populate=*`);
    const allTagsJson = await allTagsRes.json();
    const allTags = allTagsJson.data;

    for (const tag of allTags) {
      const tagId = tag.documentId;
      const tagName = tag.name || "untitled-tag";
      const tagSlug = tagName.replace(/[^a-zA-Z0-9\-]/g, "-");

      const tagTitle = tagName
      .replace(/[^a-zA-Z0-9\s\-]/g, "") // Remove special characters
      .split(/[\s\-]+/) // Split by space or hyphen
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

        
      const tagDetailRes = await fetch(`${TAGS_API}/${tagId}?populate=*`);
      const tagDetailJson = await tagDetailRes.json();

      const tagData = tagDetailJson.data || {};

      let articles = tagData.tags;
      if (!articles || articles.length === 0) {
        articles = tagData.triptags;
      }

      if (!articles || articles.length === 0) {
        articles = tagData.tags;
      }

      if (!articles || articles.length === 0) {
        articles = tagData.technologytags;
      }
 

      const htmlContent = buildTagPageHTML(tagName, tagTitle, articles, allTags);
      const filePath = path.join(OUTPUT_DIR, `${tagSlug}.html`);

      await fs.ensureDir(OUTPUT_DIR);
      await fs.writeFile(filePath, htmlContent, "utf8");
      console.log(`✅ Generated: tags/${tagSlug}`);
    }
  } catch (error) {
    console.error("❌ Error generating tag pages:", error);
  }
})();
