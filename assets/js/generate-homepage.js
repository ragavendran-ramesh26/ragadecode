const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const { isViralIndianNewsArticle, isNonViralIndianNewsArticle, isCrimeOrDeathTag, isFromMetroCity, isOttReleaseNonViral, isGadgetsArticle, getAffiliateBanner } = require('../../assets/js/filters');

// Paths
const TEMPLATE_PATH = path.join(__dirname, '../../templates/homepage_template.html');
const OUTPUT_PATH   = path.join(__dirname, '../../index.html');

const headerHtml = fs.readFileSync(path.join(__dirname, '../../templates/header.html'), 'utf-8');
const footerHtml = fs.readFileSync(path.join(__dirname, '../../templates/footer.html'), 'utf-8');
const API_CONFIG = require('../../assets/js/api-config');
const fetchWithAuth = require('../../assets/js/api-client');

// API endpoints
const API_URL       = API_CONFIG.NEWS_ARTICLES;
const TAGS_API      = API_CONFIG.TAGS_API;
const COUNTRIES_API = API_CONFIG.COUNTRIES_API;
const STATES_API    = API_CONFIG.STATES_API;
const CITIES_API    = API_CONFIG.CITIES_API;
const SEARCH_MEDIA = API_CONFIG.SEARCH_MEDIA;

// Google Analytics snippet
const gaScript = `
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-QEL34RBXBH"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){ dataLayer.push(arguments); }
  gtag('js', new Date());
  gtag('config', 'G-QEL34RBXBH');
</script>
`;

// Helpers to split lists into three columns
function splitList(data, size = 6) {
  const cols = [[], [], []];
  data.forEach((item, idx) => cols[Math.floor(idx/size)]?.push(item));
  return cols;
}
function splitCountries(countries) {
  const [c1,c2,c3] = splitList(countries);
  return `
    <div class="sub-columns">
      <ul>${c1.map(c=>`<li><a href="/locations/${c.slug}">${c.title}</a></li>`).join('')}</ul>
      <ul>${c2.map(c=>`<li><a href="/locations/${c.slug}">${c.title}</a></li>`).join('')}</ul>
      <ul>${c3.map(c=>`<li><a href="/locations/${c.slug}">${c.title}</a></li>`).join('')}</ul>
    </div>
  `;
}
function splitStates(states) {
  const [s1,s2,s3] = splitList(states);
  return `
    <div class="sub-columns">
      <ul>${s1.map(s=>`<li><a href="/locations/${s.country.slug}/${s.slug}">${s.title}</a></li>`).join('')}</ul>
      <ul>${s2.map(s=>`<li><a href="/locations/${s.country.slug}/${s.slug}">${s.title}</a></li>`).join('')}</ul>
      <ul>${s3.map(s=>`<li><a href="/locations/${s.country.slug}/${s.slug}">${s.title}</a></li>`).join('')}</ul>
    </div>
  `;
}
function splitCities(cities) {
  const [c1,c2,c3] = splitList(cities);
  const link = city => {
    const country = city.state?.country?.slug || 'unknown';
    const state   = city.state?.slug           || 'unknown';
    return `<li><a href="/locations/${country}/${state}/${city.slug}">${city.title}</a></li>`;
  };
  return `
    <div class="sub-columns">
      <ul>${c1.map(link).join('')}</ul>
      <ul>${c2.map(link).join('')}</ul>
      <ul>${c3.map(link).join('')}</ul>
    </div>
  `;
}

