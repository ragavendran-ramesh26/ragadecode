const fs = require("fs-extra");
const path = require("path");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const baseUrl = "https://ragadecode.com";

const manualPages = [
  "decode-automobile-talks",
  "news-article",
  "technologies",
  "tourism-travel-trips",
];

const endpoints = [
  {
    api: "https://genuine-compassion-eb21be0109.strapiapp.com/api/news-articles?sort[0]=id:desc",
    section: "news-article",
  },
  {
    api: "https://genuine-compassion-eb21be0109.strapiapp.com/api/automobiles?sort[0]=id:desc",
    section: "automobile",
  },
  {
    api: "https://genuine-compassion-eb21be0109.strapiapp.com/api/tourism-travel-trips?sort[0]=id:desc",
    section: "tourism-travel-trips",
  },
  {
    api: "https://genuine-compassion-eb21be0109.strapiapp.com/api/hashtags?sort[0]=id:desc",
    section: "tags",
  },
  {
    api: "https://genuine-compassion-eb21be0109.strapiapp.com/api/technologies?sort[0]=id:desc",
    section: "technologies",
  },
  {
    api: "https://genuine-compassion-eb21be0109.strapiapp.com/api/static-pages?sort[0]=id:desc",
    section: "static-pages",
  },
];

(async () => {
  try {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Add homepage
    xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <priority>1.0</priority>\n  </url>\n`;

    // Add manual pages
    for (const pagePath of manualPages) {
      const cleaned = pagePath.replace(/^\/+/, "");
      const fullUrl = `${baseUrl}/${cleaned}`.replace(/\/+$/, "");

      xml += `  <url>\n`;
      xml += `    <loc>${fullUrl}</loc>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

    // Add dynamic endpoints
    for (const { api, section } of endpoints) {
      const res = await fetch(api);
      const { data } = await res.json();

      for (const article of data) {
        const attr = article.attributes || article;

        let slug;
        if (section === "tags") {
          slug = attr.name || "";
        } else {
          slug = attr.slug || "";
        }

        if (!slug) continue;

        const date = new Date(attr.publishedAt || attr.updatedAt || new Date())
          .toISOString()
          .split("T")[0];

        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/${section}/${slug}</loc>\n`;
        xml += `    <lastmod>${date}</lastmod>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    // Add nested country → state → city pages under /locations
const locationRes = await fetch(
  "https://genuine-compassion-eb21be0109.strapiapp.com/api/countries?populate[states][populate][cities]=true"
);
const locationJson = await locationRes.json();

for (const country of locationJson.data) {
  const c = country.attributes || country;
  const countrySlug = c.slug;

  // Country page
  if (countrySlug) {
    xml += `  <url>\n`;
    xml += `    <loc>${baseUrl}/locations/${countrySlug}</loc>\n`;
    xml += `    <priority>0.8</priority>\n`;
    xml += `  </url>\n`;
  }

  for (const state of c.states || []) {
    const s = state;
    const stateSlug = s.slug;

    // State page
    if (countrySlug && stateSlug) {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/locations/${countrySlug}/${stateSlug}</loc>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

    for (const city of s.cities || []) {
      const citySlug = city.slug;

      // City page
      if (countrySlug && stateSlug && citySlug) {
        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/locations/${countrySlug}/${stateSlug}/${citySlug}</loc>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      }
    }
  }
}

    xml += `</urlset>`;

    await fs.outputFile(path.join(__dirname, "sitemap.xml"), xml);
    console.log("✅ sitemap.xml generated with all sections including locations");
  } catch (err) {
    console.error("❌ Error generating sitemap:", err);
  }
})();
