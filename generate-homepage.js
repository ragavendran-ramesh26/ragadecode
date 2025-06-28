const fs = require("fs-extra");
const path = require("path");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const API_CONFIGS = [
  {
    name: "Trending News",
    apiUrl:
      "https://genuine-compassion-eb21be0109.strapiapp.com/api/news-articles?populate=*&sort[0]=id:desc",

    outputDir: "./news-article",
    slugPrefix: "news-article",
  },
  {
    name: "Automobiles",
    apiUrl:
      "https://genuine-compassion-eb21be0109.strapiapp.com/api/automobiles?populate=*&sort[0]=id:desc",
    outputDir: "./automobile",
    slugPrefix: "automobile",
  },
  {
    name: "Technology",
    apiUrl:
      "https://genuine-compassion-eb21be0109.strapiapp.com/api/technologies?populate=*&sort[0]=id:desc",
    outputDir: "./technologies",
    slugPrefix: "technologies",
  },
  {
    name: "Tourism Travel Trips",
    apiUrl:
      "https://genuine-compassion-eb21be0109.strapiapp.com/api/tourism-travel-trips?populate=*&sort[0]=id:desc",
    outputDir: "./tourism-travel-trips",
    slugPrefix: "tourism-travel-trips",
  },
];
const TAGS_API =
  "https://genuine-compassion-eb21be0109.strapiapp.com/api/hashtags";

const OUTPUT_PATH = path.join(__dirname, "index.html");

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

    const tagBoxHtml = tagData
      .map((tag) => {
        const name = tag.name || "";
        const slug = name.toLowerCase().replace(/\s+/g, "-");
        return `<span><a href="/tags/${slug}">#${name}</a></span>`;
      })
      .join("\n");

    const categoryBlocks = await Promise.all(
      API_CONFIGS.map(async (config) => {
        const res = await fetch(config.apiUrl);
        const json = await res.json();
        const articles = json.data || [];

        const featured = articles[0];

        const title = featured?.Title || `Sample Headline for ${config.name}`;
        const image = featured?.coverimage?.url || "assets/default-cover.jpg";
        const slug = featured?.slug || "#";

        const items = articles.slice(1, 7).map((a) => {
          const shortTitle = a?.Title?.slice(0, 70) || "Untitled article";
          const articleSlug = a?.slug || "#";
          const slugPrefix = config.slugPrefix;
          return `<li><a href="/${slugPrefix}/${articleSlug}">${shortTitle}</a></li>`;
        });

        return `
      <div class="category-block">
        <div class="section-header">
          <h2>${config.name}</h2>
          <a href="/${config.slugPrefix}" class="view-all">View All</a>
        </div>
        <div class="section-body">
          <div class="left-featured">
            <a href="/${config.slugPrefix}/${slug}">
              <img src="${image}" alt="${title}">
              <h3>${title}</h3>
            </a>
          </div>
          <div class="right-list">
            <ul>
              ${items.join("\n")}
            </ul>
          </div>
        </div>
      </div>
    `;
      })
    );

    const homepageSectionHtml = `
<section class="homepage-section">
  ${categoryBlocks.join("\n")}
</section>
`;

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
<link rel="stylesheet" href="assets/main.css">
<link rel="stylesheet" href="assets/listpage.css">
<link rel="stylesheet" href="assets/home.css">
  <meta charset="UTF-8" />
  <title>RagaDecode | Trending News, Technology Updates, Financial Insights & Automobile Reports</title>
    ${gaScript}
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Stay ahead with RagaDecode — your trusted source for decoded trending news, expert technology insights, financial analysis, and the latest automobile updates. Explore editorial-grade articles that break down complex topics into sharp, readable insights." />

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

          <section class="intro-wrapper">
  <div class="intro-box">
    <h2>Welcome to RagaDecode</h2>
    <p class="tagline"><strong>Decoded News. Bold. Clear. Unbiased.</strong></p>
    <p><strong>RagaDecode</strong> is a content platform dedicated to simplifying the world’s most important and complex topics — from trending stories and emerging technologies to finance insights, automotive updates, travel tips, and global developments.</p>

    <p>We take the overwhelming and break it down into well-structured, easy-to-understand content designed for modern, curious readers. Whether it’s decoding a financial shift, explaining a tech breakthrough, or offering practical knowledge in lifestyle and global affairs, our goal is to make information clear, relevant, and accessible.</p>
    <p>
With a focus on clarity, reliability, and depth, RagaDecode helps you stay informed and empowered — without distractions. It’s your one-stop destination for insightful explainers, fact-based analysis, and smart content that matters.
    </p>
  </div>

   
</section>

   

   ${homepageSectionHtml}


   


 
    </div>
    </div> 
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

    await fs.writeFile(OUTPUT_PATH, pageHtml);
    // console.log(`✅ index.html generated with ${data.length} articles`);
  } catch (err) {
    console.error("❌ Failed to generate homepage:", err.message);
  }
})();
