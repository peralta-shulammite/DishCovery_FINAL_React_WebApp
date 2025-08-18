const fs = require("fs");
const path = require("path");

const targetDir = path.resolve(__dirname, "src");

// Detect hardcoded localhost URLs
const localhostRegex =
  /(['"`])http:\/\/localhost:5000\/api([^'"`]*)\1/g;

// Ensure `API_BASE_URL` is declared at top of the file
const apiBaseDeclaration =
  `const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;\n`;

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let updated = false;

  // Collect previews
  let previews = [];

  // Replace localhost references with API_BASE_URL
  content = content.replace(localhostRegex, (match, quote, rest) => {
    const replacement = `\`${"${API_BASE_URL}"}${rest}\``;
    previews.push({ before: match, after: replacement });
    updated = true;
    return replacement;
  });

  // If file had replacements but no API_BASE_URL defined, add it at the top
  if (updated && !content.includes("API_BASE_URL")) {
    content = apiBaseDeclaration + content;
  }

  if (updated) {
    // Show previews
    console.log(`\n📂 File: ${filePath}`);
    previews.forEach((p, idx) => {
      console.log(`   🔎 Found #${idx + 1}: ${p.before}`);
      console.log(`   ✅ Replaced → ${p.after}\n`);
    });

    // Write back the updated content
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`💾 Saved fixes in: ${filePath}`);
  }
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith(".js") || fullPath.endsWith(".jsx")) {
      replaceInFile(fullPath);
    }
  });
}

walkDir(targetDir);
console.log("\n✨ Auto-fix complete! All localhost references replaced with API_BASE_URL\n");
