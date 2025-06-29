const fs = require("fs-extra");
const path = require("path");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const BASE_DOMAIN = "ragadecode.com";
const BASE_URL = `https://${BASE_DOMAIN}`;

const TEMPLATE_PATH = "./locations_template.html";
const OUTPUT_DIR = "./locations";

const COUNTRY_API = `https://genuine-compassion-eb21be0109.strapiapp.com/api/countries?populate[news_articles][populate]=coverimage&populate[news_articles][sort][0]=publishedat:desc&populate[tourism_travel_trips][populate]=coverimage&populate[tourism_travel_trips][sort][0]=publishedat:desc`;
const STATE_API = `https://genuine-compassion-eb21be0109.strapiapp.com/api/states?populate[news_articles][populate]=coverimage&populate[news_articles][sort][0]=publishedat:desc&populate[tourism_travel_trips][populate]=coverimage&populate[tourism_travel_trips][sort][0]=publishedat:desc&populate=country`;
const CITY_API = `https://genuine-compassion-eb21be0109.strapiapp.com/api/cities?populate[news_articles][populate]=coverimage&populate[news_articles][sort][0]=publishedat:desc&populate[tourism_travel_trips][populate]=coverimage&populate[tourism_travel_trips][sort][0]=publishedat:desc&populate[state][populate]=country`;

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

    const renderArticleBlock = (article) => {
      const a = article.attributes || article;
      const title = a.Title || "Untitled";
      const slug = a.slug || "#";
      const image = a.coverimage?.formats?.thumbnail?.url || "/assets/default-image.png";
      const category = a.category?.toLowerCase().replace(/\s+/g, "-") || "news-article";

      return `
        <div class="card">
          <a href="/${category}/${slug}">
            <img src="${image}" alt="${title}" loading="lazy" />
            <div class="card-content">
              <h3>${title}</h3>
            </div>
          </a>
        </div>`;
    };

    const buildPage = async (slugPath, name, newsArticles = [], travelArticles = []) => {
      const newsBlockHtml = newsArticles.length > 0
        ? `<div class="column${travelArticles.length === 0 ? " full-width" : ""}">
            <h2>Latest News from ${name}</h2>
            <div class="card-grid ${travelArticles.length === 0 ? "grid-4" : ""}">
              ${newsArticles.map(renderArticleBlock).join("\n")}
            </div>
          </div>` : "";

      const travelBlockHtml = travelArticles.length > 0
        ? `<div class="column">
            <h2>Travel Guides</h2>
            <div class="card-grid">
              ${travelArticles.map(renderArticleBlock).join("\n")}
            </div>
          </div>` : "";

      const pageHtml = template
        .replace(/{{COUNTRY_NAME}}/g, name)
        .replace(/{{COUNTRY_SLUG}}/g, slugPath)
        .replace(/{{CANONICAL_PATH}}/g, `${slugPath}`)
        .replace(/{{NEWS_BLOCK_SECTION}}/g, newsBlockHtml)
        .replace(/{{GA_SCRIPT}}/g, analyticsScript)
        .replace(/{{BASE_DOMAIN}}/g, BASE_URL)
        .replace(/{{TRAVEL_BLOCK_SECTION}}/g, travelBlockHtml);

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
