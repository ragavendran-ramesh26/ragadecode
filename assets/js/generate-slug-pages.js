const fs = require('fs-extra');
const dotenvPath = fs.existsSync('.env.local') ? '.env.local' : '.env';
require('dotenv').config({ path: dotenvPath });
 

const path = require('path');
const marked = require('marked');
const renderer = new marked.Renderer();


// --- HTML Escape Utility Function ---
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
// ------------------------------------

const BASE_DOMAIN = 'ragadecode.com';
const BASE_URL = `https://${BASE_DOMAIN}`;
const BASE_IMAGE_URL = "";
const TEMPLATE_PATH = path.join(__dirname, "../../templates/template.html");
const default_img = "https://ragadecode.com/assets/default-image.png";

const headerHtml = fs.readFileSync(path.join(__dirname, "../../templates/header.html"), "utf-8");
const footerHtml = fs.readFileSync(path.join(__dirname, "../../templates/footer.html"), "utf-8");
const API_CONFIG_URL = require("../../assets/js/api-config");

const API_CONFIGS = [
  {
    name: 'news-articles',
    apiUrl: API_CONFIG_URL.FULL_SLUG_ARTICLE
  },
];

const fetch = require('../../assets/js/api-client');

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

function cleanMarkdown(md) {
  return md
    // The previous fix for newlines was correct for tables. Keep this as is.
    // Ensure this does NOT remove essential newlines for table structure.
    .replace(/\|\s*\n/g, '|\n')
    .replace(/^\s*\|/gm, '|')
    .replace(/\|\s*$/gm, '|')
    .trim();
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
    const short_description = attr.short_description || '';

  
    const publishedRaw = attr.publishedat || attr.publishedAt || attr.createdAt;
    const published = new Date(publishedRaw).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
    // const publisedISO = new Date(publishedRaw); // This variable is not used after its declaration

    const authorName = attr.author?.name;
   
    // const fullImageUrl = imageUrl ? `${BASE_IMAGE_URL}${imageUrl}` : '/assets/default.jpg';

    if (!relatedSlug || !categorySlug) return '';

    return `
      <div class="col-12 col-sm-6 col-md-6 col-lg-4">
        <div class="card related-card h-100">
          <a href="/${categorySlug}/${relatedSlug}" class="text-decoration-none text-dark">
            <img src="${imageUrl}" class="card-img-top rounded" style="height:350px;"  alt="${relatedTitle}" loading="lazy" />
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



renderer.blockquote = function (obj) {
  // console.log('--- DEBUG: renderer.blockquote called ---'); // Keep or remove as needed
  // console.log('Type of obj:', typeof obj);                 // Keep or remove as needed
  // console.log('obj content:', JSON.stringify(obj, null, 2)); // Keep or remove as needed
  // console.log('---------------------------------------');     // Keep or remove as needed

  let contentHtml = '';

  if (typeof obj === 'string') {
    // This case means marked already provided the processed HTML
    contentHtml = obj;
  } else if (obj && typeof obj === 'object') {
    let rawContentToParse = '';

    // Prioritize obj.raw, but strip leading '>' characters
    if (typeof obj.raw === 'string') {
      // Remove leading '>' and any space following it.
      // This is crucial to prevent re-parsing a blockquote as a blockquote.
      rawContentToParse = obj.raw.replace(/^>\s*/gm, ''); // Regex: start of line, '>', optional space, global, multiline
    }

    // Now, parse this cleaned raw content.
    // Use marked.parse for block-level content within the blockquote (like paragraphs, lists inside quote)
    // Use marked.parseInline if you ONLY expect inline content (no paragraphs, lists etc within quote)
    // Based on your example, `**Flat...**` is a paragraph with strong text, so `marked.parse` is appropriate.
    if (rawContentToParse.trim() !== '') {
      try {
        contentHtml = marked.parse(rawContentToParse.trim());
      } catch (e) {
        console.error('ERROR: marked.parse failed within blockquote renderer for cleaned rawContent:', rawContentToParse, e);
        // Fallback: If parsing fails, just escape the text content.
        // It's safer to use obj.text here, as rawContentToParse might still be problematic if the regex didn't catch everything.
        contentHtml = escapeHtml(obj.text || '');
      }
    } else {
      // If after stripping '>', content is empty, use obj.text (which might be empty too) and escape.
      contentHtml = escapeHtml(obj.text || '');
    }

  } else {
    // Fallback for unexpected obj type
    console.warn('⚠️ Unexpected blockquote object structure (non-string, non-object):', obj);
    contentHtml = escapeHtml(String(obj || ''));
  }

  // Wrap it in Bootstrap's blockquote structure.
  return `
    <blockquote class="blockquote">
      ${contentHtml || ''}
    </blockquote>
  `;
};

renderer.table = function (header, body) {
  let finalHeaderHtml = '';
  let finalBodyHtml = '';

  // Case 1: Marked correctly passed header and body as strings (ideal for some Marked versions)
  if (typeof header === 'string' && typeof body === 'string') {
    finalHeaderHtml = header;
    finalBodyHtml = body;
  }
  // Case 2: Marked passed the whole table object as 'header', and 'body' is undefined (your current situation)
  else if (header && typeof header === 'object' && body === undefined) {
    // console.warn('⚠️ Marked passed table object as header, and body is undefined. Manually constructing table HTML.', header); // Keep for debugging if needed

    // Build Header (<thead>)
    if (header.header && Array.isArray(header.header)) {
      const headerCells = header.header.map(cell => {
        let cellContent;
        // Check if cell.raw exists and is not null/undefined for parseInline
        // Also check if cell.tokens is present, indicating marked has parsed inline content
        if (cell.tokens && typeof cell.raw === 'string') {
          cellContent = marked.parseInline(cell.raw);
        } else {
          // Fallback to text and escape HTML if no tokens or raw content
          cellContent = escapeHtml(cell.text || '');
        }
        return `<th>${cellContent}</th>`;
      }).join('');
      finalHeaderHtml = `<tr>${headerCells}</tr>`;
    }

    // Build Body (<tbody>)
    if (header.rows && Array.isArray(header.rows)) {
      finalBodyHtml = header.rows.map(row => {
        const rowCells = row.map(cell => {
          let cellContent;
          // Check if cell.raw exists and is not null/undefined for parseInline
          // Also check if cell.tokens is present, indicating marked has parsed inline content
          if (cell.tokens && typeof cell.raw === 'string') {
            cellContent = marked.parseInline(cell.raw);
          } else {
            // Fallback to text and escape HTML if no tokens or raw content
            cellContent = escapeHtml(cell.text || '');
          }
          return `<td>${cellContent}</td>`;
        }).join('');
        return `<tr>${rowCells}</tr>`;
      }).join('');
    }
  }
  // Fallback for any other unexpected input
  else {
    console.warn('⚠️ Unexpected input to renderer.table. Attempting to stringify or use raw.', { header, body });
    finalHeaderHtml = (header && typeof header === 'object' && header.raw) ? String(header.raw) : String(header || '');
    finalBodyHtml = (body && typeof body === 'object' && body.raw) ? String(body.raw) : String(body || '');
  }

  // If after all attempts, they are still empty or look problematic, return nothing
  if (!finalHeaderHtml.trim() && !finalBodyHtml.trim()) {
    console.warn('⚠️ No substantial content for table header or body after processing. Returning empty table.');
    return '';
  }

  // Wrap with Bootstrap table classes
  return `
    <div class="table-responsive">
      <table class="table table-bordered table-striped">
        <thead>${finalHeaderHtml}</thead>
        <tbody>${finalBodyHtml}</tbody>
      </table>
    </div>
  `;
};

marked.setOptions({
  renderer: renderer,
  gfm: true,
  breaks: true, // important for handling newlines in cells
  tables: true,
  pedantic: false,
  smartLists: true,
  smartypants: false,
  // DO NOT use sanitize: true if you expect any HTML in your markdown,
  // or if you want custom renderers to output HTML.
  sanitize: false 
});
 
(async () => {
  try {
    const template = await fs.readFile(TEMPLATE_PATH, 'utf8');
    for (const config of API_CONFIGS) {
      console.log(`🔄 Fetching articles for ${config.name}...`);
      
      const { data } = await fetch(config.apiUrl);  // ✅ simplified and correct


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

        const cleanedMarkdown = cleanMarkdown(markdown);
        const contentHTML = marked.parse(cleanedMarkdown);
         const tagHtml = (attrs.hashtags || []).map(tag => {
          const name = tag.name || '';
          const slug = name.toLowerCase().replace(/\s+/g, '-');
          return `<span><a href="/tags/${slug}" class="hashtag">#${name}</a></span>`;
        }).join(' ');

        const relatedArticlesHtml = buildRelatedArticlesHtml(attrs);
        const relatedArticlesSection = relatedArticlesHtml
        ? `<div class="related-articles row g-4 mb-4">${relatedArticlesHtml}</div>`
        : '';
        const ldJsonScript = buildLDJson({ title, coverImageUrl, publishedRaw, lastModifiedUTC, authorName: attrs.author?.name || 'Ragavendran Ramesh', authorSlug: attrs.author?.slug || 'ragavendran-ramesh', slugPrefix: categorySlug, slug, description, category, keywords, schema_details });

        const analyticsScript = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-QEL34RBXBH"></script><script>window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-QEL34RBXBH');</script>`;


