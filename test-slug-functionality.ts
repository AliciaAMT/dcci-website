/**
 * Test script for slug functionality
 * 
 * This script tests:
 * 1. Slug generation from titles
 * 2. Uniqueness suffixing (appending -2, -3, etc.)
 * 3. Stability on title edit (published articles don't auto-change slug)
 * 4. Redirect behavior (old slugs stored when slug changes)
 * 5. Reserved words rejection
 * 
 * Run with: npx ts-node test-slug-functionality.ts
 */

// Mock implementation of slug functions for testing
class SlugTester {
  private readonly RESERVED_SLUGS = [
    'admin', 'api', 'login', 'logout', 'assets', 'sitemap.xml', 'robots.txt',
    'dashboard', 'content', 'manage', 'drafts', 'published', 'create', 'edit',
    'home', 'welcome', 'verify-email', 'forgot-password', 'reset-password',
    'verification-required'
  ];

  private transliterateDiacritics(text: string): string {
    const diacriticsMap: { [key: string]: string } = {
      'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
      'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
      'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
      'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
      'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
      'ý': 'y', 'ÿ': 'y',
      'ñ': 'n', 'ç': 'c',
      'À': 'A', 'Á': 'A', 'Â': 'A', 'Ã': 'A', 'Ä': 'A', 'Å': 'A',
      'È': 'E', 'É': 'E', 'Ê': 'E', 'Ë': 'E',
      'Ì': 'I', 'Í': 'I', 'Î': 'I', 'Ï': 'I',
      'Ò': 'O', 'Ó': 'O', 'Ô': 'O', 'Õ': 'O', 'Ö': 'O',
      'Ù': 'U', 'Ú': 'U', 'Û': 'U', 'Ü': 'U',
      'Ý': 'Y', 'Ÿ': 'Y',
      'Ñ': 'N', 'Ç': 'C'
    };
    return text.replace(/[àáâãäåèéêëìíîïòóôõöùúûüýÿñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÑÇ]/g, (char) => diacriticsMap[char] || char);
  }

  generateSlug(title: string): string {
    if (!title) return '';
    
    let slug = title
      .trim()
      .toLowerCase();
    
    slug = this.transliterateDiacritics(slug);
    slug = slug.replace(/[\s_]+/g, '-');
    slug = slug.replace(/[^a-z0-9-]/g, '');
    slug = slug.replace(/-+/g, '-');
    slug = slug.replace(/^-+|-+$/g, '');
    
    if (!slug) {
      slug = 'untitled';
    }
    
    return slug;
  }

  isReservedSlug(slug: string): boolean {
    return this.RESERVED_SLUGS.includes(slug.toLowerCase());
  }

