const fs = require("fs");
const path = require("path");
const glob = require("glob");
const { JSDOM } = require("jsdom");

const errors = [];

const htmlFiles = glob.sync("**/*.html", {
  ignore: ["node_modules/**", "dist/**"], // adjust as needed
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
});

if (errors.length > 0) {
  console.error("Metadata checks failed:");
  errors.forEach((e) => console.error(e));
  process.exit(1); // 🔴 fail
} else {
  console.log("✅ All pages have valid title, meta description, and canonical URL.");
}