const faqs = attrs.faq || [];

let faqSectionRHS = '';
let faqSectionBottom = '';

if (faqs.length > 0) {
  const faqTop15 = faqs.slice(0, 15);
  const faqRemaining = faqs.slice(15);

  const buildFaqItems = (faqList) => {
    return faqList.map((item, index) => {
      const q = escapeHtml(item.question || `Q${index + 1}`);
      const a = escapeHtml(item.answer || '');
      return `
        <div class="faq-item mb-4">
          <div class="faq-question">
            <i class="fas fa-question-circle text-primary me-2"></i> ${q}
          </div>
          <div class="faq-answer mt-2">
            ${a}
          </div>
        </div>
      `;
    }).join('\n');
  };

  if (faqTop15.length > 0) {
    faqSectionRHS = `
      <section class="faq-section">
        <h3 class="text-center  mb-4">Quick Info</h3>
        ${buildFaqItems(faqTop15)}
      </section>
    `;
  }

  if (faqRemaining.length > 0) {
    faqSectionBottom = `
      <section class="faq-section">
        <h3 class="text-center mb-4">In-Depth Answers</h3>
        ${buildFaqItems(faqRemaining)}
      </section>
    `;
  }
}


const encodedUrl = encodeURIComponent(`${BASE_URL}/${categorySlug}/${slug}`);
const encodedTitle = encodeURIComponent(title);

