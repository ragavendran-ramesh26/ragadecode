// generate-articles.js
const { stat } = require("fs");
const fs = require("fs-extra");
const path = require("path");
const fetch = require('../../assets/js/api-client');
const API_CONFIG= require("../../assets/js/api-config");

const API_URL = API_CONFIG.FULL_SLUG_ARTICLE;

const TAGS_API = API_CONFIG.ALL_TAGS_API;

const STATES_API =API_CONFIG.STATE_PAGE_API;

const default_img = "https://ragadecode.com/assets/default-image.png";

const templatePath = path.join(__dirname, "../../templates/articlelist_template.html");
const headerHtml = fs.readFileSync(path.join(__dirname, "../../templates/header.html"), "utf-8");
const footerHtml = fs.readFileSync(path.join(__dirname, "../../templates/footer.html"), "utf-8");
const template = fs.readFileSync(templatePath, "utf-8");



const gaScript = `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-QEL34RBXBH"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-QEL34RBXBH');
</script>
`;

(async () => {
  try {
const [tagRes, articleRes, statesRes] = await Promise.all([
  fetch(TAGS_API),
  fetch(API_URL),
  fetch(STATES_API),
]);

const { data: tagData } = tagRes;
const { data: articles } = articleRes;  // ✅ define this
const { data: states } = statesRes;


    const categoryMap = new Map();

    for (const article of articles) {
      const attr = article.attributes || article;
      const category = attr.category?.data || attr.category;

      if (category) {
        const categorySlug = (category.attributes || category).slug;
        if (!categoryMap.has(categorySlug)) {
          categoryMap.set(categorySlug, {
            categoryObj: category,
            articles: [],
          });
        }
        categoryMap.get(categorySlug).articles.push(article);
      }
    }

  

    for (const [categorySlug, categoryData] of categoryMap) {
      const category = categoryData.categoryObj;
      const articles = categoryData.articles;
      const categoryAttr = category.attributes || category;
      const categoryName = categoryAttr.name || "News";

      const seoTitle = categoryAttr.seo_title || `${categoryName} News and Articles | RagaDecode`;
      const metaDescription = categoryAttr.meta_description || `Get the latest updates, stories, and headlines for ${categoryName} on RagaDecode. Curated content on current affairs, insights, and more.`;
      const shortDescription = categoryAttr.short_description || `Explore trending stories and news articles in the ${categoryName} category. Updated daily for better context and clarity.`;

      const category_cover_img = categoryAttr.cover_image;
      const hasCoverImage = !!category_cover_img && category_cover_img.trim() !== "";




      const sections = [];
      const uniqueTagMap = new Map();

      for (const article of articles) {
        const attr = article.attributes || article;
        const title = attr.Title || "Untitled";
        const slug = attr.slug || "";
        const articleCategory =
          attr.category?.data?.attributes?.slug ||
          (attr.category?.attributes || attr.category)?.slug ||
          "news-article";
        const cover =
          attr.coverimage?.data?.attributes?.formats?.small?.url ||
          attr.coverimage?.data?.attributes?.url ||
          (attr.coverimage?.attributes || attr.coverimage)?.url ||
          "";
        const coverUrl = cover || "";

        const publishedRaw =
          attr.publishedat || attr.publishedAt || attr.createdAt;
        const published = new Date(publishedRaw).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });

        const rawSummary = (attr.Description_in_detail || "")
          .replace(/[#*_`>]/g, "")
          .replace(/\n/g, " ")
          .trim();

        const summary =
          rawSummary.length > 180
            ? rawSummary.slice(0, rawSummary.slice(0, 180).lastIndexOf(" ")) +
              "..."
            : rawSummary;

        const hashtags = attr.hashtags?.data || attr.hashtags || [];

        for (const tag of hashtags) {
          const tagAttr = tag.attributes || tag;
          if (tagAttr && tagAttr.name && !uniqueTagMap.has(tagAttr.name)) {
            uniqueTagMap.set(tagAttr.name, tagAttr);
          }
        }

        const tags = hashtags
          .slice(0, 2)
          .map((tag) => {
            const tagAttr = tag.attributes || tag;
            return tagAttr.name || "";
          })
          .filter(Boolean)
          .map(
            (name) =>
              `<a href="/tags/${name
                .toLowerCase()
                .replace(
                  /\s+/g,
                  "-"
                )}" class="badge bg-secondary me-1">#${name}</a>`
          )
          .join(" ");

        const html = `
          <div class="card mb-4">
            ${
              coverUrl
                ? `<img src="${coverUrl}" class="card-img-top" alt="${title}">`
                : ""
            }
            <div class="card-body">
              <h5 class="card-title"><a href="/${articleCategory}/${slug}">${title}</a></h5>
              <p class="card-text">${summary}</p>
              <p class="card-text"><small class="text-muted">Published on ${published}</small></p>
              <div>${tags}</div>
            </div>
          </div>
        `;

        sections.push({ html, attr });
      }

      const worldSections = sections.filter(({ attr }) => {
        const countries = attr.countries || [];
        return (
          countries.length > 0 &&
          !countries.some((c) => c.title?.toLowerCase() === "india")
        );
      });

      const worldArticles = sections
  .filter(({ attr }) => {
    const countries = attr.countries || [];
    return (
      countries.length > 0 &&
      !countries.some((c) => c.title?.toLowerCase() === "india")
    );
  })
  .map(({ attr }) => {
    const title = attr.Title || "Untitled";
    const slug = attr.slug || "";
    const short_description = attr.short_description || "";
    const articleCategory =
      attr.category?.data?.attributes?.slug ||
      (attr.category?.attributes || attr.category)?.slug ||
      "news-article";
    const cover =
      attr.coverimage?.data?.attributes?.url ||
      (attr.coverimage?.attributes || attr.coverimage)?.url ||
      default_img;
    const publishedRaw = attr.publishedat || attr.publishedAt || attr.createdAt;
    const published = new Date(publishedRaw).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const authorName = attr.author?.data?.attributes?.name || attr.author?.name || "";

    const tags = attr.hashtags?.data || attr.hashtags || [];

    const tagsHtml = tags
      .slice(0, 3)
      .map((tag) => {
        const name = tag?.attributes?.name || tag?.name || "";
        return name
          ? `<a href="/tags/${name
              .toLowerCase()
              .replace(/\s+/g, "-")}" class="badge bg-light border text-dark">#${name}</a>`
          : "";
      })
      .join(" ");

    return `
      <div class="col-md-4">
        <div class="card border-0 h-100">
          ${
            cover
              ? `<img src="${cover}" class="card-img-top rounded" alt="${title}" style="object-fit: cover; height: 200px;">`
              : ""
          }

          <div class="card-body px-0">
            <small class="text-muted d-block mb-1">${
              authorName ? `By ${authorName}` : ""
            } • ${published}</small>
            <h5 class="card-title fw-semibold">
              <a href="/${articleCategory}/${slug}" class="text-dark text-decoration-none">${title}</a>
            </h5>
            <p>${short_description}</p>
            <div class="d-flex flex-wrap gap-1 mt-3">
              ${tagsHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  })
  .join("");

      const section1Html = worldArticles.trim()
        ? `
        <section class="best-articles-section py-5">
        <div class="container">
            <h2 class="section-title text-center mb-2">${categoryName} from Around the World</h2>
            <p class="section-subtitle text-center mb-4">Global headlines decoded from beyond India</p>
            <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-4">
            ${worldArticles}
            </div>
        </div>
        </section>
        `
        : "";

      let section2Grouped = states
        .filter((state) => {
          const stateAttr = state.attributes || state;

          const stateName = stateAttr.title || stateAttr.name;

          //   const country = stateAttr.country?.data?.attributes?.title || stateAttr.country?.attributes?.title;
          const country = stateAttr.country?.title || "";

          const hasArticles = stateAttr.news_articles?.length > 0;

          return stateName && country === "India" && hasArticles;
        })
        .map((state) => {
          const stateAttr = state.attributes || state;
          const stateName = stateAttr.title || stateAttr.name;
          const allArticles =
            stateAttr.news_articles || state.news_articles?.data || [];

          // ✅ Filter state articles by category
          const stateArticles = allArticles.filter((article) => {
            const attr = article.attributes || article;
            const articleCategory =
              attr.category?.data?.attributes?.slug ||
              (attr.category?.attributes || attr.category)?.slug ||
              "news-article";
            return articleCategory === categorySlug;
          });

          // ✅ Skip if no articles in this category
          if (stateArticles.length === 0) return null;

          const cards = stateArticles
            .map((article) => {
              const attr = article.attributes || article;
              const title = attr.Title || "Untitled";
              const slug = attr.slug || "";
              const short_description = attr.short_description || "";
              const articleCategory =
                attr.category?.data?.attributes?.slug ||
                (attr.category?.attributes || attr.category)?.slug ||
                "news-article";
              const cover =
                attr.coverimage?.data?.attributes?.url ||
                (attr.coverimage?.attributes || attr.coverimage)?.url ||
                default_img;
              const publishedRaw =
                attr.publishedat || attr.publishedAt || attr.createdAt;
              const published = new Date(publishedRaw).toLocaleDateString(
                "en-IN",
                {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                }
              );

              const authorName = attr.author?.name || "";

              const tags = attr.hashtags?.data || attr.hashtags || [];

              const tagsHtml = tags
                .slice(0, 3)
                .map((tag) => {
                  const name = tag?.attributes?.name || tag?.name || "";
                  return name
                    ? `<a href="/tags/${name
                        .toLowerCase()
                        .replace(
                          /\s+/g,
                          "-"
                        )}" class="badge bg-light border text-dark">#${name}</a>`
                    : "";
                })
                .join(" ");

              return `
     <div class="col-md-4">
      <div class="card border-0  h-100">
      ${
        cover
          ? `<img src="${cover}" class="card-img-top rounded" alt="${title}" style="object-fit: cover; height: 200px;">`
          : ""
      }

      <div class="card-body px-0">
        
        
          <small class="text-muted d-block mb-1">${
            authorName ? `By ${authorName}` : ""
          } • ${published} </small>
          <h5 class="card-title fw-semibold"><a href="/${articleCategory}/${slug}" class="text-dark text-decoration-none">${title}</a></h5>
          <p>${short_description}</p>
         
        <div class="d-flex flex-wrap gap-1 mt-3">
          ${tagsHtml}
        </div>
      </div>
    </div>
  </div>
    `;
            })
            .join("");

          return `
    <div class="state-section mb-5">
      <h3 class="fw-bold mb-4">${stateName}</h3>
      <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-4">
        ${cards}
      </div>
    </div>
  `;
        })
        .filter(Boolean) // 🧹 Removes all null blocks from empty states
        .join("");

      const section2Html = section2Grouped.trim()
        ? `
        <section class="best-articles-section py-5">
        <div class="container">
            <h2 class="section-title text-center mb-2">${categoryName} from Indian States</h2>
            <p class="section-subtitle text-center mb-4">Decoded articles curated from across India</p>
            ${section2Grouped}
        </div>
        </section>
        `
        : "";

     const emptyCountryArticles = sections
  .filter(({ attr }) => {
    const countries = attr.countries || [];
    return countries.length === 0;
  })
  .map(({ attr }) => {
    const title = attr.Title || "Untitled";
    const slug = attr.slug || "";
    const short_description = attr.short_description || "";
    const articleCategory =
      attr.category?.data?.attributes?.slug ||
      (attr.category?.attributes || attr.category)?.slug ||
      "news-article";
    const cover =
      attr.coverimage?.data?.attributes?.url ||
      (attr.coverimage?.attributes || attr.coverimage)?.url ||
      default_img;
    const publishedRaw = attr.publishedat || attr.publishedAt || attr.createdAt;
    const published = new Date(publishedRaw).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    const authorName = attr.author?.data?.attributes?.name || attr.author?.name || "";

    const tags = attr.hashtags?.data || attr.hashtags || [];

    const tagsHtml = tags
      .slice(0, 3)
      .map((tag) => {
        const name = tag?.attributes?.name || tag?.name || "";
        return name
          ? `<a href="/tags/${name
              .toLowerCase()
              .replace(/\s+/g, "-")}" class="badge bg-light border text-dark">#${name}</a>`
          : "";
      })
      .join(" ");

    return `
      <div class="col-md-4">
        <div class="card border-0 h-100">
          ${
            cover
              ? `<img src="${cover}" class="card-img-top rounded" alt="${title}" style="object-fit: cover; height: 200px;">`
              : ""
          }
          <div class="card-body px-0">
            <small class="text-muted d-block mb-1">${
              authorName ? `By ${authorName}` : ""
            } • ${published}</small>
            <h5 class="card-title fw-semibold">
              <a href="/${articleCategory}/${slug}" class="text-dark text-decoration-none">${title}</a>
            </h5>
            <p>${short_description}</p>
            <div class="d-flex flex-wrap gap-1 mt-3">
              ${tagsHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  })
  .join("");

const section3Html = emptyCountryArticles.trim()
  ? `
<section class="best-articles-section py-5">
  <div class="container">
    <h2 class="section-title text-center mb-2">${categoryName}</h2>
    <p class="section-subtitle text-center mb-4"></p>
    <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-4">
      ${emptyCountryArticles}
    </div>
  </div>
</section>
`
  : "";

      const finalPageHtml = template
        .replace(/{{GA_SCRIPT}}/g, gaScript)
        .replace(/{{HEADER}}/g, headerHtml)
        .replace(/{{SECTION_1}}/g, section1Html)
        .replace(/{{SECTION_2}}/g, section2Html)
        .replace(/{{SECTION_3}}/g, section3Html)
        .replace(/{{SECTION_4}}/g, "") // Add logic if SECTION_4 is needed later
        .replace(/{{CATEGORY_NAME}}/g, categoryName)
        .replace(/{{CATEGORY_SLUG}}/g, categorySlug)
        .replace(/{{SEO_TITLE}}/g, seoTitle)
        .replace(/{{META_DESCRIPTION}}/g, metaDescription)
        .replace(/{{SHORT_DESC}}/g, shortDescription)
        .replace(/{{COVER_IMAGE_TAG}}/g, hasCoverImage 
        ? `<img src="${category_cover_img}" alt="Category cover image" class="img-fluid shadow-sm" style="max-height: 360px; object-fit: cover; width: 100%;" />` 
        : "")
        .replace(/{{FOOTER}}/g, footerHtml);

      // const outputDir = path.join(__dirname, categorySlug);

      if (!categorySlug) {
        console.warn(`⛔ Skipping "${title}" — no categorySlug`);
        continue;
      }

      const outputDir = path.join(__dirname, '..', '..', categorySlug);

      // ✅ Stop if folder does not exist — do NOT create
      if (!fs.existsSync(outputDir)) {
        console.warn(`⛔ Skipping "${slug}" — category folder "${categorySlug}" not found at root.`);
        continue;
      }

      await fs.ensureDir(outputDir);

      await fs.writeFile(path.join(outputDir, "index.html"), finalPageHtml);
      console.log(
        `✅ Generated ${categorySlug}/index.html with ${articles.length} articles`
      );
    }

    console.log("✅ All category pages generated successfully");
  } catch (err) {
    console.error("❌ Failed to generate news articles:", err);
  }
})();
