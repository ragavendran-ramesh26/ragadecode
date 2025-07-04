const fs = require("fs");
const path = require("path");
const glob = require("glob");
const { JSDOM } = require("jsdom");

const errors = [];
const warnings = [];

const ADSENSE_SCRIPT_SRC = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4195715781915036";


// Match all HTML files except node_modules, dist, etc.
const htmlFiles = glob.sync("**/*.html", {
  ignore: ["node_modules/**", "dist/**", "partials/**"],
});

htmlFiles.forEach((file) => {
  const content = fs.readFileSync(file, "utf-8");

  // 🔍 Check for any usage of https://www.ragadecode.com
  if (content.includes("https://www.ragadecode.com")) {
    warnings.push(`⚠️ ${file} contains link or reference to https://www.ragadecode.com — use https://ragadecode.com instead.`);
  }

  // 🔍 Check for any usage of *.html links (not just anchors)
  const htmlLinkPattern = /(["'])[^"']+\.html(["'])/gi;
  const matches = content.match(htmlLinkPattern);
  if (matches) {
    warnings.push(`⚠️ ${file} contains .html link(s): ${[...new Set(matches)].join(", ")}`);
  }

  const dom = new JSDOM(content);
  const { document } = dom.window;

  const title = document.querySelector("title");
  const description = document.querySelector("meta[name='description']");
  const canonical = document.querySelector("link[rel='canonical']");

  const missing = [];
  if (!title || !title.textContent.trim()) missing.push("title");
  if (!description || !description.content.trim()) missing.push("meta description");
  if (!canonical || !canonical.href.trim()) missing.push("canonical URL");

  if (missing.length > 0) {
    errors.push(`❌ ${file} is missing: ${missing.join(", ")}`);
  }

  // Check for <a href="*.html">
  const anchors = Array.from(document.querySelectorAll("a[href$='.html']"));
  if (anchors.length > 0) {
    anchors.forEach((a) => {
      warnings.push(`⚠️ ${file} contains .html link: ${a.outerHTML}`);
    });
  }


   // ✅ AdSense script check
  const adsScriptFound = Array.from(document.querySelectorAll("script"))
    .some(script => script.src.includes(ADSENSE_SCRIPT_SRC));

  if (!adsScriptFound) {
    warnings.push(`⚠️ ${file} is missing the AdSense script.`);
  }


});



if (errors.length > 0) {
  console.error("❌ Metadata checks failed:");
  errors.forEach((e) => console.error(e));
}

if (warnings.length > 0) {
  console.warn("\n⚠️ Warnings:");
  warnings.forEach((w) => console.warn(w));
}

if (errors.length > 0) {
  process.exit(1); // Hard fail on missing metadata
} else {
  console.log("✅ All pages have valid title, meta description, and canonical URL.");
  if (warnings.length === 0) {
    console.log("✅ No warnings found (no .html links or www.ragadecode.com references).");
  }
}
