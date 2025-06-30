const fs = require("fs-extra");
const path = require("path");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const BASE_URL = "https://ragadecode.com";

// Enhanced priority configuration
const PRIORITY = {
  HOME: 1.0,
  MAIN_SECTIONS: 0.8,
  ARTICLES: 0.7,
  TAGS: 0.3,
  LOCATIONS: 0.5,
  LEGAL: 0.2
};

// Main sections that need manual entries
const MANUAL_PAGES = [
  "decode-automobile-talks",
  "news-article", 
  "technologies",
  "tourism-travel-trips",
];

// API endpoints with improved pagination
const ENDPOINTS = [
  {
    name: "news",
    api: "https://genuine-compassion-eb21be0109.strapiapp.com/api/news-articles?pagination[pageSize]=100&sort[0]=publishedAt:desc&sort[1]=updatedAt:desc",
    path: "news-article",
    priority: PRIORITY.ARTICLES
  },
  {
    name: "automobiles",
    api: "https://genuine-compassion-eb21be0109.strapiapp.com/api/automobiles?pagination[pageSize]=50",
    path: "automobile",
    priority: PRIORITY.ARTICLES
  },
  {
    name: "travel",
    api: "https://genuine-compassion-eb21be0109.strapiapp.com/api/tourism-travel-trips?pagination[pageSize]=50",
    path: "tourism-travel-trips",
    priority: PRIORITY.ARTICLES
  },
  {
    name: "technologies",
    api: "https://genuine-compassion-eb21be0109.strapiapp.com/api/technologies?pagination[pageSize]=50",
    path: "technologies",
    priority: PRIORITY.ARTICLES
  }
];

// Helper function to format dates
const formatDate = (dateString) => {
  return dateString ? new Date(dateString).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
};

async function fetchAllPages(endpointUrl) {
  let allData = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    try {
      const res = await fetch(`${endpointUrl}&pagination[page]=${page}`);
      const { data, meta } = await res.json();
      
      if (data && data.length > 0) {
        allData = [...allData, ...data];
        page++;
        hasMore = page <= meta.pagination.pageCount;
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      hasMore = false;
    }
  }

  return allData;
}

async function generateSitemap() {
  try {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // 1. Homepage (highest priority)
    xml += `  <url>\n`;
    xml += `    <loc>${BASE_URL}/</loc>\n`;
    xml += `    <priority>${PRIORITY.HOME}</priority>\n`;
    xml += `    <lastmod>${formatDate()}</lastmod>\n`;
    xml += `  </url>\n`;

    // 2. Main category pages
    for (const pagePath of MANUAL_PAGES) {
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}/${pagePath}</loc>\n`;
      xml += `    <priority>${PRIORITY.MAIN_SECTIONS}</priority>\n`;
      xml += `    <lastmod>${formatDate()}</lastmod>\n`;
      xml += `  </url>\n`;
    }

    // 3. Dynamic content (articles, tags, etc.)
    for (const { name, api, path, priority } of ENDPOINTS) {
      console.log(`Fetching ${name} content...`);
      const data = await fetchAllPages(api);
      console.log(`Found ${data.length} ${name} entries`);

      for (const item of data) {
        const attr = item.attributes || item;
        const slug = attr.slug;
        if (!slug) continue;

        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/${path}/${encodeURIComponent(slug)}</loc>\n`;
        xml += `    <lastmod>${formatDate(attr.publishedAt || attr.updatedAt)}</lastmod>\n`;
        xml += `    <priority>${priority}</priority>\n`;
        xml += `  </url>\n`;
      }
    }

    // 4. Tags (special handling)
    console.log("Fetching tags...");
    const tagsRes = await fetch("https://genuine-compassion-eb21be0109.strapiapp.com/api/hashtags?pagination[pageSize]=100");
    const tagsData = await tagsRes.json();
    
    for (const tag of tagsData.data || []) {
      const attr = tag.attributes || tag;
      const tagSlug = attr.name;
      if (!tagSlug || tagSlug.includes(' ')) continue;

      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}/tags/${encodeURIComponent(tagSlug)}</loc>\n`;
      xml += `    <lastmod>${formatDate(attr.updatedAt)}</lastmod>\n`;
      xml += `    <priority>${PRIORITY.TAGS}</priority>\n`;
      xml += `  </url>\n`;
    }

    // 5. Static pages
    console.log("Fetching static pages...");
    const staticRes = await fetch("https://genuine-compassion-eb21be0109.strapiapp.com/api/static-pages?pagination[pageSize]=20");
    const staticData = await staticRes.json();
    
    for (const page of staticData.data || []) {
      const attr = page.attributes || page;
      const pageSlug = attr.slug;
      if (!pageSlug) continue;

      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}/static-pages/${pageSlug}</loc>\n`;
      xml += `    <lastmod>${formatDate(attr.updatedAt)}</lastmod>\n`;
      xml += `    <priority>${PRIORITY.LEGAL}</priority>\n`;
      xml += `  </url>\n`;
    }

    // 6. Location hierarchy
    console.log("Fetching locations...");
    const locationsRes = await fetch(
      "https://genuine-compassion-eb21be0109.strapiapp.com/api/countries?populate[states][populate][cities]=true&pagination[pageSize]=50"
    );
    const locationsData = await locationsRes.json();

    for (const country of locationsData.data || []) {
      const c = country.attributes || country;
      const countrySlug = c.slug;
      if (!countrySlug) continue;

      // Country level
      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}/locations/${countrySlug}</loc>\n`;
      xml += `    <priority>${PRIORITY.LOCATIONS}</priority>\n`;
      xml += `    <lastmod>${formatDate(c.updatedAt)}</lastmod>\n`;
      xml += `  </url>\n`;

      // State level
      for (const state of c.states?.data || []) {
        const s = state.attributes || state;
        const stateSlug = s.slug;
        if (!stateSlug) continue;

        xml += `  <url>\n`;
        xml += `    <loc>${BASE_URL}/locations/${countrySlug}/${stateSlug}</loc>\n`;
        xml += `    <priority>${PRIORITY.LOCATIONS - 0.1}</priority>\n`;
        xml += `    <lastmod>${formatDate(s.updatedAt)}</lastmod>\n`;
        xml += `  </url>\n`;

        // City level
        for (const city of s.cities?.data || []) {
          const cityAttr = city.attributes || city;
          const citySlug = cityAttr.slug;
          if (!citySlug) continue;

          xml += `  <url>\n`;
          xml += `    <loc>${BASE_URL}/locations/${countrySlug}/${stateSlug}/${citySlug}</loc>\n`;
          xml += `    <priority>${PRIORITY.LOCATIONS - 0.2}</priority>\n`;
          xml += `    <lastmod>${formatDate(cityAttr.updatedAt)}</lastmod>\n`;
          xml += `  </url>\n`;
        }
      }
    }

    xml += `</urlset>`;

    await fs.outputFile("sitemap.xml", xml);
    console.log("✅ Sitemap generated successfully!");
    console.log(`ℹ️ Total URLs: ${xml.split('<url>').length - 1}`);

  } catch (err) {
    console.error("❌ Sitemap generation failed:", err);
    process.exit(1);
  }
}

// Generate sitemap immediately when run
generateSitemap();