const shareButtonsBlock = `
<div class="text-center">
  <h5 class="mb-3">Share this article</h5>
  <div class="share-buttons">
    <a href="https://wa.me/?text=${encodedTitle}%20${encodedUrl}" target="_blank" class="btn btn-success" aria-label="Share on WhatsApp">
      <i class="fab fa-whatsapp"></i><span>WhatsApp</span>
    </a>
    <a href="https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}" target="_blank" class="btn btn-primary" aria-label="Share on Twitter">
      <i class="fab fa-twitter"></i><span>Twitter</span>
    </a>
    <a href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank" class="btn btn-info" aria-label="Share on Facebook">
      <i class="fab fa-facebook-f"></i><span>Facebook</span>
    </a>
    <button onclick="copyToClipboard('${BASE_URL}/${categorySlug}/${slug}')" class="btn btn-dark" aria-label="Copy Link">
      <i class="fas fa-link"></i><span>Copy</span>
    </button>
  </div>
  <div id="copy-toast">Link copied!</div>
</div>
<script>
function copyToClipboard(url) {
  navigator.clipboard.writeText(url).then(() => {
    const toast = document.getElementById('copy-toast');
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 2000);
  }).catch(err => {
    console.error('Failed to copy: ', err);
  });
}
</script>
`;



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
          .replace(/{{FAQ_SECTION_RHS}}/g, faqSectionRHS)
          .replace(/{{FAQ_SECTION_BOTTOM}}/g, faqSectionBottom)
          .replace(/{{HEADER}}/g, headerHtml)
          .replace(/{{FOOTER}}/g, footerHtml)
          .replace(/{{SHARE_BUTTONS}}/g, shareButtonsBlock)
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