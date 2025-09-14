# Environment Configuration Guide

This project supports multiple environment configurations for different deployment scenarios.

## Available Environments

### 1. Development (`development`)
- **File**: `src/environments/environment.ts`
- **Production**: `false`
- **Use case**: Local development, debugging
- **Command**: `npm run start:dev` or `ionic serve`

### 2. Test/Staging (`test`)
- **File**: `src/environments/environment.test.ts`
- **Production**: `false`
- **Use case**: Staging environment testing, pre-production validation
- **Command**: `npm run start:test` or `ionic serve --configuration test`

### 3. Production Test (`prod-test`)
- **File**: `src/environments/environment.prod.test.ts`
- **Production**: `true`
- **Use case**: Production-like testing on staging infrastructure
- **Command**: `npm run start:prod-test` or `ionic serve --configuration prod-test`

### 4. Production (`production`)
- **File**: `src/environments/environment.prod.ts`
- **Production**: `true`
- **Use case**: Live production deployment
- **Command**: `npm run start:prod` or `ionic serve --configuration production`

## Firebase Project Switching

Each environment can point to different Firebase projects:

- **Development**: Uses development Firebase project
- **Test**: Uses staging Firebase project
- **Production Test**: Uses staging Firebase project (but with production settings)
- **Production**: Uses live production Firebase project

## Configuration Commands

### Development
```bash
npm run start:dev
# or
ionic serve --configuration development
```

### Staging/Test
```bash
npm run start:test
# or
ionic serve --configuration test
```

### Production-like Testing
```bash
npm run start:prod-test
# or
ionic serve --configuration prod-test
```

### Production
```bash
npm run start:prod
# or
ionic serve --configuration production
```

## Build Commands

### Development Build
```bash
npm run build:dev
```

### Test Build
```bash
npm run build:test
```

### Production Test Build
```bash
npm run build:prod-test
```

### Production Build
```bash
npm run build:prod
```

## Environment File Structure

```
src/environments/
├── environment.ts              # Development (default)
├── environment.test.ts         # Staging/Test
├── environment.prod.test.ts    # Production-like testing
└── environment.prod.ts         # Production
```

## Switching Firebase Projects

To switch between Firebase projects:

1. **Update environment files** with the appropriate Firebase configuration
2. **Use the corresponding build/serve command** for that environment
3. **Deploy to the appropriate hosting target**

### Example: Deploying to Staging
```bash
# Build for staging
npm run build:test

# Deploy to staging Firebase project
firebase use staging
firebase deploy
```

### Example: Deploying to Production
```bash
# Build for production
npm run build:prod

# Deploy to production Firebase project
firebase use production
firebase deploy
```

## Environment Variables

Each environment file contains:
- `production`: Boolean flag for Angular optimization
- `firebase`: Firebase configuration object
- `disqusShortname`: Disqus configuration

## Notes

- The `production` flag affects Angular's build optimization
- File replacements happen automatically based on the selected configuration
- You can have different Firebase projects for each environment
- Environment switching is handled at build time, not runtime 
