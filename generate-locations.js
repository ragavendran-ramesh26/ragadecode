const fs = require("fs-extra");
const path = require("path");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const BASE_DOMAIN = "ragadecode.com";
const BASE_URL = `https://${BASE_DOMAIN}`;

const TEMPLATE_PATH = "./locations_template.html";
const OUTPUT_DIR = "./locations";

const COUNTRY_API = `https://genuine-compassion-eb21be0109.strapiapp.com/api/countries?populate[news_articles][populate]=coverimage&populate[news_articles][sort][0]=publishedat:desc&populate[tourism_travel_trips][populate]=coverimage&populate[tourism_travel_trips][sort][0]=publishedat:desc&populate[news_articles][populate][1]=category`;
const STATE_API = `https://genuine-compassion-eb21be0109.strapiapp.com/api/states?populate[news_articles][populate]=coverimage&populate[news_articles][sort][0]=publishedat:desc&populate[tourism_travel_trips][populate]=coverimage&populate[tourism_travel_trips][sort][0]=publishedat:desc&populate=country&populate[news_articles][populate][1]=category`;
const CITY_API = `https://genuine-compassion-eb21be0109.strapiapp.com/api/cities?populate[news_articles][populate]=coverimage&populate[news_articles][sort][0]=publishedat:desc&populate[tourism_travel_trips][populate]=coverimage&populate[tourism_travel_trips][sort][0]=publishedat:desc&populate[state][populate]=country&populate[news_articles][populate][1]=category`;

(async () => {
  try {
    const analyticsScript = `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-QEL34RBXBH"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-QEL34RBXBH');
</script>
`;

    const template = await fs.readFile(TEMPLATE_PATH, "utf8");
    const [countryRes, stateRes, cityRes] = await Promise.all([
      fetch(COUNTRY_API),
      fetch(STATE_API),
      fetch(CITY_API),
    ]);

    const countries = (await countryRes.json()).data;
    const states = (await stateRes.json()).data;
    const cities = (await cityRes.json()).data;

    // Map states to countries
    const countryMap = {};
    countries.forEach((c) => {
      const attrs = c;
      countryMap[attrs.id] = attrs;
    });

    // Map cities to states
    const stateMap = {};
    states.forEach((s) => {
      stateMap[s.id] = { ...s, cities: [] };
    });

    cities.forEach((city) => {
      const stateId = city?.state?.id || city?.state?.data?.id;
      if (stateMap[stateId]) {
        stateMap[stateId].cities.push(city);
      }
    });

    // const renderArticleBlock = (article) => {


    //   const a = article.attributes || article;

       
    //   const title = a.Title || "Untitled";
    //   const slug = a.slug || "#";
    //   const image = a.coverimage?.formats?.thumbnail?.url || "/assets/default-image.png";
    //   const category = a.category?.name;
    //   const categorySlug = a.category?.slug;

    //   const articleUrl = `/${categorySlug}/${slug}`;

    //   return `
    //     <div class="card">
    //       <a href="${articleUrl}">
    //         <img src="${image}" alt="${title}" loading="lazy" />
    //         <div class="card-content">
    //           <h3>${title}</h3>
    //         </div>
    //       </a>
    //     </div>`;
    // };


    function renderCompactItem(article) {
  const a = article.attributes || article;
  const title = a.Title || "Untitled";
  const slug = a.slug || "#";
  const publishedRaw = a.publishedAt || a.publishedat || a.createdAt;
  const published = new Date(publishedRaw).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const image = a.coverimage?.data?.attributes?.formats?.thumbnail?.url ||
                a.coverimage?.formats?.thumbnail?.url ||
                a.coverimage?.url ||
                "/assets/default-image.png";
  const categoryName = a.category?.data?.attributes?.name || a.category?.name || "News";
  const categorySlug = a.category?.data?.attributes?.slug || a.category?.slug || "news-article";
  const articleUrl = `/${categorySlug}/${slug}`;

  return `
    <div class="compact-item">
  
      <img src="${image}" class="compact-thumb" alt="${title}" />
      
      <div class="compact-text">
        
        <a href="${articleUrl}">${title}</a>
        <div class="compact-date">${categoryName} | Published on ${published}</div>
       
        
      </div>
    </div>`;
}

    const buildPage = async (slugPath, name, newsArticles = [], travelArticles = []) => {
     const newsBlockHtml = newsArticles.length > 0
  ? `<div class="column full-width">
      <h2>${name}</h2> 

      <div class="two-column-compact">
     
        <div class="compact-column">
          ${newsArticles
            .filter((_, i) => i % 2 === 0)
            .map(renderCompactItem)
            .join("\n")}
        </div>
        <div class="compact-column">
       
           ${newsArticles
            .filter((_, i) => i % 2 !== 0)
            .map(renderCompactItem)
            .join("\n")}
        </div>
      </div>
    </div>`
  : "";

      const headerHtml = fs.readFileSync(path.join(__dirname, "partials/header.html"), "utf-8");
      const footerHtml = fs.readFileSync(path.join(__dirname, "partials/footer.html"), "utf-8");

      const pageHtml = template
        .replace(/{{COUNTRY_NAME}}/g, name)
        .replace(/{{COUNTRY_SLUG}}/g, slugPath)
        .replace(/{{CANONICAL_PATH}}/g, `${slugPath}`)
        .replace(/{{NEWS_BLOCK_SECTION}}/g, newsBlockHtml)
        .replace(/{{GA_SCRIPT}}/g, analyticsScript)
        .replace(/{{HEADER}}/g, headerHtml)
        .replace(/{{FOOTER}}/g, footerHtml)
        .replace(/{{BASE_DOMAIN}}/g, BASE_URL)

      const outputPath = path.join(OUTPUT_DIR, `${slugPath}.html`);
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, pageHtml);
      console.log(`✅ Generated: ${slugPath}.html`);
    };

    // Generate all
    for (const country of countries) {
      const countryId = country.id;
      const countryName = country.title;
      const countrySlug = country.slug;

      const newsArticles = country.news_articles || [];
      const travelArticles = country.tourism_travel_trips || [];

      await buildPage(countrySlug, countryName, newsArticles, travelArticles);

      // Filter related states
      const relatedStates = states.filter((s) => s.country?.id === countryId);
      for (const state of relatedStates) {
        const stateName = state.title;
        const stateSlug = state.slug;
        await buildPage(`${countrySlug}/${stateSlug}`, stateName, state.news_articles, state.tourism_travel_trips);

        // Filter related cities
        const stateCities = stateMap[state.id]?.cities || [];
        for (const city of stateCities) {
          const cityName = city.title;
          const citySlug = city.slug;
          await buildPage(`${countrySlug}/${stateSlug}/${citySlug}`, cityName, city.news_articles, city.tourism_travel_trips);
        }
      }
    }

    console.log("🎉 All location pages generated.");
  } catch (err) {
    console.error("❌ Failed to generate pages:", err.message);
  }
})();
