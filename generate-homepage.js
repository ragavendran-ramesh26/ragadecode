const fs = require("fs-extra");
const path = require("path");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const API_URL =
  "https://genuine-compassion-eb21be0109.strapiapp.com/api/news-articles?sort[0]=publishedat:desc&sort[1]=id:desc&pagination[page]=1&pagination[pageSize]=100&populate[coverimage]=true&populate[category]=true";

const API_CONFIGS = [
  {
    name: "Trending News",
    apiUrl:
      "https://genuine-compassion-eb21be0109.strapiapp.com/api/news-articles?populate=*&sort[0]=publishedat:desc&sort[1]=id:desc",

    // outputDir: "./news-article",
    // slugPrefix: "news-article",
  },
  // {
  //   name: "Automobiles",
  //   apiUrl:
  //     "https://genuine-compassion-eb21be0109.strapiapp.com/api/automobiles?populate=*&sort[0]=publishedat:desc&sort[1]=id:desc",
  //   // outputDir: "./automobile",
  //   // slugPrefix: "automobile",
  // },
  // {
  //   name: "Technology",
  //   apiUrl:
  //     "https://genuine-compassion-eb21be0109.strapiapp.com/api/technologies?populate=*&sort[0]=publishedat:desc&sort[1]=id:desc",
  //   // outputDir: "./technologies",
  //   // slugPrefix: "technologies",
  // },
  // {
  //   name: "Tourism Travel Trips",
  //   apiUrl:
  //     "https://genuine-compassion-eb21be0109.strapiapp.com/api/tourism-travel-trips?populate=*&sort[0]=publishedat:desc&sort[1]=id:desc",
  //   // outputDir: "./tourism-travel-trips",
  //   // slugPrefix: "tourism-travel-trips",
  // },
  // {
  //   name: "Finances",
  //   apiUrl:
  //     "https://genuine-compassion-eb21be0109.strapiapp.com/api/finances?populate=*&sort[0]=publishedat:desc&sort[1]=id:desc",
  //   // outputDir: "./finances",
  //   // slugPrefix: "finances",
  // },
];
const TAGS_API =
  "https://genuine-compassion-eb21be0109.strapiapp.com/api/hashtags?pagination[page]=1&pagination[pageSize]=100";

const COUNTRIES_API =
  "https://genuine-compassion-eb21be0109.strapiapp.com/api/countries";
const STATES_API =
  "https://genuine-compassion-eb21be0109.strapiapp.com/api/states?populate=country";
