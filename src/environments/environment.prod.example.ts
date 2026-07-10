// IMPORTANT:
// If this file changes, update the matching GitHub Actions secret (ENVIRONMENT_PROD_TS).
// Never place backend secrets or private keys in this frontend file.

export const environment = {
  production: true,
  firebase: {
    apiKey: "__PUBLIC_WEB_API_KEY__",
    authDomain: "__PROJECT__.firebaseapp.com",
    projectId: "__PROJECT__",
    storageBucket: "__PROJECT__.appspot.com",
    messagingSenderId: "__SENDER_ID__",
    appId: "__APP_ID__"
  },
  appCheckRecaptchaSiteKey: "",
  disqusShortname: "__DISQUS_SHORTNAME__"
};
