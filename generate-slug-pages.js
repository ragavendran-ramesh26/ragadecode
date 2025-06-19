
const fs = require('fs-extra');

const dotenvPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
require('dotenv').config({ path: dotenvPath });

const path = require('path');
const marked = require('marked');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// ✅ Global Config
const isLocal = process.env.NODE_ENV === 'development' || process.env.BASE_DOMAIN === 'localhost';
const BASE_DOMAIN = (process.env.BASE_DOMAIN || 'localhost').replace(/^https?:\/\//, '');
const IS_PRODUCTION = BASE_DOMAIN === 'ragadecode.com' && !isLocal;

const BASE_URL = `https://${BASE_DOMAIN}`;

const BASE_IMAGE_URL = ''; // Set to CDN base if needed
const TEMPLATE_PATH = './template.html';

// ✅ List of APIs to process
const API_CONFIGS = [
  {
    name: 'news-articles',
    apiUrl: 'https://genuine-compassion-eb21be0109.strapiapp.com/api/news-articles?populate[coverimage][populate]=*',
    outputDir: './news-article',
    slugPrefix: 'news-article',
  },
  {
    name: 'automobiles',
    apiUrl: 'https://genuine-compassion-eb21be0109.strapiapp.com/api/automobiles/??populate[coverimage][populate]=*',
    outputDir: './automobile',
    slugPrefix: 'automobile',
  }
];

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
        const description = attrs.Description || 'Latest news from RagaDecode — decoded by Raga';
        const markdown = attrs.Description_in_detail || '*No content available*';
        const tags = attrs.Tags || '';

        // Handle coverimage array or object
        const coverObj = Array.isArray(attrs.coverimage)
          ? attrs.coverimage[0]
          : attrs.coverimage;

        let coverImageUrl = '';
        let coverImageBlock = '';

        if (coverObj && (coverObj.formats || coverObj.url)) {
          const mediumUrl = coverObj.formats?.medium?.url || coverObj.url || '';
          coverImageUrl = `${BASE_IMAGE_URL}${mediumUrl}`;
          coverImageBlock = `<img class="cover-image" src="${coverImageUrl}" alt="${title}" loading="lazy" />`;
        } else {
          console.log(`→ No cover image for: ${title}`);
        }

        if (!slug || !documentId) {
          console.warn(`⚠️ Skipping: Missing slug or documentId for ID ${article.id}`);
          continue;
        }

        const contentHTML = marked.parse(markdown);

        const tagHtml = tags
          .split(',')
          .map(tag => tag.trim())
          .filter(Boolean)
          .map(tag => `<a href="#">#${tag}</a>`)
          .join(' ');

        const pageHTML = template
          .replace(/{{TITLE}}/g, title)
          .replace(/{{DESCRIPTION}}/g, description)
          .replace(/{{COVER_IMAGE_BLOCK}}/g, coverImageBlock)
          .replace(/{{COVER_IMAGE_URL}}/g, coverImageUrl)
          .replace(/{{CONTENT}}/g, contentHTML)
          .replace(/{{TAGS}}/g, tagHtml)
          .replace(/{{SLUG}}/g, slug)
          .replace(/{{DOC_ID}}/g, documentId)
          .replace(/{{SLUG_PREFIX}}/g, config.slugPrefix)
          .replace(/{{BASE_DOMAIN}}/g, BASE_URL)
          .replace(/{{GA_SCRIPT}}/g, analyticsScript);

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
