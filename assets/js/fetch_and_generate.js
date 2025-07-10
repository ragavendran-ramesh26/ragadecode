const fs = require("fs");
const path = require("path");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const METALS_API =
  "https://api.metals.dev/v1/latest?api_key=APKAB7KKG6EAHI9WNWJX5409WNWJX&currency=INR&unit=g";

const metalsTemplatePath = path.join(__dirname, "../../templates/template_metals.html");
const currencyTemplatePath = path.join(__dirname, "../../templates/template_currency.html");
const cacheFile = path.join(__dirname, "../../metals_cache.json");
const headerHtml = fs.readFileSync(path.join(__dirname, "../../templates/header.html"), "utf-8");
const footerHtml = fs.readFileSync(path.join(__dirname, "../../templates/footer.html"), "utf-8");
const OUTPUT_DIR = path.join(__dirname, "../../");

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

function formatINR(num) {
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatSeoDate(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDate();
  const suffix = day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th";
  const month = date.toLocaleString("default", { month: "long" });
  const year = date.getFullYear();
  return `${day}${suffix} ${month} ${year}`;
}

function formatReadableDate(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDate();
  const month = date.toLocaleString("default", { month: "long" });
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function buildPage(
  template,
  seoTitle,
  seoDescription,
  pageDescription,
  slug,
  content
) {
   

  return template
    .replace(/{{TITLE}}/g, seoTitle)
    .replace(/{{SEO_TITLE}}/g, seoTitle)
    .replace(/{{SEO_DESCRIPTION}}/g, seoDescription)
    .replace(/{{PAGE_DESCRIPTION}}/g, pageDescription)
    .replace(/{{SLUG}}/g, slug)
    .replace(/{{CONTENT}}/g, content)
    .replace(/{{BASE_DOMAIN}}/g, "https://ragadecode.com")
    .replace(/{{HEADER}}/g, headerHtml)
    .replace(/{{FOOTER}}/g, footerHtml)
    .replace(/{{GA_SCRIPT}}/g, gaScript);
}

async function fetchFreshData() {
  const res = await fetch(METALS_API);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return {
    date: new Date().toISOString().slice(0, 10),
    metals: data.metals,
    currencies: data.currencies,
  };
}

async function getCachedData() {
  const today = new Date().toISOString().slice(0, 10);

  if (fs.existsSync(cacheFile)) {
    const cache = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
    if (cache.date === today) {
      console.log("🔁 Pages not fetched, already cached.");
      return { ...cache, fresh: false };
    }
  }

  const freshData = await fetchFreshData();
  fs.writeFileSync(cacheFile, JSON.stringify(freshData, null, 2));
  console.log("✅ Pages fetched today from live API.");
  return { ...freshData, fresh: true };
}

async function generateStaticPages() {
  const { metals, currencies, date } = await getCachedData();

  const metalsTemplate = fs.readFileSync(metalsTemplatePath, "utf-8");
  const currencyTemplate = fs.readFileSync(currencyTemplatePath, "utf-8");

  const metalNames = ["gold", "silver", "platinum"];

  for (const metal of metalNames) {
    const price = metals[metal];
    const capitalized = metal.charAt(0).toUpperCase() + metal.slice(1);
    const formattedPrice = formatINR(price);
    const seoDate = formatSeoDate(date);
    const readableDate = formatReadableDate(date);

    const metalLabel = metal === "gold" ? "22K Gold" : capitalized;

    const seoTitle = `Today's ${metalLabel} Price in India (${seoDate})`;
    const seoDescription = `Find today's ${metalLabel.toLowerCase()} rate in India updated on ${seoDate}. Get accurate ${metalLabel.toLowerCase()} price per gram in INR. Includes historical price trends.`;

    const pageDescription = `Discover today's ${metalLabel.toLowerCase()} price in India updated live on ${seoDate}. Check the ${metalLabel.toLowerCase()} rate per gram in INR with accurate daily updates from trusted sources. Explore historical ${metalLabel.toLowerCase()} prices, recent fluctuations, and trends to help you make informed buying or selling decisions. Stay updated with India's latest ${metalLabel.toLowerCase()} market data, all in one place.`;

    const slug = `today-${metal}-price`;

    const otherMetals = metalNames.filter((m) => m !== metal);

const otherLinksHtml = otherMetals
  .map((m) => {
    const label = m.charAt(0).toUpperCase() + m.slice(1);
    return `<a class="btn btn-sm btn-outline-primary me-2 mt-2" href="/today-${m}-price">View ${label} Rate</a>`;
  })
  .join("");

  const mainContent = `
<section class="bg-light p-4 p-md-5 rounded shadow-sm mb-4">
  <h2 class="h4 fw-bold mb-3 text-primary">Today's ${metalLabel} Price in India</h2>

  <div class="d-flex flex-column flex-md-row align-items-center justify-content-between">
    <div class="fs-3 fw-semibold text-success mb-3 mb-md-0">
      <i class="fas"></i> ${formattedPrice} 
      <span class="fs-6 text-muted">/ gram</span>
    </div>
    <div class="d-flex flex-wrap justify-content-md-end">
      ${otherLinksHtml}
    </div>
  </div>
</section>`;
    // TODO: Replace with DB values from Neon later
    const historicalData = [
      { date: date, price: price },
      { date: "2025-07-03", price: price + 10 },
      { date: "2025-07-02", price: price + 5 },
    ];

    const historyTable = `
  <tbody>
    ${historicalData.map(
      (row) =>
        `<tr><td>${formatReadableDate(row.date)}</td><td>${formatINR(
          row.price
        )}</td><td>Gram</td></tr>`
    ).join("")}
  </tbody>
`;

    const fullContent = `${mainContent}\n${historyTable}`;
    const html = buildPage(
      metalsTemplate,
      seoTitle,
      seoDescription,
      pageDescription,
      slug,
      historyTable // ← only the table body rows here
    ).replace(/{{TODAY_RATE}}/g, mainContent); // inject highlighted block

    fs.writeFileSync(path.join(OUTPUT_DIR, `${slug}.html`), html);
  }

  const currencyTitle = `Today Currency Conversion Rate in India`;
  const currencySlug = "today-currency-conversion-rate";

  const currencyDescription = `Get today’s live currency exchange rates vs INR. Check how major global currencies like USD, EUR, GBP, JPY, and more compare to Indian Rupees. Updated daily with accurate Forex market feeds.`;

 const currencyContent = `
<section class="bg-light p-4 p-md-5 rounded shadow-sm mb-4">
  <h2 class="h5 fw-bold mb-4 text-primary">Top 5 Currencies vs INR</h2>
  <div class="row g-3">
    ${["USD", "EUR", "GBP", "JPY", "CNY"]
      .map(
        (code) => `
      <div class="col-sm-6 col-lg-4">
        <div class="border rounded p-3 bg-white text-center shadow-sm">
          <div class="fw-semibold">${code}</div>
          <div class="text-success fs-5">${formatINR(currencies[code])}</div>
        </div>
      </div>
    `
      )
      .join("")}
  </div>
</section>

<section class="mt-5">
  <h2 class="h5 fw-bold mb-4">All Currencies vs INR</h2>
  <div class="table-responsive">
    <table class="table table-striped table-bordered align-middle small">
      <thead class="table-light">
        <tr>
          <th scope="col">Currency</th>
          <th scope="col">Rate (INR)</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(currencies)
          .filter(([code]) => !["USD", "EUR", "GBP", "JPY", "CNY"].includes(code))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(
            ([code, val]) => `
          <tr>
            <td><strong>${code}</strong></td>
            <td>${formatINR(val)}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  </div>
</section>
`;



const currencyHtml = buildPage(
  currencyTemplate,
  currencyTitle,
  currencyDescription,           // SEO description
  currencyDescription,      // page description (used in {{PAGE_DESCRIPTION}})
  currencySlug,
  currencyContent
);
  fs.writeFileSync(path.join(OUTPUT_DIR, `${currencySlug}.html`), currencyHtml);

  console.log("📄 Pages generated:");
  console.log(" - today-gold-price.html");
  console.log(" - today-silver-price.html");
  console.log(" - today-platinum-price.html");
  console.log(" - today-currency-conversion-rate.html");
}

generateStaticPages().catch((err) => {
  console.error("❌ Error:", err);
});
