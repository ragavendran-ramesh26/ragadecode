const fs = require("fs-extra");
const path = require("path");
const fetch = require('../../assets/js/api-client');

const API_CONFIG = require("../../assets/js/api-config");
const TAGS_API = API_CONFIG.TAGS_API;
const OUTPUT_DIR = path.join(__dirname, "../../tags");
const headerHtml = fs.readFileSync(path.join(__dirname, "../../templates/header.html"), "utf-8");
const footerHtml = fs.readFileSync(path.join(__dirname, "../../templates/footer.html"), "utf-8");
const TEMPLATE_PATH = path.join(__dirname, "../../templates/tags_template.html");
const default_img = "https://ragadecode.com/assets/default-image.png";

const gaScript = `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/pagead/js/adsbygoogle.js?client=ca-pub-4195715781915036" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-QEL34RBXBH"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-QEL34RBXBH');
</script>`;

(async () => {
  try {
    console.log("➡️ Fetching all tags...");
    const tagListRes = await fetch(`${TAGS_API}?populate[news_articles]=true`);
    const tagListJson = await tagListRes.json();
    const allTags = tagListJson.data;
    console.log(`✅ Total tags fetched: ${allTags.length}`);

    const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");

    for (const tag of allTags) {
      const tagId = tag.documentId;
      const tagName = tag.name || "untitled-tag";
      const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const getArticleURL = `${TAGS_API}/${tagId}?populate[news_articles]=true`;

      console.log(`\n🔎 Processing tag: ${tagName}`);
      console.log(`📎 Tag ID: ${tagId}`);
      console.log(`🌐 Detail API URL: ${getArticleURL}`);

      const tagDetailRes = await fetch(getArticleURL);
      const tagDetailJson = await tagDetailRes.json();
      const tagData = tagDetailJson.data;

      const articles = tagData?.news_articles || [];
      console.log(`📄 Articles found for ${tagName}: ${articles.length}`);

      if (!articles || articles.length === 0) {
        console.warn(`⚠️ Skipping tag '${tagName}' – no articles`);
        continue;
      }

      const cardsHtml = articles.map((article, i) => {
        const attr = article.attributes || article;
        const title = attr.Title || "Untitled";
        const slug = attr.slug || "";
        const short_description = attr.short_description || "";
        const articleCategory = attr.category?.slug || "news-article";
        const cover = attr.coverimage?.url || default_img;
        const publishedRaw = attr.publishedat || attr.publishedAt || attr.createdAt;
        const published = new Date(publishedRaw).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric"
        });
        const authorName = attr.author?.data?.attributes?.name || attr.author?.name || "";
        const tags = attr.hashtags?.data || [];

        console.log(`   #${i + 1}: ${title} → /${articleCategory}/${slug}`);

        const tagsHtml = tags.map(t => {
          const name = t?.attributes?.name || t?.name || "";
          return name ? `<a href="/tags/${name.toLowerCase().replace(/\s+/g, "-")}" class="badge bg-light border text-dark">#${name}</a>` : "";
        }).join(" ");

        return `
        <div class="col-md-4">
          <div class="card border-0 h-100">
            <img src="${cover}" class="card-img-top rounded" style="object-fit:cover; height:200px;" alt="${title}" />
            <div class="card-body px-0">
              <small class="text-muted d-block mb-1">${authorName ? `By ${authorName} • ` : ""}${published}</small>
              <h5 class="card-title fw-semibold">
                <a href="/${articleCategory}/${slug}" class="text-dark text-decoration-none">${title}</a>
              </h5>
              <p>${short_description}</p>
              <div class="d-flex flex-wrap gap-1 mt-3">${tagsHtml}</div>
            </div>
          </div>
        </div>`;
      }).join("");

      const allTagLinks = allTags.map(t => {
        const name = t.name || "";
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        return name ? `<span><a href="/tags/${slug}">#${name}</a></span>` : "";
      }).join(" ");

      const tagTitle = tagName.replace(/[^a-zA-Z0-9\s\-]/g, "")
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      const finalHtml = template
        .replace(/{{GA_SCRIPT}}/g, gaScript)
        .replace(/{{HEADER}}/g, headerHtml)
        .replace(/{{FOOTER}}/g, footerHtml)
        .replace(/{{TAG_NAME}}/g, tagTitle)
        .replace(/{{TAG_SLUG}}/g, tagSlug)
        .replace(/{{CARDS}}/g, cardsHtml)
        .replace(/{{ALL_TAGS}}/g, allTagLinks);

      const filePath = path.join(OUTPUT_DIR, `${tagSlug}.html`);
      await fs.ensureDir(OUTPUT_DIR);
      await fs.writeFile(filePath, finalHtml, "utf8");
      console.log(`✅ Generated page: tags/${tagSlug}.html`);
    }
  } catch (err) {
    console.error("❌ Failed to generate tag pages:", err);
  }
})();
