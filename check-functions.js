const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname);

function walkDir(dir) {
  fs.readdirSync(dir).forEach((file) => {
    const fullPath = path.join(dir, file);
    if (fs.lstatSync(fullPath).isDirectory()) {
      // Ignore node_modules
      if (file === "node_modules") return;

      // Check if this folder is named "functions"
      if (file === "functions") {
        console.log(`⚠️  Found a functions folder: ${fullPath}`);
      }

      // Recurse
      walkDir(fullPath);
    }
  });
}

walkDir(projectRoot);
console.log("\n✅ Scan complete! No node_modules folders were checked.");
