
const fs = require('fs-extra');

const dotenvPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
require('dotenv').config({ path: dotenvPath });

const path = require('path');
const marked = require('marked');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));


const BASE_DOMAIN = 'ragadecode.com';

const BASE_URL = `https://${BASE_DOMAIN}`;

const BASE_IMAGE_URL = ''; // Set to CDN base if needed
const TEMPLATE_PATH = './template.html';

// ✅ List of APIs to process
const API_CONFIGS = [
  {
    name: 'news-articles',
    apiUrl: 'https://genuine-compassion-eb21be0109.strapiapp.com/api/news-articles?populate=*',

    outputDir: './news-article',
    slugPrefix: 'news-article',
  },
  {
    name: 'automobiles',
    apiUrl: 'https://genuine-compassion-eb21be0109.strapiapp.com/api/automobiles?populate[coverimage][populate]=*',
    outputDir: './automobile',
    slugPrefix: 'automobile',
  }
];


// 🔁 Builds HTML for related articles
function buildRelatedArticlesHtml(attrs) {
  const related = [...(attrs.similar_articles || []), ...(attrs.news_articles || [])];
  const hasTags = attrs.hashtags && attrs.hashtags.length > 0;

  if (!related.length && !hasTags) return '';

  const tagHtml = (attrs.hashtags || [])
    .map(tag => {
      const name = tag.name || '';
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      return `<a href="/tags/${slug}.html" class="tag-pill">#${name}</a>`;
    })
    .join(' ');

  const relatedHtml = related.map(item => {
    const relatedTitle = item.Title || 'Untitled';
    const relatedSlug = item.slug || '';
    const itemCategory = (item.category || '').toLowerCase().trim().replace(/\s+/g, '-');
    if (!itemCategory || !relatedSlug) return '';
    return `<li><a href="/${itemCategory}/${relatedSlug}" class="related-link">${relatedTitle}</a></li>`;
  }).join('');

  return `
    <div class="related-box">
      ${hasTags ? `<div class="tag-section"><h4>Tags</h4>${tagHtml}</div>` : ''}
      ${related.length ? `<div class="related-section"><h4>Related Articles</h4><ul>${relatedHtml}</ul></div>` : ''}
    </div>
  `;
}

(async () => {
  try {
    const template = await fs.readFile(TEMPLATE_PATH, 'utf8');

    const analyticsScript = `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-QEL34RBXBH"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-QEL34RBXBH');
</script>
`;

    for (const config of API_CONFIGS) {
      console.log(`🔄 Fetching articles for ${config.name}...`);
      const res = await fetch(config.apiUrl);
      const { data } = await res.json();

      await fs.ensureDir(config.outputDir);

      for (const article of data) {
        const attrs = article.attributes || article;
        const title = attrs.Title || 'Untitled';
        const slug = attrs.slug;
        const documentId = attrs.documentId || article.id;
        const description = attrs.Description || `Latest ${config.name} articles from RagaDecode — decoded by Raga`;
        const markdown = attrs.Description_in_detail || '*No content available*';
        // const tags = attrs.Tags || '';
       


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

        } else {
          console.log(`→ No cover image for: ${title}`);
        }

        const contentHTML = marked.parse(markdown);

         const tagHtml = (attrs.hashtags || [])
        .map(tag => {
          const name = tag.name || '';
          const slug = name.toLowerCase().replace(/\s+/g, '-');
          return `<a href="/tags/${slug}.html">#${name}</a>`;
        })
        .join(' ');

         
        const relatedArticlesHtml = buildRelatedArticlesHtml(attrs);
        
        const pageHTML = template
          .replace(/{{TITLE}}/g, title)
          .replace(/{{DESCRIPTION}}/g, description)
          .replace(/{{COVER_IMAGE_BLOCK}}/g, coverImageBlock)
          .replace(/{{COVER_IMAGE_URL}}/g, coverImageUrl)
          .replace(/{{CONTENT}}/g, contentHTML)
          // .replace(/{{TAGS}}/g, tagHtml)
          .replace(/{{SLUG}}/g, slug)
          .replace(/{{DOC_ID}}/g, documentId)
          .replace(/{{SLUG_PREFIX}}/g, config.slugPrefix)
          .replace(/{{BASE_DOMAIN}}/g, BASE_URL)
          .replace(/{{GA_SCRIPT}}/g, analyticsScript)
      
          .replace(/{{RELATED_ARTICLES_HTML}}/g, relatedArticlesHtml);

        const outputPath = path.join(config.outputDir, `${slug}.html`);
        await fs.writeFile(outputPath, pageHTML);
        console.log(`✅ Generated: ${config.outputDir}/${slug}.html`);
      }

      console.log(`🎉 All pages generated for ${config.name}`);
    }
  } catch (err) {
    console.error('❌ Generation failed:', err);
  }
})();
