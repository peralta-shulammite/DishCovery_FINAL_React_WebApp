const fs = require("fs");
const path = require("path");

const targetDir = path.resolve(__dirname, "src");

// Regex to detect hardcoded localhost URLs
const localhostRegex = /(['"`])http:\/\/localhost:5000(\/api[^'"`]*)\1/g;

// Regex to detect self-referencing API_BASE_URL
const brokenApiRegex = /const\s+API_BASE_URL\s*=\s*process\.env\.NEXT_PUBLIC_API_BASE_URL\s*\|\|\s*`?\$\{API_BASE_URL\}`?;/;

// Correct API_BASE_URL declaration
const correctApiDeclaration = `const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";\n`;

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let updated = false;
  let changes = [];

  // Fix broken self-referencing API_BASE_URL
  if (brokenApiRegex.test(content)) {
    const before = content.match(brokenApiRegex)[0];
    content = content.replace(brokenApiRegex, correctApiDeclaration.trim());
    changes.push({ before, after: correctApiDeclaration.trim() });
    updated = true;
  }

  // Replace other hardcoded localhost references
  content = content.replace(localhostRegex, (match, quote, rest) => {
    const replacement = `\`\${API_BASE_URL}${rest}\``;
    changes.push({ before: match, after: replacement });
    updated = true;
    return replacement;
  });

  // Write changes and log
  if (updated) {
    console.log(`\n📂 File: ${filePath}`);
    changes.forEach((c, i) => {
      console.log(`   🔎 Change #${i + 1}:`);
      console.log(`      Before: ${c.before}`);
      console.log(`      After:  ${c.after}`);
    });
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`💾 Saved changes to: ${filePath}`);
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
console.log("\n✨ Auto-fix complete! All API_BASE_URL errors and localhost references fixed\n");