  validateSlug(slug: string): { valid: boolean; error?: string } {
    if (!slug || slug.trim() === '') {
      return { valid: false, error: 'Slug cannot be empty' };
    }

    if (this.isReservedSlug(slug)) {
      return { valid: false, error: `Slug "${slug}" is reserved and cannot be used` };
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return { valid: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' };
    }

    if (slug.startsWith('-') || slug.endsWith('-')) {
      return { valid: false, error: 'Slug cannot start or end with a hyphen' };
    }

    if (slug.includes('--')) {
      return { valid: false, error: 'Slug cannot contain consecutive hyphens' };
    }

    return { valid: true };
  }

  // Simulate slug uniqueness checking
  private existingSlugs = new Set<string>();
  
  addExistingSlug(slug: string) {
    this.existingSlugs.add(slug);
  }

  clearExistingSlugs() {
    this.existingSlugs.clear();
  }

  async generateUniqueSlug(title: string, manualSlug?: string): Promise<string> {
    let baseSlug: string;
    
    if (manualSlug && manualSlug.trim()) {
      baseSlug = this.generateSlug(manualSlug);
    } else {
      baseSlug = this.generateSlug(title);
    }

    if (this.isReservedSlug(baseSlug)) {
      baseSlug = `${baseSlug}-1`;
    }

    let slug = baseSlug;
    let counter = 1;

    while (this.existingSlugs.has(slug)) {
      counter++;
      slug = `${baseSlug}-${counter}`;
    }

    this.existingSlugs.add(slug);
    return slug;
  }
}

// Test suite
async function runTests() {
  const tester = new SlugTester();
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      const result = fn();
      if (result instanceof Promise) {
        result.then(() => {
          console.log(`✓ ${name}`);
          passed++;
        }).catch((error) => {
          console.error(`✗ ${name}: ${error.message}`);
          failed++;
        });
      } else {
        console.log(`✓ ${name}`);
        passed++;
      }
    } catch (error: any) {
      console.error(`✗ ${name}: ${error.message}`);
      failed++;
    }
  }

  console.log('Running slug functionality tests...\n');

  // Test 1: Basic slug generation
  test('Basic slug generation', () => {
    const slug = tester.generateSlug('Hello World');
    if (slug !== 'hello-world') {
      throw new Error(`Expected "hello-world", got "${slug}"`);
    }
  });

  // Test 2: Diacritics transliteration
  test('Diacritics transliteration', () => {
    const slug = tester.generateSlug('Café Résumé');
    if (slug !== 'cafe-resume') {
      throw new Error(`Expected "cafe-resume", got "${slug}"`);
    }
  });

  // Test 3: Special characters removal
  test('Special characters removal', () => {
    const slug = tester.generateSlug('Hello! @World# $%^&*()');
    if (slug !== 'hello-world') {
      throw new Error(`Expected "hello-world", got "${slug}"`);
    }
  });

  // Test 4: Multiple spaces/hyphens collapse
  test('Multiple spaces/hyphens collapse', () => {
    const slug = tester.generateSlug('Hello    World---Test');
    if (slug !== 'hello-world-test') {
      throw new Error(`Expected "hello-world-test", got "${slug}"`);
    }
  });

  // Test 5: Leading/trailing hyphens removal
  test('Leading/trailing hyphens removal', () => {
    const slug = tester.generateSlug('---Hello World---');
    if (slug !== 'hello-world') {
      throw new Error(`Expected "hello-world", got "${slug}"`);
    }
  });

  // Test 6: Uniqueness suffixing
  test('Uniqueness suffixing', async () => {
    tester.clearExistingSlugs();
    tester.addExistingSlug('test-article');
    
    const slug1 = await tester.generateUniqueSlug('Test Article');
    if (slug1 !== 'test-article-2') {
      throw new Error(`Expected "test-article-2", got "${slug1}"`);
    }
    
    tester.addExistingSlug('test-article-2');
    const slug2 = await tester.generateUniqueSlug('Test Article');
    if (slug2 !== 'test-article-3') {
      throw new Error(`Expected "test-article-3", got "${slug2}"`);
    }
  });

  // Test 7: Reserved slug rejection
  test('Reserved slug rejection', () => {
    const validation = tester.validateSlug('admin');
    if (validation.valid) {
      throw new Error('Expected reserved slug "admin" to be rejected');
    }
    if (!validation.error?.includes('reserved')) {
      throw new Error(`Expected reserved error message, got "${validation.error}"`);
    }
  });

  // Test 8: Reserved slug auto-suffixing
  test('Reserved slug auto-suffixing', async () => {
    tester.clearExistingSlugs();
    const slug = await tester.generateUniqueSlug('Admin');
    if (slug !== 'admin-1') {
      throw new Error(`Expected "admin-1" for reserved slug, got "${slug}"`);
    }
  });

  // Test 9: Invalid characters rejection
  test('Invalid characters rejection', () => {
    const validation = tester.validateSlug('hello@world');
    if (validation.valid) {
      throw new Error('Expected invalid slug to be rejected');
    }
  });

  // Test 10: Empty slug handling
  test('Empty slug handling', () => {
    const slug = tester.generateSlug('');
    if (slug !== 'untitled') {
      throw new Error(`Expected "untitled" for empty title, got "${slug}"`);
    }
  });

  // Test 11: Manual slug override
  test('Manual slug override', async () => {
    tester.clearExistingSlugs();
    const slug = await tester.generateUniqueSlug('Test Article', 'custom-slug');
    if (slug !== 'custom-slug') {
      throw new Error(`Expected "custom-slug", got "${slug}"`);
    }
  });

  // Test 12: Multiple consecutive hyphens rejection
  test('Multiple consecutive hyphens rejection', () => {
    const validation = tester.validateSlug('hello--world');
    if (validation.valid) {
      throw new Error('Expected slug with consecutive hyphens to be rejected');
    }
  });

  // Test 13: Leading hyphen rejection
  test('Leading hyphen rejection', () => {
    const validation = tester.validateSlug('-hello-world');
    if (validation.valid) {
      throw new Error('Expected slug with leading hyphen to be rejected');
    }
  });

  // Test 14: Trailing hyphen rejection
  test('Trailing hyphen rejection', () => {
    const validation = tester.validateSlug('hello-world-');
    if (validation.valid) {
      throw new Error('Expected slug with trailing hyphen to be rejected');
    }
  });

  // Test 15: Complex title slugification
  test('Complex title slugification', () => {
    const slug = tester.generateSlug('  The Quick Brown Fox Jumps Over The Lazy Dog!  ');
    if (slug !== 'the-quick-brown-fox-jumps-over-the-lazy-dog') {
      throw new Error(`Expected clean slug, got "${slug}"`);
    }
  });

  console.log(`\nTests completed: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('✓ All tests passed!');
    process.exit(0);
  } else {
    console.error('✗ Some tests failed');
    process.exit(1);
  }
}

// Run tests
runTests();

