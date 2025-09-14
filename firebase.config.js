// Firebase Configuration for Multiple Environments
// This file helps manage different Firebase projects for different environments

module.exports = {
  // Development Environment
  development: {
    projectId: 'your-dev-project-id',
    hosting: {
      public: 'dist/app',
      ignore: [
        'firebase.json',
        '**/.*',
        '**/node_modules/**'
      ]
    }
  },

  // Staging/Test Environment
  test: {
    projectId: 'your-staging-project-id',
    hosting: {
      public: 'dist/app',
      ignore: [
        'firebase.json',
        '**/.*',
        '**/node_modules/**'
      ]
    }
  },

  // Production Environment
  production: {
    projectId: 'your-production-project-id',
    hosting: {
      public: 'dist/app',
      ignore: [
        'firebase.json',
        '**/.*',
        '**/node_modules/**'
      ]
    }
  }
};

// Usage:
// 1. Update the projectId values above with your actual Firebase project IDs
// 2. Use firebase use <environment> to switch between projects
// 3. Deploy with: firebase deploy --only hosting
