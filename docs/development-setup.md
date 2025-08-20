# Development Setup - DCCI Ministries Website

## 🚀 Quick Start

This guide will get you up and running with the DCCI Ministries website development environment in under 30 minutes.

## 📋 Prerequisites

### **Required Software**
- **Node.js**: Version 18+ (LTS recommended)
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify with: `node --version`
- **Git**: Version control system
  - Download from [git-scm.com](https://git-scm.com/)
  - Verify with: `git --version`
- **Code Editor**: VS Code recommended
  - Download from [code.visualstudio.com](https://code.visualstudio.com/)

### **Optional but Recommended**
- **Ionic CLI**: For additional Ionic commands
  - Install with: `npm install -g @ionic/cli`
- **Firebase CLI**: For Firebase management
  - Install with: `npm install -g firebase-tools`

## 🛠️ Installation Steps

### **Step 1: Clone the Repository**
```bash
# Clone the project
git clone <your-repo-url>
cd dcci-website

# Verify the project structure
ls -la
```

### **Step 2: Install Dependencies**
```bash
# Install Node.js dependencies
npm install

# Verify installation
npm list --depth=0
```

### **Step 3: Environment Configuration**
```bash
# Copy environment template
cp src/environments/environment.ts.example src/environments/environment.ts

# Edit the environment file with your Firebase config
# Use your preferred editor or:
code src/environments/environment.ts
```

### **Step 4: Firebase Setup**
1. **Get Firebase Config**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select your project (dcci-ministries)
   - Go to Project Settings → General
   - Scroll to "Your apps" section
   - Copy the configuration object

2. **Update Environment File**:
   ```typescript
   export const environment = {
     production: false,
     firebase: {
       apiKey: "your-actual-api-key",
       authDomain: "dcci-ministries.firebaseapp.com",
       projectId: "dcci-ministries",
       storageBucket: "dcci-ministries.firebasestorage.app",
       messagingSenderId: "490446415848",
       appId: "1:490446415848:web:f088b10586e384d72ca65d",
       measurementId: "G-JY80Q3PXFY"
     }
   };
   ```

### **Step 5: Start Development Server**
```bash
# Start the development server
npm start

# The app will open at: http://localhost:4200
```

## 🔧 Development Environment

### **Available Scripts**
```bash
# Development
npm start              # Start development server
npm run build          # Build for production
npm run watch          # Build and watch for changes

# Testing
npm test               # Run unit tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Generate test coverage report

# Code Quality
npm run lint           # Run ESLint
npm run lint:fix       # Fix auto-fixable linting issues

# Mobile Development
npx cap sync           # Sync web code with native projects
npx cap open ios       # Open iOS project in Xcode
npx cap open android   # Open Android project in Android Studio
```

### **Development Server Features**
- **Hot Reload**: Changes automatically refresh the browser
- **Source Maps**: Full debugging support
- **Error Overlay**: Clear error messages in the browser
- **Live Reload**: Browser automatically refreshes on file changes

## 🏗️ Project Structure

### **Key Directories**
```
dcci-website/
├── src/                          # Source code
│   ├── app/                      # Application code
│   │   ├── components/           # Reusable UI components
│   │   ├── pages/                # Route-based pages
│   │   ├── services/             # Business logic services
│   │   └── models/               # Data models and interfaces
│   ├── assets/                   # Static assets (images, icons)
│   ├── environments/             # Environment configuration
│   ├── theme/                    # Global styles and variables
│   └── global.scss               # Global styles
├── docs/                         # Project documentation
├── angular.json                  # Angular CLI configuration
├── capacitor.config.ts           # Capacitor configuration
├── ionic.config.json             # Ionic configuration
└── package.json                  # Dependencies and scripts
```

### **Component Architecture**
- **Standalone Components**: Angular 20's latest approach
- **Feature-based Organization**: Components grouped by feature
- **Shared Components**: Common UI elements in shared folder
- **Page Components**: Route-based page components

## 🔐 Firebase Configuration

### **Required Firebase Services**
- **Authentication**: User management
- **Firestore**: Database
- **Storage**: File storage
- **Hosting**: Web hosting
- **Analytics**: Usage tracking

### **Firebase Security Rules**
```typescript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /articles/{articleId} {
      allow read: if true;  // Public read access
      allow write: if request.auth != null && 
                   request.auth.token.role == 'admin';
    }
    
    match /users/{userId} {
      allow read, write: if request.auth != null && 
                         request.auth.uid == userId;
    }
  }
}
```

### **Storage Security Rules**
```typescript
// Firebase Storage Security Rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;  // Public read access
      allow write: if request.auth != null && 
                   request.auth.token.role == 'admin';
    }
  }
}
```

## 📱 Mobile Development

### **Capacitor Setup**
```bash
# Add mobile platforms
npx cap add ios
npx cap add android

# Sync web code with native projects
npx cap sync

# Open in native IDEs
npx cap open ios      # Opens Xcode
npx cap open android  # Opens Android Studio
```

### **Platform Requirements**
- **iOS Development**: macOS with Xcode installed
- **Android Development**: Android Studio with SDK installed
- **Cross-platform**: Both platforms can be developed on any OS

## 🧪 Testing Setup

### **Unit Testing**
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### **Testing Framework**
- **Jasmine**: Testing framework
- **Karma**: Test runner
- **Angular Testing Utilities**: Component testing helpers

### **Test Structure**
```
src/
├── app/
│   ├── components/
│   │   └── component-name/
│   │       ├── component-name.component.ts
│   │       ├── component-name.component.spec.ts
│   │       └── component-name.component.html
```

## 🔍 Debugging

### **Browser Developer Tools**
- **Console**: View logs and errors
- **Network**: Monitor API calls
- **Elements**: Inspect DOM structure
- **Sources**: Debug JavaScript code

### **Angular DevTools**
- Install [Angular DevTools](https://angular.io/devtools) browser extension
- Inspect component state and data flow
- Monitor performance and change detection

### **Firebase Debugging**
- **Firebase Console**: Monitor database and storage
- **Firebase Emulator**: Local development and testing
- **Security Rules Testing**: Validate access control

## 📦 Build & Deployment

### **Development Build**
```bash
# Development build
npm run build

# Build with source maps
npm run build --source-map
```

### **Production Build**
```bash
# Production build
npm run build --configuration production

# Build analysis
npm run build --stats-json
```

### **Deployment**
```bash
# Deploy to Firebase
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only functions
firebase deploy --only functions
```

## 🚨 Common Issues & Solutions

### **Node Version Issues**
```bash
# Check Node version
node --version

# Use Node Version Manager (nvm) to switch versions
nvm use 18
nvm install 18
```

### **Dependency Issues**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### **Firebase Connection Issues**
- Verify environment configuration
- Check Firebase project settings
- Ensure security rules allow access
- Verify API keys are correct

### **Build Errors**
```bash
# Check for TypeScript errors
npx tsc --noEmit

# Run linting
npm run lint

# Check Angular configuration
ng config
```

## 🔄 Development Workflow

### **Daily Development**
1. **Start Development Server**: `npm start`
2. **Make Changes**: Edit code in your preferred editor
3. **Test Changes**: Verify in browser
4. **Run Tests**: `npm test` before committing
5. **Commit Changes**: Use conventional commit messages

### **Feature Development**
1. **Create Feature Branch**: `git checkout -b feature/feature-name`
2. **Develop Feature**: Implement functionality
3. **Write Tests**: Ensure good test coverage
4. **Code Review**: Self-review before committing
5. **Merge**: Merge to main branch

### **Code Quality**
- **ESLint**: Automatic code formatting and quality checks
- **Pre-commit Hooks**: Automatic checks before commits
- **Conventional Commits**: Standardized commit messages
- **TypeScript**: Type safety and error prevention

## 📚 Additional Resources

### **Official Documentation**
- [Angular Documentation](https://angular.io/docs)
- [Ionic Documentation](https://ionicframework.com/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Capacitor Documentation](https://capacitorjs.com/docs)

### **Community Resources**
- [Angular Community](https://angular.io/community)
- [Ionic Community](https://ionicframework.com/community)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/angular)
- [GitHub Issues](https://github.com/ionic-team/ionic/issues)

---

## ✅ Setup Verification

After completing setup, verify everything works:

```bash
# 1. Check Node version
node --version  # Should be 18+

# 2. Check npm packages
npm list --depth=0  # Should show all dependencies

# 3. Start development server
npm start  # Should open browser to localhost:4200

# 4. Check Firebase connection
# Look for Firebase initialization in browser console

# 5. Run tests
npm test  # Should pass all tests
```

**If all checks pass, your development environment is ready! 🎉**

---

**Need Help?** Check the [Troubleshooting Guide](./troubleshooting.md) or contact the development team. 
