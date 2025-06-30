const fs = require("fs-extra");
const path = require("path");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const baseUrl = "https://ragadecode.com";

// Priority configuration
const PRIORITY = {
  HOME: 1.0,
  MAIN_SECTIONS: 0.8,
  ARTICLES: 0.7,
  TAGS: 0.3,
  LOCATIONS: 0.5,
  LEGAL: 0.2
};

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
    priority: PRIORITY.ARTICLES
  },
  {
    api: "https://genuine-compassion-eb21be0109.strapiapp.com/api/automobiles?sort[0]=id:desc",
    section: "automobile",
    priority: PRIORITY.ARTICLES
  },
  {
    api: "https://genuine-compassion-eb21be0109.strapiapp.com/api/tourism-travel-trips?sort[0]=id:desc",
    section: "tourism-travel-trips",
    priority: PRIORITY.ARTICLES
  },
  {
    api: "https://genuine-compassion-eb21be0109.strapiapp.com/api/hashtags?sort[0]=id:desc",
    section: "tags",
    priority: PRIORITY.TAGS
  },
  {
    api: "https://genuine-compassion-eb21be0109.strapiapp.com/api/technologies?sort[0]=id:desc",
    section: "technologies",
    priority: PRIORITY.ARTICLES
  },
  {
    api: "https://genuine-compassion-eb21be0109.strapiapp.com/api/static-pages?sort[0]=id:desc",
    section: "static-pages",
    priority: PRIORITY.LEGAL
  }
];

async function generateSitemap() {
  try {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // 1. Homepage
    xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <priority>${PRIORITY.HOME}</priority>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n  </url>\n`;

    // 2. Manual Pages (Categories)
    for (const pagePath of manualPages) {
      const cleaned = pagePath.replace(/^\/+/, '');
      const fullUrl = `${baseUrl}/${cleaned}`.replace(/\/+$/, '');

      xml += `  <url>\n`;
      xml += `    <loc>${fullUrl}</loc>\n`;
      xml += `    <priority>${PRIORITY.MAIN_SECTIONS}</priority>\n`;
      xml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
      xml += `  </url>\n`;
    }

    // 3. Dynamic Content
    for (const { api, section, priority } of endpoints) {
      const res = await fetch(api);
      const { data } = await res.json();

      for (const item of data) {
        const attr = item.attributes || item;
        const slug = section === "tags" ? attr.name : attr.slug;
        if (!slug) continue;

        const date = new Date(attr.publishedat || attr.publishedAt || attr.updatedAt || new Date())
          .toISOString()
          .split('T')[0];

        // Skip tag pages if they're not properly formatted
        if (section === "tags" && slug.includes(' ')) continue;

        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/${section}/${encodeURIComponent(slug)}</loc>\n`;
        xml += `    <lastmod>${date}</lastmod>\n`;
        xml += `    <priority>${priority}</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    // 4. Location Pages (Optimized)
    const locationRes = await fetch(
      "https://genuine-compassion-eb21be0109.strapiapp.com/api/countries?populate[states][populate][cities]=true"
    );
    const locationData = await locationRes.json();

    for (const country of locationData.data || []) {
      const c = country.attributes || country;
      const countrySlug = c.slug;
      if (!countrySlug) continue;

      // Country level
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/locations/${countrySlug}</loc>\n`;
      xml += `    <priority>${PRIORITY.LOCATIONS}</priority>\n`;
      xml += `  </url>\n`;

      // State level
      for (const state of c.states?.data || []) {
        const s = state.attributes || state;
        const stateSlug = s.slug;
        if (!stateSlug) continue;

        xml += `  <url>\n`;
        xml += `    <loc>${baseUrl}/locations/${countrySlug}/${stateSlug}</loc>\n`;
        xml += `    <priority>${PRIORITY.LOCATIONS - 0.1}</priority>\n`;
        xml += `  </url>\n`;

        // City level
        for (const city of s.cities?.data || []) {
          const citySlug = city.attributes?.slug || city.slug;
          if (!citySlug) continue;

          xml += `  <url>\n`;
          xml += `    <loc>${baseUrl}/locations/${countrySlug}/${stateSlug}/${citySlug}</loc>\n`;
          xml += `    <priority>${PRIORITY.LOCATIONS - 0.2}</priority>\n`;
          xml += `  </url>\n`;
        }
      }
    }

    xml += `</urlset>`;

    await fs.outputFile(path.join(__dirname, "sitemap.xml"), xml);
    console.log("✅ Sitemap generated with SEO optimizations");
    
    // Generate sitemap index if needed (for large sites)
    if (xml.length > 50000) { // Rough estimate for multiple sitemaps
      await generateSitemapIndex();
    }
  } catch (err) {
    console.error("❌ Sitemap generation failed:", err);
  }
}

async function generateSitemapIndex() {
  const sitemaps = [
    'posts-sitemap.xml',
    'pages-sitemap.xml',
    'locations-sitemap.xml'
  ];

  let indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  indexXml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
  
  for (const sitemap of sitemaps) {
    indexXml += `  <sitemap>\n`;
    indexXml += `    <loc>${baseUrl}/${sitemap}</loc>\n`;
    indexXml += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
    indexXml += `  </sitemap>\n`;
  }
  
  indexXml += `</sitemapindex>`;
  await fs.outputFile(path.join(__dirname, "sitemap_index.xml"), indexXml);
}

generateSitemap();