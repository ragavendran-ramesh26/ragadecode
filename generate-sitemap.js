const fs = require("fs-extra");
const path = require("path");
const fetch = require('./assets/js/api-client'); // Custom fetchWithAuth
const { stat } = require("fs");

const BASE_URL = "https://ragadecode.com";

// Priority levels
const PRIORITY = {
  HOME: 1.0,
  MAIN_CATEGORIES: 0.9,
  ARTICLES: 0.8,
  TAGS: 0.6,
  LOCATIONS: 0.5,
  LEGAL: 0.3
};

// Normalize URL: remove trailing slashes
const normalizeUrl = (url) => url.replace(/\/+$/, "");

// Format date as YYYY-MM-DD
const formatDate = (dateString) =>
  dateString
    ? new Date(dateString).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

// Define endpoints
const ENDPOINTS = [
  {
    name: "news",
    api: "https://api.ragadecode.com/api/news-articles",
    priority: PRIORITY.ARTICLES
  },
  {
    name: "categories",
    api: "https://api.ragadecode.com/api/categories",
    priority: PRIORITY.MAIN_CATEGORIES
  }
];

async function generateSitemap() {
  try {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    const addedUrls = new Set(); // To avoid duplicates

    // Helper to add unique URLs
    const addUrl = (url, priority, lastmod) => {
      const normalized = normalizeUrl(url);
      if (addedUrls.has(normalized)) return;
      addedUrls.add(normalized);
      xml += `  <url>\n`;
      xml += `    <loc>${normalized}</loc>\n`;
      xml += `    <priority>${priority}</priority>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `  </url>\n`;
    };

    // 1. Homepage
    addUrl(`${BASE_URL}/`, PRIORITY.HOME, formatDate());

    // 2. Categories
    console.log("Fetching categories...");
    const categoryEndpoint = ENDPOINTS.find(e => e.name === "categories");
    const categoriesRaw = await fetch(categoryEndpoint.api);
    const categoriesData = categoriesRaw.data || [];

    for (const category of categoriesData) {
      const attr = category.attributes || category;
      const slug = attr.slug;
      if (!slug) continue;
      addUrl(`${BASE_URL}/${slug}`, PRIORITY.MAIN_CATEGORIES, formatDate(attr.updatedAt));
    }

    // 3. Articles
    console.log("Fetching articles...");
    const newsEndpoint = ENDPOINTS.find(e => e.name === "news");
    const articlesData = await fetch(newsEndpoint.api);
    const articles = articlesData.data || [];

    for (const article of articles) {
      const attr = article.attributes || article;
      const slug = attr.slug;
      if (!slug) continue;

      const category = attr.category?.data?.attributes || attr.category?.attributes || attr.category;
      const categorySlug = category?.slug || "news-article";
      const url = `${BASE_URL}/${categorySlug}/${slug}`;
      addUrl(url, PRIORITY.ARTICLES, formatDate(attr.publishedAt || attr.updatedAt));
    }

    // 4. Tags
    console.log("Fetching tags...");
    const tagsData = await fetch("https://api.ragadecode.com/api/hashtags");
    const tags = tagsData.data || [];

    for (const tag of tags) {
      const attr = tag.attributes || tag;
      const name = attr.name;
      if (!name) continue;
      const slug = name.toLowerCase().replace(/\s+/g, "-");
      addUrl(`${BASE_URL}/tags/${encodeURIComponent(slug)}`, PRIORITY.TAGS, formatDate(attr.updatedAt));
    }

    // 5. Static pages
    console.log("Fetching static pages...");
    const staticData = await fetch("https://api.ragadecode.com/api/static-pages");
    const pages = staticData.data || [];

    for (const page of pages) {
      const attr = page.attributes || page;
      const slug = attr.slug;
      if (!slug) continue;
      addUrl(`${BASE_URL}/static-pages/${slug}`, PRIORITY.LEGAL, formatDate(attr.updatedAt));
    }

    // 6. Metals & currency
    console.log("Adding metal & currency pages...");
    const staticPages = [
      "today-gold-price",
      "today-silver-price",
      "today-platinum-price",
      "today-currency-conversion-rate"
    ];

    for (const slug of staticPages) {
      addUrl(`${BASE_URL}/${slug}`, PRIORITY.MAIN_CATEGORIES, formatDate());
    }

    // 7. Locations (Country > State > City)
    console.log("Fetching locations...");
    const { data: cities } = await fetch(
      "https://api.ragadecode.com/api/cities?populate[state]=true&populate[country]=true"
    );

    const addedCountries = new Set();
    const addedStates = new Set();

    for (const city of cities || []) {
      const citySlug = city.slug;
      const cityUpdatedAt = city.updated_at || city.updatedAt;

      const state = city.state || {};
      const stateSlug = state.slug;
      const stateUpdatedAt = state.updated_at || state.updatedAt;

      const country = city.country || {};
      const countrySlug = country.slug;
      const countryUpdatedAt = country.updated_at || country.updatedAt;

      if (!citySlug || !stateSlug || !countrySlug) continue;

      const countryKey = countrySlug;
      const stateKey = `${countrySlug}/${stateSlug}`;

      if (!addedCountries.has(countryKey)) {
        addUrl(`${BASE_URL}/locations/${countrySlug}`, 0.5, formatDate(countryUpdatedAt));
        addedCountries.add(countryKey);
      }

      if (!addedStates.has(stateKey)) {
        addUrl(`${BASE_URL}/locations/${countrySlug}/${stateSlug}`, 0.4, formatDate(stateUpdatedAt));
        addedStates.add(stateKey);
      }

      addUrl(`${BASE_URL}/locations/${countrySlug}/${stateSlug}/${citySlug}`, 0.3, formatDate(cityUpdatedAt));
    }

    // Finalize sitemap
    xml += `</urlset>\n`;
    await fs.outputFile("sitemap.xml", xml);
    console.log("✅ Sitemap generated successfully!");
    console.log(`ℹ️ Total URLs: ${addedUrls.size}`);
  } catch (err) {
    console.error("❌ Sitemap generation failed:", err);
    process.exit(1);
  }
}

generateSitemap();
