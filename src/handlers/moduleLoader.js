const fs = require("fs");
const path = require("path");

const loadModules = (client) => {
  const modulesPath = path.join(__dirname, "../modules");
  const moduleFiles = fs.readdirSync(modulesPath).filter(file => file.endsWith(".js"));

  console.log(`📦 Loading ${moduleFiles.length} modules...`);

  for (const file of moduleFiles) {
    try {
      const filePath = path.join(modulesPath, file);
      const module = require(filePath);
      
      if (typeof module === "function") {
        module(client);
        console.log(`✅ Loaded module: ${file}`);
      } else {
        console.warn(`⚠️ Module ${file} did not export a function`);
      }
    } catch (error) {
      console.error(`❌ Error loading module ${file}:`, error.message);
    }
  }

  console.log(`✅ All modules loaded successfully!`);
};

module.exports = { loadModules };
