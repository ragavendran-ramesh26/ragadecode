
const fs = require('fs-extra');

const dotenvPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
require('dotenv').config({ path: dotenvPath });

const path = require('path');
const marked = require('marked');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));


const BASE_DOMAIN = 'ragadecode.com';

const BASE_URL = `https://${BASE_DOMAIN}`;

const BASE_IMAGE_URL = ''; // Set to CDN base if needed
const TEMPLATE_PATH = './template_static.html';

// ✅ List of APIs to process
const API_CONFIGS = [
  {
    name: 'static-pages',
    apiUrl: 'https://genuine-compassion-eb21be0109.strapiapp.com/api/static-pages?populate=*',

    outputDir: './static-pages',
  }
];

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
        const category = attrs.category?.toLowerCase() || ''; 
        const createdAt = attrs.created_date || '';
        const documentId = attrs.documentId || article.id;
        const description = attrs.content;
        const markdown = attrs.content || '*No content available*';
        // const tags = attrs.Tags || '';
       


       

        const contentHTML = marked.parse(markdown);

         const tagHtml = (attrs.hashtags || [])
        .map(tag => {
          const name = tag.name || '';
          const slug = name.toLowerCase().replace(/\s+/g, '-');
          return `<span><a href="/tags/${slug}">#${name}</a></span>`;
        })
        .join(' ');

         
        const relatedArticlesHtml = buildRelatedArticlesHtml(attrs);

        const relatedArticlesSection = relatedArticlesHtml
        ? `<div class="related-articles">
              <h3>Related Articles</h3>
              <div class="related-box">
                <ul>
                  ${relatedArticlesHtml}
                </ul>
              </div>
          </div>`
        : '';

        const headerHtml = fs.readFileSync(path.join(__dirname, "partials/header.html"), "utf-8");
        const footerHtml = fs.readFileSync(path.join(__dirname, "partials/footer.html"), "utf-8");
        
        const pageHTML = template
          .replace(/{{TITLE}}/g, title)
          .replace(/{{DESCRIPTION}}/g, description)
          
          .replace(/{{CONTENT}}/g, contentHTML)
          .replace(/{{TAGS}}/g, tagHtml) // ✅ Insert tags
          .replace(/{{SLUG}}/g, slug)
          .replace(/{{DOC_ID}}/g, documentId)
          .replace(/{{SLUG_PREFIX}}/g, config.slugPrefix)
          .replace(/{{BASE_DOMAIN}}/g, BASE_URL)
          .replace(/{{GA_SCRIPT}}/g, analyticsScript)
          .replace(/{{HEADER}}/g, headerHtml)
          .replace(/{{FOOTER}}/g, footerHtml)
          .replace(/{{RELATED_ARTICLES_SECTION}}/g, relatedArticlesSection);
      
          // .replace(/{{RELATED_ARTICLES_HTML}}/g, relatedArticlesHtml);

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
