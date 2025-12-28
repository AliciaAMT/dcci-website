// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  outDir: '../dist/public-site',
  publicDir: './public',
  build: {
    assets: 'assets'
  }
});
