const fs = require('fs-extra');
const dotenvPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
require('dotenv').config({ path: dotenvPath });

const path = require('path');
const marked = require('marked');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const BASE_DOMAIN = 'ragadecode.com';
const BASE_URL = `https://${BASE_DOMAIN}`;
const BASE_IMAGE_URL = "";
const TEMPLATE_PATH = path.join(__dirname, "../../templates/template.html");
const default_img = "https://ragadecode.com/assets/default-image.png";

const headerHtml = fs.readFileSync(path.join(__dirname, "../../templates/header.html"), "utf-8");
const footerHtml = fs.readFileSync(path.join(__dirname, "../../templates/footer.html"), "utf-8");

const API_CONFIGS = [
  {
    name: 'news-articles',
    apiUrl: 'https://genuine-compassion-eb21be0109.strapiapp.com/api/news-articles?sort[0]=publishedat:desc&sort[1]=id:desc&pagination[page]=1&populate[hashtags]=true&populate[author][populate][profile_image]=true&populate[coverimage]=true&populate[category]=true&populate[countries]=true&populate[states]=true&populate[cities]=true&pagination[pageSize]=100&populate[similar_articles][populate][category]=true&populate[news_articles][populate][category]=true&populate[similar_articles][populate][coverimage]=true&populate[news_articles][populate][coverimage]=true&populate[news_articles][populate][author]=true&populate[similar_articles][populate][author]=true',
  },
];

