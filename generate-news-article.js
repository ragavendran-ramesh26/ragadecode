const fs = require("fs-extra");
const path = require("path");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const API_URL =
  "https://genuine-compassion-eb21be0109.strapiapp.com/api/news-articles?sort[0]=publishedat:desc&sort[1]=id:desc&pagination[page]=1&pagination[pageSize]=100&populate[hashtags]=true&populate[author][populate][profile_image]=true&populate[coverimage]=true&populate[category]=true";
const TAGS_API =
  "https://genuine-compassion-eb21be0109.strapiapp.com/api/hashtags";

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
    const tagRes = await fetch(TAGS_API);
    const { data: tagData } = await tagRes.json();

    const res = await fetch(API_URL);
    const { data } = await res.json();

    // Create a map of categories to their articles
    const categoryMap = new Map();
    const uniqueTagMap = new Map();

    // First pass to collect all tags and categorize articles
    for (const article of data) {
      const attr = article.attributes || article;
      const hashtags = attr.hashtags?.data || attr.hashtags || [];
      const category = attr.category?.data || attr.category; // Get category object

      // Collect unique tags
      for (const tag of hashtags) {
        const tagAttr = tag.attributes || tag;
        if (tagAttr && tagAttr.name && !uniqueTagMap.has(tagAttr.name)) {
          uniqueTagMap.set(tagAttr.name, tagAttr);
        }
      }

      // Categorize articles - use category slug as key
      if (category) {
        const categorySlug = (category.attributes || category).slug;
        if (!categoryMap.has(categorySlug)) {
          categoryMap.set(categorySlug, {
            categoryObj: category,
            articles: []
          });
        }
        categoryMap.get(categorySlug).articles.push(article);
      }
    }

    // Generate HTML for each category
    for (const [categorySlug, categoryData] of categoryMap) {
      const category = categoryData.categoryObj;
      const articles = categoryData.articles;
      
      const categoryAttr = category.attributes || category;
      const categoryName = categoryAttr.name || "News";

      const sections = {
        [categorySlug]: [] // Use category slug as key
      };

      // Process articles for this category
      for (const article of articles) {
        const attr = article.attributes || article;
        const title = attr.Title || "Untitled";
        const slug = attr.slug || "";
        const articleCategory = attr.category?.data?.attributes?.slug || 
                              (attr.category?.attributes || attr.category)?.slug || 
                              "news-article";
        const cover = attr.coverimage?.data?.attributes?.formats?.small?.url || 
                     attr.coverimage?.data?.attributes?.url || 
                     (attr.coverimage?.attributes || attr.coverimage)?.url || 
                     "";
        const coverUrl = cover || "";

        const publishedRaw = attr.publishedat || attr.publishedAt || attr.createdAt;
        const published = new Date(publishedRaw).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });

        const rawSummary = (attr.Description_in_detail || "")
          .replace(/[#*_`>]/g, "")
          .replace(/\n/g, " ")
          .trim();

        const summary = rawSummary.length > 180
          ? rawSummary.slice(0, rawSummary.slice(0, 180).lastIndexOf(" ")) + "..."
          : rawSummary;

        const tags = (attr.hashtags?.data || attr.hashtags || [])
          .slice(0, 2)
          .map(tag => {
            const tagAttr = tag.attributes || tag;
            return tagAttr.name || "";
          })
          .filter(Boolean)
          .map(name => `<a href="/tags/${name.toLowerCase().replace(/\s+/g, "-")}">#${name}</a>`)
          .join(" ");

        const html = `
          <div class="article-item">
            <div class="article-text">
              <a href="${articleCategory}/${slug}">${title}</a>
              <div class="article-description">${summary}</div>
              <div class="article-meta">Published on ${published}</div>
              <div class="article-tags">
                ${tags}
              </div>
            </div>
            ${
              coverUrl
                ? `<img src="${coverUrl}" class="article-thumb" alt="${title}">`
                : ""
            }
          </div>
        `;

        // Add to this category's section
        sections[categorySlug].push(html);
      }

      // Generate tag box HTML
      const tagBoxHtml = Array.from(uniqueTagMap.values())
        .map(tag => {
          const name = tag.name || "";
          const slug = name.toLowerCase().replace(/\s+/g, "-");
          return `<span><a href="/tags/${slug}">#${name}</a></span>`;
        })
        .join("\n");

      // Generate page HTML for this category
      const pageHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
<link rel="icon" type="image/png" sizes="32x32" href="/favicon_io/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon_io/favicon-16x16.png">
<link rel="shortcut icon" href="/favicon_io/favicon.ico">
<link rel="apple-touch-icon" sizes="180x180" href="/favicon_io/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="/favicon_io/android-chrome-192x192.png">
<link rel="icon" type="image/png" sizes="512x512" href="/favicon_io/android-chrome-512x512.png">
<link rel="manifest" href="/favicon_io/site.webmanifest">
<link rel="stylesheet" href="/assets/main.css">
<link rel="stylesheet" href="/assets/listpage.css">
<link rel="stylesheet" href="/assets/newslist.css">
  <meta charset="UTF-8" />
  <title> Decoded ${categoryName} | RagaDecode</title>
    ${gaScript}
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4195715781915036"
     crossorigin="anonymous"></script>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Latest ${categoryName} news and articles from RagaDecode. Stay updated with decoded takes on ${categoryName} news." />
  <link rel="canonical" href="https://ragadecode.com/${categorySlug}" />
</head>
<body>
  <header>
    <h1>Raga Decode</h1>
    <p>Decoded News. Clear. Bold. Unfiltered.</p>
    <nav>
      <a href="/">Home</a>
      <a href="/news-article">Trending News</a>
      <a href="/technologies">Technology</a>
      <a href="/finances">Finance</a>
      <a href="/automobile">Automobile</a>
      <a href="/tourism-travel-trips">Travel Trips</a>
    </nav>
  </header>

  <main>
    <div class="layout-wrapper">
      <div class="main-content">
        <div class="content-wrapper">
          <section>
            <h2>${categoryName}</h2>
            <div class="two-column fixed-height-grid">
              <div class="column">
                ${sections[categorySlug].slice(0, 10).join("\n")}
              </div>
              <div class="column">
                ${sections[categorySlug].slice(10, 20).join("\n")}
              </div>
            </div>

            ${
              sections[categorySlug].length > 20
                ? `
                <div class="compact-list">
                  ${sections[categorySlug].slice(20).map(html => {
                    const titleMatch = html.match(/<a href="[^"]+">(.+?)<\/a>/);
                    const urlMatch = html.match(/<a href="([^"]+)">/);
                    const imgMatch = html.match(/<img src="([^"]+)"[^>]*>/);
                    const dateMatch = html.match(/Published on ([^<]+)/);

                    const title = titleMatch ? titleMatch[1] : "Untitled";
                    const link = urlMatch ? urlMatch[1] : "#";
                    const image = imgMatch ? imgMatch[1] : "";
                    const date = dateMatch ? dateMatch[1] : "";

                    return `
                      <div class="compact-item">
                        ${image ? `<img src="${image}" class="compact-thumb" alt="${title}"/>` : ""}
                        <div class="compact-text">
                          <a href="${link}">${title}</a>
                          <div class="compact-date">Published on ${date}</div>
                        </div>
                      </div>
                    `;
                  }).join("\n")}
                </div>
                `
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

      // Create directory if it doesn't exist
      const outputDir = path.join(__dirname, categorySlug);
      await fs.ensureDir(outputDir);
      
      // Write index.html file
      const outputPath = path.join(outputDir, "index.html");
      await fs.writeFile(outputPath, pageHtml);
      console.log(`✅ Generated ${categorySlug}/index.html with ${articles.length} articles`);
    }

    console.log("✅ All category pages generated successfully");
  } catch (err) {
    console.error("❌ Failed to generate news articles:", err);
  }
})();