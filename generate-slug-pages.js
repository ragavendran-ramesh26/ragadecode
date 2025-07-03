const fs = require('fs-extra');
const dotenvPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
require('dotenv').config({ path: dotenvPath });

const path = require('path');
const marked = require('marked');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const BASE_DOMAIN = 'ragadecode.com';
const BASE_URL = `https://${BASE_DOMAIN}`;
const BASE_IMAGE_URL = '';
const TEMPLATE_PATH = './template.html';
// const CACHE_FILE = './.article_cache.json';

const API_CONFIGS = [
  {
    name: 'news-articles',
    apiUrl: 'https://genuine-compassion-eb21be0109.strapiapp.com/api/news-articles?sort[0]=publishedat:desc&sort[1]=id:desc&pagination[page]=1&pagination[pageSize]=100&populate[hashtags]=true&populate[author][populate][profile_image]=true&populate[coverimage]=true&populate[similar_articles]=true&populate[news_articles]=true&populate[category]=true',
  },
  {
    name: 'automobiles',
    apiUrl: 'https://genuine-compassion-eb21be0109.strapiapp.com/api/automobiles?sort[0]=publishedat:desc&sort[1]=id:desc&pagination[page]=1&pagination[pageSize]=100&populate[author][populate][profile_image]=true&populate[coverimage]=true&populate[hashtags]=true&populate[category]=true',
    // outputDir: './automobile',
    // slugPrefix: 'automobile',
  },
  {
    name: 'technology',
    apiUrl: 'https://genuine-compassion-eb21be0109.strapiapp.com/api/technologies?sort[0]=publishedat:desc&sort[1]=id:desc&pagination[page]=1&pagination[pageSize]=100&populate[hashtags]=true&populate[author][populate][profile_image]=true&populate[coverimage]=true&populate[category]=true',
    // outputDir: './technologies',
    // slugPrefix: 'technologies',
  },
  {
    name: 'travels',
    apiUrl: 'https://genuine-compassion-eb21be0109.strapiapp.com/api/tourism-travel-trips?sort[0]=publishedat:desc&sort[1]=id:desc&pagination[page]=1&pagination[pageSize]=100&populate[hashtags]=true&populate[author][populate][profile_image]=true&populate[coverimage]=true&populate[category]=true',
    // outputDir: './tourism-travel-trips',
    // slugPrefix: 'tourism-travel-trips',
  },
  {
    name: 'finances',
    apiUrl: 'https://genuine-compassion-eb21be0109.strapiapp.com/api/finances?sort[0]=publishedat:desc&sort[1]=id:desc&pagination[page]=1&pagination[pageSize]=100&populate[hashtags]=true&populate[author][populate][profile_image]=true&populate[coverimage]=true&populate[category]=true',
    // outputDir: './finances',
    // slugPrefix: 'finances',
  }
];

function buildLDJson({ 
  title, 
  coverImageUrl, 
  publishedRaw, 
  lastModifiedUTC, 
  authorName, 
  authorSlug, 
  slugPrefix, 
  slug, 
  description,
  category,
  keywords,
  schema_details
}) {
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
  const related = [...(attrs.similar_articles || []), ...(attrs.news_articles || [])];
  if (!related.length) return '';

  return related.map(item => {
    const relatedTitle = item.Title || 'Untitled';
    const relatedSlug = item.slug || '';
    const itemCategory = (item.category || '').toLowerCase().trim().replace(/\s+/g, '-');
    if (!itemCategory || !relatedSlug) return '';
    return `<li><a href="/${itemCategory}/${relatedSlug}" class="related-link">${relatedTitle}</a></li>`;
  }).join('');
}

