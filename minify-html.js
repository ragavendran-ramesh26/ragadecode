const fs = require("fs-extra");
const path = require("path");
const { glob } = require("glob");
const { minify } = require("html-minifier-terser");
const chalk = require("chalk");

const ROOT_DIR = __dirname;
let totalOriginalSize = 0;
let totalMinifiedSize = 0;
let skippedFiles = [];

(async () => {
  console.log(chalk.cyan(`🔍 Scanning all .html files from: ${ROOT_DIR} (excluding /templates)`));

  const files = await glob("**/*.html", {
    cwd: ROOT_DIR,
    ignore: ["templates/**", "node_modules/**"],
    absolute: true,
  });

  if (files.length === 0) {
    console.log(chalk.yellow("⚠️ No HTML files found."));
    return;
  }

  console.log(chalk.green(`🧠 Found ${files.length} HTML file(s). Starting minification...\n`));

  for (const filePath of files) {
    try {
      const original = await fs.readFile(filePath, "utf-8");
      const originalSize = Buffer.byteLength(original, "utf8");

      const minified = await minify(original, {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        minifyJS: true,
        minifyCSS: true,
        decodeEntities: true,
      });

      const minifiedSize = Buffer.byteLength(minified, "utf8");

      // Write minified HTML
      await fs.writeFile(filePath, minified);

      totalOriginalSize += originalSize;
      totalMinifiedSize += minifiedSize;

      const saved = originalSize - minifiedSize;
      const percent = ((saved / originalSize) * 100).toFixed(2);

      console.log(
        chalk.green(`✅ Minified: ${path.relative(ROOT_DIR, filePath)}`) +
          chalk.gray(` — saved ${saved} bytes (${percent}%)`)
      );
    } catch (err) {
      skippedFiles.push({ file: filePath, reason: err.message });
      console.log(chalk.red(`⚠️ Skipped ${filePath}: ${err.message}`));
    }
  }

  // Summary
  const totalSaved = totalOriginalSize - totalMinifiedSize;
  const totalPercent = ((totalSaved / totalOriginalSize) * 100).toFixed(2);

  console.log("\n" + chalk.bold("📊 Minification Summary"));
  console.log(chalk.white(`🔹 Total original size: ${totalOriginalSize} bytes`));
  console.log(chalk.white(`🔹 Total minified size: ${totalMinifiedSize} bytes`));
  console.log(chalk.green(`🔹 Total saved: ${totalSaved} bytes (${totalPercent}%)`));

  if (skippedFiles.length > 0) {
    console.log("\n" + chalk.bold.red(`⚠️ Skipped Files (${skippedFiles.length}):`));
    skippedFiles.forEach(({ file, reason }) => {
      console.log(`• ${path.relative(ROOT_DIR, file)} — ${reason}`);
    });
  }

  console.log(chalk.bold.green("\n🎉 Minification completed!"));
})();
