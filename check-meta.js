const fs = require("fs");
const path = require("path");
const glob = require("glob");
const { JSDOM } = require("jsdom");

const errors = [];
const warnings = [];

// Match all HTML files except node_modules, dist, etc.
const htmlFiles = glob.sync("**/*.html", {
  ignore: ["node_modules/**", "dist/**"],
});

htmlFiles.forEach((file) => {
  const content = fs.readFileSync(file, "utf-8");
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
});

if (errors.length > 0) {
  console.error("❌ Metadata checks failed:");
  errors.forEach((e) => console.error(e));
}

if (warnings.length > 0) {
  console.warn("\n⚠️ .html href warnings:");
  warnings.forEach((w) => console.warn(w));
}

if (errors.length > 0) {
  process.exit(1); // Hard fail on missing metadata
} else {
  console.log("✅ All pages have valid title, meta description, and canonical URL.");
  if (warnings.length === 0) {
    console.log("✅ No <a href> tags contain .html links.");
  }
}
