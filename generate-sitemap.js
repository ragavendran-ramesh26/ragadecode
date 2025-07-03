const fs = require("fs-extra");
const path = require("path");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const BASE_URL = "https://ragadecode.com";

// Enhanced priority configuration
const PRIORITY = {
  HOME: 1.0,
  MAIN_CATEGORIES: 0.9,
  ARTICLES: 0.8,
  TAGS: 0.6,
  LOCATIONS: 0.5,
  LEGAL: 0.3
};

// API endpoints with improved pagination
const ENDPOINTS = [
  {
    name: "news",
    api: "https://genuine-compassion-eb21be0109.strapiapp.com/api/news-articles?pagination[pageSize]=100&sort[0]=publishedAt:desc&sort[1]=updatedAt:desc&populate[category]=true&populate[hashtags]=true",
    priority: PRIORITY.ARTICLES
  },
  {
    name: "categories",
    api: "https://genuine-compassion-eb21be0109.strapiapp.com/api/categories?pagination[pageSize]=100",
    priority: PRIORITY.MAIN_CATEGORIES
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

    // First fetch all categories to build our URL structure
    console.log("Fetching categories...");
    const categoriesRes = await fetch(ENDPOINTS.find(e => e.name === "categories").api);
    const categoriesData = await categoriesRes.json();
    const categories = categoriesData.data || [];

    // 2. Category pages
    for (const category of categories) {
      const attr = category.attributes || category;
      const categorySlug = attr.slug;
      if (!categorySlug) continue;

      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}/${categorySlug}</loc>\n`;
      xml += `    <lastmod>${formatDate(attr.updatedAt)}</lastmod>\n`;
      xml += `    <priority>${PRIORITY.MAIN_CATEGORIES}</priority>\n`;
      xml += `  </url>\n`;
    }

    // 3. Articles under their respective categories
    console.log("Fetching articles...");
    const articlesRes = await fetch(ENDPOINTS.find(e => e.name === "news").api);
    const articlesData = await articlesRes.json();
    const articles = articlesData.data || [];

    for (const article of articles) {
      const attr = article.attributes || article;
      const articleSlug = attr.slug;
      if (!articleSlug) continue;

      // Get category slug (handling both direct and populated category structures)
      const category = attr.category?.data?.attributes || attr.category?.attributes || attr.category;
      const categorySlug = category?.slug || "news-article"; // Default fallback

      xml += `  <url>\n`;
      xml += `    <loc>${BASE_URL}/${categorySlug}/${articleSlug}</loc>\n`;
      xml += `    <lastmod>${formatDate(attr.publishedAt || attr.updatedAt)}</lastmod>\n`;
      xml += `    <priority>${PRIORITY.ARTICLES}</priority>\n`;
      xml += `  </url>\n`;
    }

    // 4. Tags
    console.log("Fetching tags...");
    const tagsRes = await fetch("https://genuine-compassion-eb21be0109.strapiapp.com/api/hashtags?pagination[pageSize]=1000");
    const tagsData = await tagsRes.json();
    
    for (const tag of tagsData.data || []) {
      const attr = tag.attributes || tag;
      const tagName = attr.name;
      if (!tagName) continue;

      const tagSlug = tagName.toLowerCase().replace(/\s+/g, "-");
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
      "https://genuine-compassion-eb21be0109.strapiapp.com/api/countries?populate[states][populate][cities]=true&pagination[pageSize]=1000"
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