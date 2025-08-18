const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname, 'src');

// Only match raw hardcoded localhost URLs
const rawLocalhostRegex = /['"]http:\/\/localhost:5000(\/api)?['"]/g;

function checkFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let matches = content.match(rawLocalhostRegex);

  if (matches) {
    console.log(`🚨 Found in: ${filePath}`);
    matches.forEach(m => {
      console.log(`   → ${m}`);
    });
  }
}

function walkDir(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
      checkFile(fullPath);
    }
  });
}

walkDir(targetDir);
console.log('✅ Scan complete — only raw localhost references shown!');
