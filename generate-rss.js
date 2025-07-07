const fs = require("fs-extra");
const path = require("path");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const BASE_URL = "https://ragadecode.com";
const STRAPI_API = "https://genuine-compassion-eb21be0109.strapiapp.com";

// Escape XML characters
const escapeXML = (unsafe) =>
  unsafe
    ?.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// Format pubDate in RFC-822
const formatRSSDate = (dateString) =>
  new Date(dateString).toUTCString();

async function generateRSSFeeds() {
  console.log("Fetching categories...");
  const res = await fetch(`${STRAPI_API}/api/categories?pagination[pageSize]=100`);
  const categoryData = await res.json();
  const categories = categoryData.data || [];

  for (const category of categories) {
    const catAttr = category.attributes || category;
    const slug = catAttr.slug;
    const title = catAttr.name;

    console.log(`Generating RSS for category: ${title}`);

    const articleRes = await fetch(
      `${STRAPI_API}/api/news-articles?filters[category][slug][$eq]=${slug}&sort[0]=publishedAt:desc&pagination[pageSize]=30&populate[author][populate][profile_image]=true&populate[coverimage]=true&populate[category]=true`
    );

    const articlesData = await articleRes.json();
    const articles = articlesData.data || [];

    console.log(`→ ${articles.length} articles fetched for ${slug}`);

    let xml = `<?xml version="1.0" encoding="UTF-8" ?>\n`;
   xml += `<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">\n<channel>\n`;
    xml += `  <title>${escapeXML(`RagaDecode - ${title}`)}</title>\n`;
    xml += `  <link>${BASE_URL}/${slug}</link>\n`;
    xml += `  <description>${escapeXML(`Latest articles in ${title}`)}</description>\n`;

    for (const article of articles) {
      const a = article.attributes || article;
      const link = `${BASE_URL}/${slug}/${a.slug}`;
      const description = escapeXML(a.short_description || a.Title || "No description");
      const pubDate = formatRSSDate(a.publishedAt || a.updatedAt);
      const authorName = escapeXML(a.author?.data?.attributes?.name || "Ragavendran Ramesh");
      let coverImageUrl = null;
        if (a.coverimage && a.coverimage.url) {
            const imageData = a.coverimage;
            const mediumFormatUrl = imageData.formats?.medium?.url;
            const originalUrl = imageData.url;
            const relativeUrl = mediumFormatUrl || originalUrl;
            coverImageUrl = relativeUrl || null;
        }

      xml += `  <item>\n`;
      xml += `    <title>${escapeXML(a.Title)}</title>\n`;
      xml += `    <link>${link}</link>\n`;
      xml += `    <guid>${link}</guid>\n`;
      xml += `    <pubDate>${pubDate}</pubDate>\n`;
      xml += `    <dc:creator>${authorName}</dc:creator>\n`;
      xml += `    <description><![CDATA[${description}]]></description>\n`;

      if (coverImageUrl) {
            xml += `    <enclosure url="${coverImageUrl}" type="image/jpeg" />\n`;
        }

      xml += `  </item>\n`;
    }

    xml += `</channel>\n</rss>`;

    const filePath = path.join("rss", `${slug}.xml`);
    await fs.outputFile(filePath, xml);
    console.log(`✅ RSS saved to ${filePath}`);
  }
}

generateRSSFeeds();