(async () => {
  try {
    const template = await fs.readFile(TEMPLATE_PATH, 'utf8');

    // let cache = {};
    // if (await fs.pathExists(CACHE_FILE)) {
    //   cache = await fs.readJson(CACHE_FILE);
    // }

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

       

        const outputDir = `./${categorySlug}`;
        await fs.ensureDir(outputDir);

        const keywords = attrs.Tags 
          ? attrs.Tags.split(',').map(tag => tag.trim()) 
          : [];

        const schema_details = attrs.schema || '';
        const markdown = attrs.Description_in_detail || '*No content available*';

        const publishedRaw = attrs.publishedat || attrs.publishedAt || attrs.createdAt;
        const published = new Date(publishedRaw).toLocaleDateString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }); 

        const publisedISO = new Date(publishedRaw);
        const lastModifiedDate = new Date(attrs.publishedAt || publishedRaw);
        const lastModifiedISO = lastModifiedDate.toISOString().split('T')[0];
        const lastModifiedUTC = lastModifiedDate.toISOString();
        const publishedUTC = publisedISO.toISOString();

        // const cacheKey = `${config.name}-${documentId}`;
        // if (cache[cacheKey] === attrs.updatedAt) {
        //   console.log(`⏩ Skipping unchanged: ${slug}`);
        //   continue;
        // }

        let coverImageBlock = '';
        let coverImageUrl = null;
        if (attrs.coverimage && attrs.coverimage.url) {
          const imageData = attrs.coverimage;
          const mediumFormatUrl = imageData.formats?.medium?.url;
          const originalUrl = imageData.url;
          const relativeUrl = mediumFormatUrl || originalUrl;
          coverImageUrl = relativeUrl ? `${BASE_IMAGE_URL}${relativeUrl}` : null;

          if (coverImageUrl) {
            coverImageBlock = `<img class="cover-image" src="${coverImageUrl}" alt="${title}" loading="lazy" />`;
          }
        }

        let authorBlock = '';
        if (attrs.author) {
          const author = attrs.author;
          const authorName = author.name || 'Unknown Author';
          const authorSlug = author.slug || '';
          const authorNick = author.nick || authorName;
          const profileImgUrl =
            author.profile_image?.formats?.small?.url || author.profile_image?.url || '';
          const authorImageTag = profileImgUrl
            ? `<a href="/authors/${authorSlug}">
                <img src="${profileImgUrl}" alt="${authorName}" class="author-image" loading="lazy" />
              </a>` : '';

          authorBlock = `
            <div class="author-box">
              ${authorImageTag}
              <div class="author-details">
                <h3>Decoded by ${authorNick}</h3>
                <a href="/authors/${authorSlug}" class="author-link">About ${authorName}</a>
              </div>
            </div>`;
        }

        const contentHTML = marked.parse(markdown);
        const tagHtml = (attrs.hashtags || [])
          .map(tag => {
            const name = tag.name || '';
            const slug = name.toLowerCase().replace(/\s+/g, '-');
            return `<span><a href="/tags/${slug}">#${name}</a></span>`;
          }).join(' ');

        const relatedArticlesHtml = buildRelatedArticlesHtml(attrs);
        const relatedArticlesSection = relatedArticlesHtml
          ? `<div class="related-articles">
              <h3>Related Articles</h3>
              <div class="related-box">
                <ul>${relatedArticlesHtml}</ul>
              </div>
          </div>` : '';

        const ldJsonScript = buildLDJson({
          title,
          coverImageUrl,
          publishedRaw,
          lastModifiedUTC,
          authorName: attrs.author?.name || 'Ragavendran Ramesh',
          authorSlug: attrs.author?.slug || 'ragavendran-ramesh',
          slugPrefix: categorySlug,
          slug,
          description,
          category,
          keywords,
          schema_details
        });

        const analyticsScript = `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-QEL34RBXBH"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-QEL34RBXBH');
</script>`;

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
          .replace(/{{CONTENT}}/g, contentHTML)
          .replace(/{{AUTHOR_NAME}}/g, attrs.author?.name || 'Ragavendran Ramesh')
          .replace(/{{AUTHOR_SLUG}}/g, attrs.author?.slug || 'ragavendran-ramesh')
          .replace(/{{AUTHOR_BLOCK}}/g, authorBlock)
          .replace(/{{TAGS}}/g, tagHtml)
          .replace(/{{SLUG}}/g, slug)
          .replace(/{{DOC_ID}}/g, documentId)
          .replace(/{{SLUG_PREFIX}}/g, categorySlug)
          .replace(/{{BASE_DOMAIN}}/g, BASE_URL)
          .replace(/{{GA_SCRIPT}}/g, analyticsScript)
          .replace(/{{RELATED_ARTICLES_SECTION}}/g, relatedArticlesSection);

        const outputPath = path.join(outputDir, `${slug}.html`);
        await fs.writeFile(outputPath, pageHTML);
        console.log(`✅ Generated: ${outputPath}`);

        // cache[cacheKey] = attrs.updatedAt;
      }

      console.log(`🎉 All pages processed for ${config.name}`);
    }

    // await fs.writeJson(CACHE_FILE, cache, { spaces: 2 });
  } catch (err) {
    console.error('❌ Generation failed:', err);
  }
})();
