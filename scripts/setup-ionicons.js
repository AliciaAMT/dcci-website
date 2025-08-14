import { copyFileSync, mkdirSync, readdirSync } from 'fs';
import { join } from 'path';

const src = 'node_modules/ionicons/dist/svg';
const dest = 'src/assets/svg';

try {
  mkdirSync(dest, { recursive: true });
  
  const files = readdirSync(src);
  let copiedCount = 0;
  
  files.forEach(file => {
    if (file.endsWith('.svg')) {
      copyFileSync(join(src, file), join(dest, file));
      copiedCount++;
    }
  });
  
  console.log(`✔ ${copiedCount} Ionicons copied to src/assets/svg`);
  console.log('✔ Icons will be available at /svg/ path at runtime');
} catch (error) {
  console.error('❌ Error copying Ionicons:', error.message);
  console.log('💡 Make sure you have run "npm install" first');
  process.exit(1);
}
