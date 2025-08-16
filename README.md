# DCCI Ministries Website

A modern, responsive website built with Ionic and Angular for DCCI Ministries.

## 🚀 Technology Stack

- **Node.js**: 18+ (LTS recommended)
- **Angular**: 20.0.0
- **Ionic**: 8.0.0
- **Capacitor**: 7.4.2
- **Firebase**: 12.1.0
- **TypeScript**: 5.8.0

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Git](https://git-scm.com/)
- [Ionic CLI](https://ionicframework.com/docs/cli) (optional, for additional commands)

## 🛠️ Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd dcci-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   - Copy `src/environments/environment.ts.example` to `src/environments/environment.ts`
   - Update Firebase configuration with your project details
   - **Note**: Environment files are gitignored for security

4. **Start development server**
   ```bash
   npm start
   ```

## 🔧 Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm run watch` - Build and watch for changes
- `npm test` - Run unit tests
- `npm run lint` - Run linting

## 🌐 Development

- **Local Development**: http://localhost:4200
- **Build Output**: `dist/` directory
- **Source Maps**: Enabled for debugging

## 📱 Mobile Development

This project includes Capacitor for mobile app development:

```bash
# Add platforms
npx cap add ios
npx cap add android

# Sync web code to native projects
npx cap sync

# Open in native IDEs
npx cap open ios
npx cap open android
```

## 🔥 Firebase Integration

The project is configured with Firebase services:
- **Authentication** - User management
- **Firestore** - Database
- **Storage** - File storage
- **Analytics** - Usage tracking (production only)

### Firebase Configuration
Update your Firebase config in `src/environments/environment.ts`:
```typescript
firebase: {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id",
  measurementId: "your-measurement-id"
}
```

## 🏗️ Project Structure

```
dcci-website/
├── src/
│   ├── app/                 # Application components
│   ├── assets/             # Static assets
│   ├── environments/       # Environment configuration
│   ├── theme/              # Global styles and variables
│   └── global.scss         # Global styles
├── angular.json            # Angular CLI configuration
├── capacitor.config.ts     # Capacitor configuration
├── ionic.config.json       # Ionic configuration
└── package.json            # Dependencies and scripts
```

## 🧪 Testing

Run tests with:
```bash
npm test
```

## 📦 Building for Production

```bash
npm run build
```

The built application will be in the `dist/` directory.

## 🚀 Deployment

### Web Deployment
1. Build the project: `npm run build`
2. Deploy the contents of the `dist/` folder to your web server

### Mobile Deployment
1. Build the project: `npm run build`
2. Sync with Capacitor: `npx cap sync`
3. Build native apps in Xcode/Android Studio

## 🔒 Security Notes

- Environment files containing Firebase keys are gitignored
- Never commit sensitive configuration to version control
- Use environment variables for production deployments

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -am 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is private and proprietary to DCCI Ministries.

## 🆘 Support

For technical support or questions, please contact the development team. admin@accessiblewebmedia.com

---

**Built with ❤️ using Ionic & Angular** 