function buildLDJson({ title, coverImageUrl, publishedRaw, lastModifiedUTC, authorName, authorSlug, slugPrefix, slug, description, category, keywords, schema_details }) {
  const publishedISO = new Date(publishedRaw).toISOString();
  const baseSchema = {
    "@context": "https://schema.org",
    "headline": title,
    "description": description,
    "datePublished": publishedISO,
    "dateModified": lastModifiedUTC,
    "author": {
      "@type": "Person",
      "name": authorName,
      "url": `${BASE_URL}/authors/${authorSlug}`
    },
    "publisher": {
      "@type": "Organization",
      "name": "RagaDecode",
      "logo": {
        "@type": "ImageObject",
        "url": `${BASE_URL}/ragadecode_logo.png`
      }
    },
    "image": {
      "@type": "ImageObject",
      "url": coverImageUrl,
      "width": "1200",
      "height": "630"
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${BASE_URL}/${slugPrefix}/${slug}`
    }
  };

  let categorySchema = { "@type": "Article" };
  if (category === 'news-article') {
    categorySchema = {
      "@type": "NewsArticle",
      "keywords": keywords || ["news", "trending"],
    };
  }

  return `<script type="application/ld+json">
${JSON.stringify({ ...baseSchema, ...categorySchema }, null, 2)}
</script>`;
}

function buildRelatedArticlesHtml(attrs) {
  const related = [
    ...(attrs.similar_articles?.data || attrs.similar_articles || []),
    ...(attrs.news_articles?.data || attrs.news_articles || [])
  ];
  if (!related.length) return '';

  return related.map(item => {
    const attr = item.attributes || item;
    const relatedTitle = attr.Title || 'Untitled';
    const relatedSlug = attr.slug || '';
    const categorySlug = attr.category?.data?.attributes?.slug || attr.category?.slug;
   
    const imageUrl = attr.coverimage?.url || default_img;
    const short_description = attr.short_description;
  
    const publishedRaw = attrs.publishedat || attrs.publishedAt || attrs.createdAt;
    const published = new Date(publishedRaw).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
    const publisedISO = new Date(publishedRaw);

    const authorName = attr.author?.name;
   
    // const fullImageUrl = imageUrl ? `${BASE_IMAGE_URL}${imageUrl}` : '/assets/default.jpg';

    if (!relatedSlug || !categorySlug) return '';

    return `
      <div class="col-12 col-sm-6 col-md-6 col-lg-4">
        <div class="card related-card h-100">
          <a href="/${categorySlug}/${relatedSlug}" class="text-decoration-none text-dark">
            <img src="${imageUrl}" class="card-img-top rounded" style="object-fit:cover; height:200px;"  alt="${relatedTitle}" loading="lazy" />
            <div class="card-body">
               <small class="text-muted d-block mb-1">${authorName ? `By ${authorName} • ` : ""}${published}</small>
              <h5 class="card-title">${relatedTitle}</h5>
              <p class="card-text">${short_description}</p> 
            </div>
          </a>
        </div>
      </div> 
    `;
  }).join('');
}


(async () => {
  try {
    const template = await fs.readFile(TEMPLATE_PATH, 'utf8');
    for (const config of API_CONFIGS) {
      console.log(`🔄 Fetching articles for ${config.name}...`);
      const res = await fetch(config.apiUrl);
      const { data } = await res.json();

      for (const article of data) {
        const attrs = article.attributes || article;
        const title = attrs.Title || 'Untitled';
        const slug = attrs.slug;
        const documentId = attrs.documentId || article.id;
        const description = attrs.short_description || title;
        const category = attrs.category?.data || attrs.category;
        const categorySlug = category?.slug;
        const categoryName = category?.name;

        if (!categorySlug) {
          console.warn(`⛔ Skipping "${title}" — no categorySlug`);
          continue;
        }

        const outputDir = path.join(__dirname, '..', '..', categorySlug);

        // // ✅ Stop if folder does not exist — do NOT create
        // if (!fs.existsSync(outputDir)) {
        //   console.warn(`⛔ Skipping "${slug}" — category folder "${categorySlug}" not found at root.`);
        //   continue;
        // }

        
         
        await fs.ensureDir(outputDir);

        const keywords = attrs.Tags ? attrs.Tags.split(',').map(tag => tag.trim()) : [];
        const schema_details = attrs.schema || '';
        const markdown = attrs.Description_in_detail || '*No content available*';

        const publishedRaw = attrs.publishedat || attrs.publishedAt || attrs.createdAt;
        const published = new Date(publishedRaw).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
        const publisedISO = new Date(publishedRaw);
        const lastModifiedDate = new Date(attrs.publishedAt || publishedRaw);
        const lastModifiedISO = lastModifiedDate.toISOString().split('T')[0];
        const lastModifiedUTC = lastModifiedDate.toISOString();
        const publishedUTC = publisedISO.toISOString();

        let coverImageBlock = '';
        let coverImageUrl = null;

        if (attrs.coverimage && attrs.coverimage.url) {
          const imageData = attrs.coverimage;
          const mediumFormatUrl = imageData.formats?.medium?.url;
          const originalUrl = imageData.url;
          const relativeUrl = mediumFormatUrl || originalUrl;
          coverImageUrl = relativeUrl ? `${BASE_IMAGE_URL}${relativeUrl}` : null;

          if (coverImageUrl) {
            coverImageBlock = `
            <img 
              src="${coverImageUrl}" 
              alt="${title}" 
              loading="lazy" 
              class="img-fluid rounded shadow-sm mb-4 d-block mx-auto"
              style="max-height: 600px; width: auto;"
            />
          `;
          }
        }

        let authorBlock = '';
if (attrs.author) {
  const author = attrs.author;
  const authorName = author.name || 'Unknown Author';
  const authorSlug = author.slug || '';
  const authorNick = author.nick || authorName;
  const profileImgUrl = author.profile_image?.formats?.small?.url || author.profile_image?.url || '';
  const authorImageTag = profileImgUrl
    ? `<img src="${profileImgUrl}" alt="${authorName}" class="img-fluid rounded-circle" width="64" height="64" loading="lazy" />`
    : '';

  authorBlock = `
  <div class="card mt-4 shadow-sm">
    <div class="d-flex flex-column flex-md-row align-items-center align-items-md-start p-3 gap-3">
      ${authorImageTag ? `
        <div class="flex-shrink-0 text-center">
          ${authorImageTag}
        </div>
      ` : ''}
      <div class="text-center text-md-start">
        <h5 class="card-title mb-1">Decoded by <strong>${authorNick}</strong></h5>
        <a href="/authors/${authorSlug}" class="btn btn-outline-secondary btn-sm">About ${authorName}</a>
      </div>
    </div>
  </div>`;
}

        const country = attrs.countries?.[0]?.title || '';
        const state = attrs.states?.[0]?.title || '';
        const city = attrs.cities?.[0]?.title || '';

        let locationBlock = '';
        if (country && state && city) locationBlock = `<div class="location-block">${country} | ${state} | ${city}</div>`;
        else if (country && state) locationBlock = `<div class="location-block">${country} | ${state}</div>`;
        else if (country) locationBlock = `<div class="location-block">${country}</div>`;

        const contentHTML = marked.parse(markdown);
        const tagHtml = (attrs.hashtags || []).map(tag => {
          const name = tag.name || '';
          const slug = name.toLowerCase().replace(/\s+/g, '-');
          return `<span><a href="/tags/${slug}" class="hashtag">#${name}</a></span>`;
        }).join(' ');

        const relatedArticlesHtml = buildRelatedArticlesHtml(attrs);
        const relatedArticlesSection = relatedArticlesHtml
        ? `<div class="related-articles row g-4 mt-4">${relatedArticlesHtml}</div>`
        : '';
        const ldJsonScript = buildLDJson({ title, coverImageUrl, publishedRaw, lastModifiedUTC, authorName: attrs.author?.name || 'Ragavendran Ramesh', authorSlug: attrs.author?.slug || 'ragavendran-ramesh', slugPrefix: categorySlug, slug, description, category, keywords, schema_details });

        const analyticsScript = `<!-- Google tag (gtag.js) --><script async src="https://www.googletagmanager.com/gtag/js?id=G-QEL34RBXBH"></script><script>window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-QEL34RBXBH');</script>`;

        const pageHTML = template
          .replace(/{{STRUCTURED_DATA_JSON}}/g, ldJsonScript)
          .replace(/{{TITLE}}/g, title)
          .replace(/{{DESCRIPTION}}/g, description)
          .replace(/{{PUBLISHED_DATE}}/g, published)
          .replace(/{{PUBLISED_ON}}/g, publishedRaw)
          .replace(/{{LAST_MODIFIED}}/g, lastModifiedISO)
          .replace(/{{LAST_MODIFIED_UTC}}/g, lastModifiedUTC)
          .replace(/{{PUBLISHED_UTC}}/g, publishedUTC)
          .replace(/{{COVER_IMAGE_BLOCK}}/g, coverImageBlock)
          .replace(/{{COVER_IMAGE_URL}}/g, coverImageUrl)
          .replace(/{{CONTENT}}/g, contentHTML + locationBlock)
          .replace(/{{AUTHOR_NAME}}/g, attrs.author?.name || 'Ragavendran Ramesh')
          .replace(/{{AUTHOR_SLUG}}/g, attrs.author?.slug || 'ragavendran-ramesh')
          .replace(/{{AUTHOR_BLOCK}}/g, authorBlock)
          .replace(/{{TAGS}}/g, tagHtml)
          .replace(/{{SLUG}}/g, slug)
          .replace(/{{DOC_ID}}/g, documentId)
          .replace(/{{CATEGORY_NAME}}/g, categoryName)
          .replace(/{{SLUG_PREFIX}}/g, categorySlug)
          .replace(/{{BASE_DOMAIN}}/g, BASE_URL)
          .replace(/{{GA_SCRIPT}}/g, analyticsScript)
          .replace(/{{HEADER}}/g, headerHtml)
          .replace(/{{FOOTER}}/g, footerHtml)
          .replace(/{{RELATED_SECTION_BLOCK}}/g, relatedArticlesSection ? `
          <div class="related-section">
            <h3 class="mb-4 text-center">Related Articles</h3>
            ${relatedArticlesSection}
          </div>
        ` : '');
  
        const outputPath = path.join(outputDir, `${slug}.html`);
        await fs.writeFile(outputPath, pageHTML);
        console.log(`✅ Generated: ${outputPath}`);
      }
      console.log(`🎉 All pages processed for ${config.name}`);
    }
  } catch (err) {
    console.error('❌ Generation failed:', err);
  }
})();
