// check-api-consistency.js
const fs = require("fs");
const path = require("path");

const targetDir = path.resolve(__dirname, "src");

// Regex patterns
const envPattern = /process\.env\.NEXT_PUBLIC_API_BASE_URL/;
const localhostPattern = /http:\/\/localhost:5000\/api/;
const apiConstPattern = /const\s+API_BASE_URL\s*=\s*(.+);/;

let results = [];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  let findings = [];

  lines.forEach((line, idx) => {
    if (envPattern.test(line)) {
      findings.push({ type: "✅ uses env", line: idx + 1, code: line.trim() });
    }
    if (localhostPattern.test(line)) {
      findings.push({ type: "❌ hardcoded localhost", line: idx + 1, code: line.trim() });
    }
    if (apiConstPattern.test(line)) {
      findings.push({ type: "ℹ️ API_BASE_URL defined", line: idx + 1, code: line.trim() });
    }
  });

  if (findings.length > 0) {
    results.push({ file: filePath, findings });
  }
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith(".js") || fullPath.endsWith(".jsx")) {
      scanFile(fullPath);
    }
  });
}

walkDir(targetDir);

// Report
console.log("🔍 API Consistency Scan Results:\n");
results.forEach(({ file, findings }) => {
  console.log(file);
  findings.forEach((f) => {
    console.log(`   → ${f.type} (line ${f.line})`);
    console.log(`     ${f.code}`);
  });
});
console.log("\n✅ Scan complete!");