;(async () => {
  try {
    // Fetch tags
    const { data: tagData } = await fetchWithAuth(TAGS_API);
    const tagBoxHtml = tagData.map(tag => {
      const slug = tag.name.toLowerCase().replace(/\s+/g,'-');
      return `<span><a href="/tags/${slug}">#${tag.name}</a></span>`;
    }).join('\n');

    // Fetch regions
    const [{ data: countriesData }, { data: statesData }, { data: citiesData }] = await Promise.all([
      fetchWithAuth(COUNTRIES_API),
      fetchWithAuth(STATES_API),
      fetchWithAuth(CITIES_API),
    ]);
    statesData.forEach(s => {
      if (!s.country?.slug) console.warn(`⚠️ State missing country slug: ${s.title}`);
    });
    const regionHtml = `
      <section class="region-wrapper">
        <div class="section-title"><h3>Explore News by Location</h3></div>
        <div class="region-columns">
          <div class="region-column"><h4>Countries</h4>${splitCountries(countriesData)}</div>
          <div class="region-column"><h4>States</h4>${splitStates(statesData)}</div>
          <div class="region-column"><h4>Cities</h4>${splitCities(citiesData)}</div>
        </div>
        <div class="view-more-link"><a href="#">View More Locations →</a></div>
      </section>
    `;

    // Fetch articles
    const { data: articles } = await fetchWithAuth(API_URL);

    // Deduplication helper
    const usedSlugs = new Set();
    function getNextArticles(pool, count) {
      const out = [];
      for (const a of pool) {
        if (!usedSlugs.has(a.slug)) {
          out.push(a);
          usedSlugs.add(a.slug);
          if (out.length === count) break;
        }
      }
      return out;
    }

    // Common filters
    // const metroCities = ['delhi','mumbai','chennai','kolkata','bangalore','hyderabad'];
    // const nonMetro     = articles.filter(a=>!(a.cities||[]).some(c=>metroCities.includes(c.slug?.toLowerCase())));
     

    // SECTION 1: Hero Carousel (viral + India)
    const section1Pool = articles.filter(isViralIndianNewsArticle);
    const section1Articles = getNextArticles(section1Pool, 5);
    const section1Html = `
      <section class="section-1-feature py-5 border-bottom">
        <div class="container">
          <div id="heroCarousel" class="carousel slide" data-bs-ride="carousel" data-bs-interval="7000">
            <div class="carousel-inner">
              ${section1Articles.map((art,i)=>{ 
                const img = art.coverimage?.url||'/assets/default.jpg';
                const dt  = new Date(art.publishedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
                const titleWords = art.Title.split(' ');
                const last = titleWords.pop();
                const excerpt = marked.parse((art.short_description||'').slice(0,200));
                return `
                  <div class="carousel-item ${i===0?'active':''}">
                    <div class="row align-items-center g-4 flex-column flex-md-row">
                      <div class="col-md-6">
                        <a href="/${art.category?.slug||'news-article'}/${art.slug}">
                          <img src="${img}" class="img-fluid rounded w-100" style="max-height:400px" alt="">
                        </a>
                        <div class="mt-2"><small class="text-muted">By ${art.author?.name||'RagaDecode'} • ${dt}</small></div>
                      </div>
                      <div class="col-md-6">
                        <a href="/${art.category?.slug||'news-article'}/${art.slug}" class="text-decoration-none text-dark">
                          <h2 class="fw-bold lh-base">${titleWords.join(' ')} <span class="text-highlights">${last}</span></h2>
                          <p class="text-muted mt-3">${excerpt}</p>
                        </a>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
            <div class="d-flex justify-content-center mt-4 mb-2">
              <div class="carousel-indicators custom-dots">
                ${section1Articles.map((_,i)=>`
                  <button type="button" data-bs-target="#heroCarousel" data-bs-slide-to="${i}" class="${i===0?'active':''}"></button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </section>
    `;

    // SECTION 2: Full Story (news-article, non-metro, not viral, India)
    // const section2Pool     = articles.filter(isNonViralIndianNewsArticle);
     const section2Articles = articles
      .filter(isNonViralIndianNewsArticle)  // ✅ Step 1: find all matching
      .slice(0, 10);                          // ✅ Step 2: take top 4

    // const section2Articles = getNextArticles(section2Pool, 4);
    const [sec2Main, ...sec2Others] = section2Articles;
    const section2Html = sec2Main ? `
      <section class="section-2-feature py-5 border-bottom">
        <div class="container">
          <div class="d-flex justify-content-between mb-4">
            <h2 class="fw-bold">Most <span class="text-warning">Recent</span></h2>
            <a href="/news-article" class="text-primary fw-semibold">See All</a>
          </div>
          <div class="row align-items-center g-4 flex-column flex-md-row mb-4">
            <div class="col-md-12">
              <a href="/news-article/${sec2Main.slug}" class="text-decoration-none text-dark">
                <h3 class="fw-bold">${sec2Main.Title}</h3>
              </a>
              <small class="text-muted d-block mb-2">By ${sec2Main.author?.name||'RagaDecode'} • ${new Date(sec2Main.publishedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</small>
              <p class="text-muted">${marked.parse((sec2Main.short_description||'').slice(0,550))} <a href="/news-article/${sec2Main.slug}">Read More...</a></p>
            </div>
            <div class="col-md-12">
              <a href="/news-article/${sec2Main.slug}">
                <img src="${sec2Main.coverimage?.url||'/assets/default.jpg'}" class="img-fluid rounded shadow-sm w-100" style="object-fit:cover;max-height:250px" alt="">
              </a>
            </div>
          </div>
          <div class="row g-4">
            ${sec2Others.map(story=>`
              <div class="col-md-6 col-lg-4">
                <a href="/news-article/${story.slug}" class="text-decoration-none">
                  <div class="card border-0 h-100">
                    <img src="${story.coverimage?.url||'/assets/default.jpg'}" class="card-img-top rounded" style="object-fit:cover;height:200px" alt="">
                    <div class="card-body px-0">
                      <small class="text-muted d-block mb-1">By ${story.author?.name||'Unknown'} • ${new Date(story.publishedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</small>
                      <h5 class="card-title fw-semibold">${story.Title}</h5>
                      <p>${story.short_description}</p>
                    </div>
                  </div>
                </a>
              </div>
            `).join('')}
          </div>
        </div>
      </section>
    ` : '';

    // SECTION 3: Highlight (news-article, non-metro, not viral)
    // let section3Articles = articles.filter(isNonViralIndianNewsArticle);
     const section3Articles = articles
      .filter(isNonViralIndianNewsArticle)  // ✅ Step 1: find all matching
      .slice(10, 14);     
    const [sec3Main, ...sec3Side] = section3Articles;
    const section3Html = sec3Main ? `
      <section class="section-3-highlight py-5 border-bottom">
        <div class="container">
          <div class="d-flex justify-content-between mb-4">
            <h2 class="fw-bold">Full <span class="text-warning">Read</span></h2>
            <a href="/news-article" class="text-dark fw-semibold">See All</a>
          </div>
          <div class="row g-4">
            <div class="col-lg-8">
              <a href="/news-article/${sec3Main.slug}">
                <img src="${sec3Main.coverimage?.url||'/assets/default.jpg'}" class="img-fluid rounded w-100" style="object-fit:cover;max-height:400px" alt="">
              </a>
              <div class="mt-3">
                <a href="/news-article/${sec3Main.slug}" class="text-decoration-none text-dark">
                  <h3 class="fw-bold">${sec3Main.Title}</h3>
                  <small class="text-muted">By ${sec3Main.author?.name||'RagaDecode'} • ${new Date(sec3Main.publishedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</small>
                  <p class="mt-2 text-muted">${marked.parse((sec3Main.short_description||'').slice(0,300))}</p>
                </a>
              </div>
            </div>
            <div class="col-lg-4">
              ${sec3Side.map(art=>`
                <div class="d-flex mb-3">
                  <div style="width:90px;height:60px;flex-shrink:0">
                    <a href="/${art.category.slug}/${art.slug}">
                      <img src="${art.coverimage?.url||'/assets/default.jpg'}" class="img-fluid rounded" style="object-fit:cover;width:100%;height:100%" alt="">
                    </a>
                  </div>
                  <div class="ps-3">
                    <a href="/${art.category.slug}/${art.slug}" class="text-decoration-none text-dark">
                      <p class="mb-0 small fw-semibold">${art.Title}</p>
                      <small class="text-muted d-block mb-1">${new Date(art.publishedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</small>
                    </a>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </section>
    ` : '';

    // SECTION 4: Most See (news-article, non-metro)
    // const sec4Pool       = nonMetro.filter(a=> a.category?.slug==='news-article');
    // const sec4Candidates = getNextArticles(sec4Pool, 5);

    const section4ArticlesRaw = articles
      .filter(isCrimeOrDeathTag); // ✅ Step 1: find all matching
      
    const section3Slugs = new Set(section3Articles.map(a => a.slug));
    const section2Slugs = new Set(section2Articles.map(a => a.slug));

    const section4ArticlesFiltered = section4ArticlesRaw.filter(a => !section3Slugs.has(a.slug) && !section2Slugs.has(a.slug)); 

    const [sec4Main, ...sec4Grid] = section4ArticlesFiltered.slice(0,13);

    console.log("Section 4 Picked Titles:", [sec4Main?.Title, ...sec4Grid.map(a => a.Title)]);
  

    const section4Html = sec4Main && sec4Grid.length === 12 ?`
    
      <section class="section-4-mostsee py-5 border-bottom">
        <div class="container">
          <div class="d-flex justify-content-between mb-4">
            <h2 class="fw-bold">Most <span class="text-warning">See</span></h2>
            <a href="/news-article" class="text-dark fw-semibold">See All</a>
          </div>
          <div class="row g-4">
            <div class="col-lg-12">
              <a href="/news-article/${sec4Main.slug}">
                <img src="${sec4Main.coverimage?.url||'/assets/default.jpg'}" class="img-fluid rounded w-100" style="object-fit:cover;max-height:400px" alt="">
              </a>
              <div class="mt-3">
                <small class="text-muted">By ${sec4Main.author?.name||'RagaDecode'} • ${new Date(sec4Main.publishedAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</small>
                <h3 class="fw-bold mt-2">${sec4Main.Title}</h3>
                <p class="text-muted">${sec4Main.short_description?.slice(0,300)} <a href="/news-article/${sec4Main.slug}" class="text-decoration-none">Read More...</a></p>
              </div>
            </div>
            <div class="col-lg-12">
              <div class="row">
                ${sec4Grid.map(art=>`
                  <div class="col-sm-2 mb-4">
                    <a href="/${art.category.slug}/${art.slug}" class="text-decoration-none">
                      <img src="${art.coverimage?.url||'/assets/default.jpg'}" class="img-fluid rounded mb-2 w-100" style="object-fit:cover;height:150px" alt="">
                      <div class="d-flex align-items-center text-muted" style="font-size:13px">
                        <i class="bi bi-clock me-1"></i>${new Date(art.publishedAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}
                      </div>
                      <h6 class="fw-semibold text-dark">${art.Title}</h6>
                    </a>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </section>
    ` : '';

    // SECTION 5: Thematic Grid
    const themes = ['automobile','technologies','indian-railways','airlines'];
    const section5Html = `
      <section class="section-5-grid py-5 border-bottom">
        <div class="container"><div class="row">
          ${themes.map(slug=>{
            const pool = articles.filter(a=>a.category?.slug===slug);
            if (!pool.length) return '';
            const feat = pool[0];
            const subs = pool.slice(1,4);
            return `
              <div class="col-md-6 col-xl-3 mb-4">
                <div class="mb-2 d-flex justify-content-between border-bottom pb-1">
                  <h6 class="text-uppercase fw-bold mb-0">${feat.category.name}</h6>
                  <a href="/${slug}" class="text-dark">›</a>
                </div>
                <a href="/${slug}/${feat.slug}">
                  <img src="${feat.coverimage?.url||'/assets/default.jpg'}" class="img-fluid rounded mb-2 w-100" style="object-fit:cover;height:180px" alt="">
                </a>
                <a href="/${slug}/${feat.slug}" class="fw-semibold text-dark d-block mb-2">${feat.Title}</a>
                <small class="text-muted">${new Date(feat.publishedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</small>
                <p class="text-muted small">${feat.short_description||''}</p>
                ${subs.map(s=>`
                  <div class="d-flex flex-column border-top pt-2 mt-2">
                    <small class="text-muted">${new Date(s.publishedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</small>
                    <a href="/${slug}/${s.slug}" class="fw-semibold text-dark">${s.Title}</a>
                  </div>
                `).join('')}
              </div>
            `;
          }).join('')}
        </div></div>
      </section>
    `;


const metroArticles = articles.filter(isFromMetroCity);

// Group by city slug
const cityMap = new Map();

metroArticles.forEach(article => {
  (article.cities || []).forEach(city => {
    const slug = city.slug?.toLowerCase();
    if (!slug) return;
    if (!cityMap.has(slug)) cityMap.set(slug, []);
    cityMap.get(slug).push(article);
  });
});

// Sort alphabetically by city title
const sortedCityEntries = Array.from(cityMap.entries()).sort(([slugA, articlesA], [slugB, articlesB]) => {
  const titleA = articlesA[0]?.cities.find(c => c.slug?.toLowerCase() === slugA)?.title?.toLowerCase() || '';
  const titleB = articlesB[0]?.cities.find(c => c.slug?.toLowerCase() === slugB)?.title?.toLowerCase() || '';
  return titleA.localeCompare(titleB);
});

// Now build the section HTML
const section6Html = `
  <section class="section-6-cities py-5 border-bottom">
    <div class="container">
      <div class="d-flex justify-content-between mb-4">
        <h2 class="fw-bold">From India’s Metro Cities</h2>
        <a href="/locations/india" class="text-primary fw-semibold">See All Cities</a>
      </div>
      <div class="row">
        ${sortedCityEntries.map(([citySlug, cityArticles]) => {
          if (!cityArticles.length) return '';

          const feat = cityArticles[0];
          const subs = cityArticles.slice(1, 4);
          const cityTitle = feat.cities.find(c => c.slug.toLowerCase() === citySlug)?.title || citySlug;
          const stateSlug = feat.states?.[0]?.slug || 'unknown';

          return `
            <div class="col-md-6 col-xl-4 mb-4">
              <div class="border-bottom mb-2 pb-1 d-flex justify-content-between">
                <h6 class="fw-bold text-uppercase mb-0">${cityTitle}</h6>
                <a href="/locations/india/${stateSlug}/${citySlug}" class="text-dark">›</a>
              </div>
              <a href="/${feat.category.slug}/${feat.slug}">
                <img src="${feat.coverimage?.url || '/assets/default.jpg'}" class="img-fluid rounded mb-2 w-100" style="object-fit:cover;height:180px" alt="">
              </a>
              <a href="/${feat.category.slug}/${feat.slug}" class="fw-semibold text-dark d-block mb-2">${feat.Title}</a>
              ${subs.map(s => `
                <div class="border-top pt-2 mt-2">
                  <small class="text-muted">${new Date(s.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</small><br>
                  <a href="/${s.category.slug}/${s.slug}" class="text-dark fw-medium">${s.Title}</a>
                </div>
              `).join('')}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  </section>
`;

const ottReleaseArticles = articles.filter(isOttReleaseNonViral).slice(0, 5); // top 5

const ottReleaseHtml = ottReleaseArticles.length ? `
  <div class="mb-4">
    <h5 class="fw-bold border-bottom pb-2 mb-3">OTT Releases</h5>
    ${ottReleaseArticles.map(a => `
      <div class="d-flex mb-3">
        <a href="/${a.category.slug}/${a.slug}" class="me-2" style="flex-shrink:0;">
          <img src="${a.coverimage?.url || '/assets/default.jpg'}" alt="cover" class="rounded" style="width:64px;height:64px;object-fit:cover;">
        </a>
        <div>
          <a href="/${a.category.slug}/${a.slug}" class="fw-semibold text-dark d-block mb-1" style="font-size: 0.95rem;">
            ${a.Title}
          </a>
          <small class="text-muted">${new Date(a.publishedAt).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric'
          })}</small>
        </div>
      </div>
    `).join('')}
  </div>
` : '';


const gadgetsArticles = articles.filter(isGadgetsArticle).slice(0, 5);

const gadgetsSectionHtml = gadgetsArticles.length ? `
  <div class="mb-4">
    <h5 class="fw-bold border-bottom pb-2 mb-3">Gadgets</h5>
    ${gadgetsArticles.map(article => `
      <div class="d-flex mb-3">
        <a href="/${article.category.slug}/${article.slug}" class="me-2" style="flex-shrink:0;">
          <img src="${article.coverimage?.url || '/assets/default.jpg'}" alt="cover" class="rounded" style="width:64px;height:64px;object-fit:cover;">
        </a>
        <div>
          <a href="/${article.category.slug}/${article.slug}" class="fw-semibold text-dark d-block mb-1" style="font-size: 0.95rem;">
            ${article.Title}
          </a>
          <small class="text-muted">
            ${new Date(article.publishedAt).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric'
            })}
          </small>
        </div>
      </div>
    `).join('')}
  </div>
` : '';


let mediaList = [];

try {
   const res = await fetchWithAuth(`${SEARCH_MEDIA}?search=affiliate`);
   mediaList = res;
   
} catch (error) {
  console.error("❌ Error fetching affiliate media:", error);
}

 






    // Inject into template
    const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
    const pageHtml = template
      .replace('{{GA_SCRIPT}}',      gaScript)
      .replace('{{HEADER}}',         headerHtml)
      .replace('{{SECTION_1}}',      section1Html)
      .replace('{{SECTION_2}}',      section2Html)
      .replace('{{SECTION_3}}',      section3Html)
      .replace('{{SECTION_4}}',      section4Html)
      .replace('{{SECTION_5}}',      section5Html)
      .replace('{{SECTION_6}}',      section6Html)
      .replace('{{SECTION_OTT}}',      ottReleaseHtml)
      .replace('{{SECTION_GADGETS}}',      gadgetsSectionHtml)
      .replace('{{REGION_SECTION}}', regionHtml)
      .replace('{{FOOTER}}',         footerHtml);

    await fs.writeFile(OUTPUT_PATH, pageHtml);
    console.log('✅ index.html generated successfully');
  }
  catch (err) {
    console.error('❌ Failed to generate homepage:', err);
  }
})();
