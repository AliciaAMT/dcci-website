const fs = require('fs-extra');
const path = require('path');

console.log('📁 Copying SVG icons to build output...');

const sourceDir = path.join(__dirname, '..', 'node_modules', 'ionicons', 'dist', 'svg');
const targetDir = path.join(__dirname, '..', 'www', 'svg');

async function copySvgIcons() {
  try {
    // Check if source directory exists
    if (!fs.existsSync(sourceDir)) {
      console.error(`❌ Source directory not found: ${sourceDir}`);
      console.error('Make sure ionicons is installed: npm install ionicons');
      return false;
    }

    // Create target directory if it doesn't exist
    await fs.ensureDir(targetDir);

    // Copy all SVG files
    const files = await fs.readdir(sourceDir);
    const svgFiles = files.filter(file => file.endsWith('.svg'));

    console.log(`Found ${svgFiles.length} SVG files to copy...`);

    for (const file of svgFiles) {
      const sourcePath = path.join(sourceDir, file);
      const targetPath = path.join(targetDir, file);
      await fs.copy(sourcePath, targetPath);
    }

    console.log(`✅ Successfully copied ${svgFiles.length} SVG files to ${targetDir}`);
    return true;

  } catch (error) {
    console.error('❌ Error copying SVG icons:', error.message);
    return false;
  }
}

// Run the copy function
copySvgIcons().then(success => {
  if (success) {
    console.log('🎉 SVG icons copy completed successfully!');
  } else {
    console.error('💥 SVG icons copy failed!');
    process.exit(1);
  }
});
