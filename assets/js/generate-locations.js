const fs = require("fs-extra");
const path = require("path");
const fetch = require('../../assets/js/api-client');
const marked = require('marked');

const BASE_DOMAIN = "ragadecode.com";
const BASE_URL = `https://${BASE_DOMAIN}`;

 
const TEMPLATE_PATH = path.join(__dirname, "../../templates/locations_template.html");
const OUTPUT_DIR = path.join(__dirname, "../../locations");
const headerHtml = fs.readFileSync(path.join(__dirname, "../../templates/header.html"), "utf-8");
const footerHtml = fs.readFileSync(path.join(__dirname, "../../templates/footer.html"), "utf-8");
const API_CONFIG= require("../../assets/js/api-config");

const COUNTRY_API = API_CONFIG.COUNTRY_PAGE_API;
const STATE_API = API_CONFIG.STATE_PAGE_API;
const CITY_API = API_CONFIG.CITY_PAGE_API;

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

    // console.log("🌐 Fetching data from API endpoints...");
    // console.log(`➡️ COUNTRY_API: ${COUNTRY_API}`);
    // console.log(`➡️ STATE_API:   ${STATE_API}`);
    // console.log(`➡️ CITY_API:    ${CITY_API}`);

    const [countryJson, stateJson, cityJson] = await Promise.all([
  fetch(COUNTRY_API).catch(err => {
    throw new Error(`❌ Failed to fetch countries: ${err.message}`);
  }),
  fetch(STATE_API).catch(err => {
    throw new Error(`❌ Failed to fetch states: ${err.message}`);
  }),
  fetch(CITY_API).catch(err => {
    throw new Error(`❌ Failed to fetch cities: ${err.message}`);
  }),
]);

// ✅ Now validate the response
if (!countryJson?.data || !Array.isArray(countryJson.data)) {
  throw new Error(`Invalid country data format from ${COUNTRY_API}`);
}
if (!stateJson?.data || !Array.isArray(stateJson.data)) {
  throw new Error(`Invalid state data format from ${STATE_API}`);
}
if (!cityJson?.data || !Array.isArray(cityJson.data)) {
  throw new Error(`Invalid city data format from ${CITY_API}`);
}

const countries = countryJson.data;
const states = stateJson.data;
const cities = cityJson.data;

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
  const authorName = a.author?.name || "Unknown";
  const short_description = a.short_description || "";

  return `
    <div class="col-md-6 article-block">
      <div class="border-bottom d-flex flex-column justify-content-between h-100 w-100">
      <div>
        <div class="d-flex gap-3">
          <img 
            src="${image}" 
            class="rounded flex-shrink-0" 
            style="width: 100px; height: 75px; object-fit: cover;" 
            alt="${title}" 
          />
          <div class="flex-grow-1">
            <h6 class="mb-1 fw-semibold">
              <a href="${articleUrl}" class="text-dark text-decoration-none">${title}</a>
            </h6>
            <small class="text-muted d-block mb-1">
              ${authorName ? `${authorName} • ` : ''}${categoryName} • Published on ${published}
            </small>
          </div>
        </div>
        <p class="mt-2 text-secondary small">${short_description}</p>
      </div>
      </div>
    </div>`;
}


function generateNewsBlockSection(articles) {
  let html = "";
  let adCount = 0;

  articles.forEach((article, index) => {
    html += renderCompactItem(article);

    // Inject ad after every 4th article, max 3 ads, and only for first 12 articles
    if ((index + 1) % 4 === 0 && index < 16 && adCount < 4) {
      adCount++; // Increment first to get 1-based index
      html += `
        <div class="col-12 ad-placeholder">
          <div id="affiliate-${adCount}-rectangle"></div>
        </div>
      `;
    }
  });

  return html;
}




      function getEntityId(entity) {
        return entity?.id || entity?.data?.id || null;
      }

    const buildPage = async (slugPath, name, newsArticles = [], desc , shortdesc, seoTitle, travelArticles = []) => {
       

     markedDescription = marked.parse(desc || '');
    //  const newsBlockHtml = newsArticles.map(renderCompactItem).join('');

     const newsBlockHtml = generateNewsBlockSection(newsArticles);

     const shortDesc_SEO_Desc = shortdesc || `Explore the latest decoded news and travel insights from ${name}. Curated by RagaDecode for curious minds.`;
     
     const seo_title = seoTitle || `Decoded articles curated from across ${name} | RagaDecode`
    

      const pageHtml = template
        .replace(/{{COUNTRY_NAME}}/g, name)
        .replace(/{{COUNTRY_SLUG}}/g, slugPath)
        .replace(/{{LOCATION_DESC}}/g, markedDescription)
        .replace(/{{SEO_TITLE}}/g, seo_title)
        .replace(/{{LOCATION_SHORT_DESC}}/g, shortDesc_SEO_Desc) 
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


    console.log("🚀 Starting location page generation...");

    // Generate all
    for (const country of countries) {
      const countryId = country.id;
      const countryName = country.title;
      const countrySlug = country.slug;
      const countryDesc = country.Description_in_detail;
      const countryShortDesc = country.short_description;

      const newsArticles = country.news_articles || [];
      const travelArticles = country.tourism_travel_trips || [];
      const desc = countryDesc;
      const shortdesc = countryShortDesc;
      const seoTitle = '';

      await buildPage(countrySlug, countryName, newsArticles, desc, shortdesc, seoTitle, travelArticles);
      console.log(`🌍 Country page generated: /locations/${countrySlug}.html`);

      // Filter related states
      const relatedStates = states.filter(
        (s) => getEntityId(s.country) === country.id
      );
      for (const state of relatedStates) {
        const stateName = state.title;
        const stateSlug = state.slug;
        const desc = state.Description_in_detail;
        const shortdesc = state.short_description;
        const seoTitle = state.seo_title;

        await buildPage(`${countrySlug}/${stateSlug}`, stateName, state.news_articles, desc, shortdesc, seoTitle, state.tourism_travel_trips);
        console.log(`  🏙️ State page generated: /locations/${countrySlug}/${stateSlug}.html`);

        // Filter related cities
        const stateCities = cities.filter(
          (c) => getEntityId(c.state) === state.id
        );
        for (const city of stateCities) { 
          const cityName = city.title;
          const citySlug = city.slug; 
          const cityDescription = city.Description_in_detail;
          const shortdesc = city.short_description;
          const seoTitle = city.seo_title;

          await buildPage(`${countrySlug}/${stateSlug}/${citySlug}`, cityName, city.news_articles, cityDescription, shortdesc, seoTitle, city.tourism_travel_trips);
          console.log(`    🏘️ City page generated: /locations/${countrySlug}/${stateSlug}/${citySlug}.html`);
        }

        if (stateCities.length === 0) {
          console.log(`    ⚠️ No cities found for state: ${stateName}`);
        }
      }

      if (relatedStates.length === 0) {
          console.warn(`  ⚠️ No states found for country: ${countryName} (ID: ${countryId})`);

          const problematicStates = states.filter(s =>
            s.country === null ||
            (typeof s.country === 'object' && !('id' in s.country) && !('data' in s.country))
          );

          problematicStates.forEach(ps => {
            console.warn(`    ⚠️ Skipped state: ${ps.title} — missing or invalid country reference`);
          });
        }
    }

    console.log("✅ All country, state, and city location pages generated successfully.");
  } catch (err) {
    console.error("❌ Failed to generate pages:", err.message);
  }
})();