const CITIES_API =
  "https://genuine-compassion-eb21be0109.strapiapp.com/api/cities?populate[state][populate]=country";

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

    const countriesRes = await fetch(COUNTRIES_API);
    const statesRes = await fetch(STATES_API);
    const citiesRes = await fetch(CITIES_API);

    const { data: countriesData } = await countriesRes.json();
    const { data: statesData } = await statesRes.json();
    const { data: citiesData } = await citiesRes.json();

    function splitCountries(countries) {
      const col1 = countries.slice(0, 6);
      const col2 = countries.slice(6, 12);
      const col3 = countries.slice(12, 18);

      return `
    <div class="sub-columns">
      <ul>
        ${col1
          .map((c) => `<li><a href="/locations/${c.slug}">${c.title}</a></li>`)
          .join("\n")}
      </ul>
      <ul>
        ${col2
          .map((c) => `<li><a href="/locations/${c.slug}">${c.title}</a></li>`)
          .join("\n")}
      </ul>
       <ul>
        ${col3
          .map((c) => `<li><a href="/locations/${c.slug}">${c.title}</a></li>`)
          .join("\n")}
      </ul>
    </div>
  `;
    }

    function splitStates(states) {
      const col1 = states.slice(0, 6);
      const col2 = states.slice(6, 12);
      const col3 = states.slice(12, 18);
      return `
    <div class="sub-columns">
      <ul>
        ${col1
          .map(
            (s) =>
              `<li><a href="/locations/${s.country.slug}/${s.slug}">${s.title}</a></li>`
          )
          .join("\n")}
      </ul>
      <ul>
        ${col2
          .map(
            (s) =>
              `<li><a href="/locations/${s.country.slug}/${s.slug}">${s.title}</a></li>`
          )
          .join("\n")}
      </ul>
      <ul>
        ${col3
          .map(
            (s) =>
              `<li><a href="/locations/${s.country.slug}/${s.slug}">${s.title}</a></li>`
          )
          .join("\n")}
      </ul>
    </div>
  `;
    }

    function splitCities(cities) {
      const col1 = cities.slice(0, 6);
      const col2 = cities.slice(6, 12);
      const col3 = cities.slice(12, 18);
      return `
    <div class="sub-columns">
      <ul>
        ${col1
          .map((city) => {
            const countrySlug = city.state?.country?.slug || "unknown";
            const stateSlug = city.state?.slug || "unknown";
            return `<li><a href="/locations/${countrySlug}/${stateSlug}/${city.slug}">${city.title}</a></li>`;
          })
          .join("\n")}
      </ul>
      <ul>
        ${col2
          .map((city) => {
            const countrySlug = city.state?.country?.slug || "unknown";
            const stateSlug = city.state?.slug || "unknown";
            return `<li><a href="/locations/${countrySlug}/${stateSlug}/${city.slug}">${city.title}</a></li>`;
          })
          .join("\n")}
      </ul>
      <ul>
        ${col3
          .map((city) => {
            const countrySlug = city.state?.country?.slug || "unknown";
            const stateSlug = city.state?.slug || "unknown";
            return `<li><a href="/locations/${countrySlug}/${stateSlug}/${city.slug}">${city.title}</a></li>`;
          })
          .join("\n")}
      </ul>
    </div>
  `;
    }

    const regionHtml = `
      <section class="region-wrapper">
      <div class="section-title">
        <h3>Explore News by Location</h3>
        </div>
        <div class="region-columns">

          <!-- Countries -->
          <div class="region-column">
            <h4>Countries</h4>
            ${splitCountries(countriesData)}
          </div>

          <!-- States -->
          <div class="region-column">
            <h4>States</h4>
            ${splitStates(statesData)}
          </div>

          <!-- Cities -->
          <div class="region-column">
            <h4>Cities</h4>
            ${splitCities(citiesData)}
          </div>

        </div>
        <div class="view-more-link">
          <a href="#">View More Locations →</a>
        </div>
      </section>
          `;

    const categoryBlocksMap = {};

    const response = await fetch(API_URL);
    const { data: articles } = await response.json();

    articles.forEach((article) => {
      const cat = article?.category?.name || "Uncategorized";
      const catSlug = article?.category?.slug || "uncategorized";
      if (!categoryBlocksMap[catSlug]) {
        categoryBlocksMap[catSlug] = {
          name: cat,
          slug: catSlug,
          articles: [],
        };
      }
      categoryBlocksMap[catSlug].articles.push(article);
    });

    const categoryBlocks = Object.values(categoryBlocksMap).map((category) => {
      const featured = category.articles[0];
      if (!featured) return ""; // skip empty

      const title = featured.Title;
      const slug = featured.slug;
      const image = featured.coverimage?.url || "/assets/default-image.jpg";

      const listItems = category.articles.slice(1, 7).map((a) => {
        return `<li><a href="/${category.slug}/${a.slug}">${a.Title?.slice(
          0,
          70
        )}</a></li>`;
      });

      return `
    <div class="category-block">
      <div class="section-header">
        <h2>${category.name}</h2>
        <a href="/${category.slug}" class="view-all">View All</a>
      </div>
      <div class="section-body">
        <div class="left-featured">
          <a href="/${category.slug}/${slug}">
            <div class="left-image">
              <img src="${image}" alt="${title}">
            </div>
            <div class="left-title">
              <h3>${title}</h3>
            </div>
          </a>
        </div>
        <div class="right-list">
          <ul>${listItems.join("\n")}</ul>
        </div>
      </div>
    </div>
  `;
    });

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
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4195715781915036"
     crossorigin="anonymous"></script>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Stay ahead with RagaDecode — your trusted source for decoded trending news, expert technology insights, financial analysis, and the latest automobile updates. Explore editorial-grade articles that break down complex topics into sharp, readable insights." />
<link rel="canonical" href="https://ragadecode.com/" />
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

${regionHtml}

    
   ${homepageSectionHtml} 
    </div>
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
    console.log(
      `✅ index.html generated with ${API_CONFIGS.length} categories`
    );
  } catch (err) {
    console.error("❌ Failed to generate homepage:", err.message);
  }
})();
