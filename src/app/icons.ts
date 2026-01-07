import { addIcons, setAssetPath } from 'ionicons';
import * as i from 'ionicons/icons';

let registered = false;
export function registerIonicons(): void {
  if (registered) return;
  registered = true;

  // Set asset path - use static path for production builds
  try {
    // Use document.baseURI if available, otherwise fall back to root path
    // This prevents "Invalid base URL" errors during icon loading
    const basePath = (typeof document !== 'undefined' && document.baseURI)
      ? new URL(document.baseURI).pathname || '/'
      : '/';
    setAssetPath(basePath);
  } catch (error) {
    // Fallback to root path if baseURI fails
    try {
      setAssetPath('/');
    } catch (fallbackError) {
      console.warn('Failed to set asset path:', fallbackError);
    }
  }

  addIcons({
    // ✱ include EVERY name you use in templates:
    'home-outline': i.homeOutline,
    'construct-outline': i.constructOutline,
    'hammer-outline': i.hammerOutline,
    'videocam-outline': i.videocamOutline,
    'phone-portrait-outline': i.phonePortraitOutline,
    'search-outline': i.searchOutline,
    'eye-outline': i.eyeOutline,
    'shield-checkmark-outline': i.shieldCheckmarkOutline,
    'archive-outline': i.archiveOutline,
    'open-outline': i.openOutline,
    'information-circle-outline': i.informationCircleOutline,
    'mail-outline': i.mailOutline,
    'logo-youtube': i.logoYoutube,
    'play-circle-outline': i.playCircleOutline,
    'card-outline': i.cardOutline,
    'heart-outline': i.heartOutline,
    'close-outline': i.closeOutline,
    'close': i.close,
    'wallet-outline': i.walletOutline,
    'time-outline': i.timeOutline,
    // Contact form icons
    'share-social-outline': i.shareSocialOutline,
    'send-outline': i.sendOutline,
    'checkmark-circle-outline': i.checkmarkCircleOutline,
    'alert-circle-outline': i.alertCircleOutline,
    'bug-outline': i.bugOutline,
    // Admin login icons
    'lock-closed-outline': i.lockClosedOutline,
    'eye-off-outline': i.eyeOffOutline,
    // Dashboard icons
    'log-out-outline': i.logOutOutline,
    'flash-outline': i.flashOutline,
    'create-outline': i.createOutline,
    'settings-outline': i.settingsOutline,
    'server-outline': i.serverOutline,
    'analytics-outline': i.analyticsOutline,
    'newspaper-outline': i.newspaperOutline,
    'people-outline': i.peopleOutline,
    'person-add-outline': i.personAddOutline,
    'log-in-outline': i.logInOutline,
    'checkmark-circle': i.checkmarkCircle,
    'alert-circle': i.alertCircle,
    'shield-outline': i.shieldOutline,
    // Password recovery icons
    'arrow-back-outline': i.arrowBackOutline,
    'help-circle-outline': i.helpCircleOutline,
    'refresh-outline': i.refreshOutline,
    'person-outline': i.personOutline,
    'checkmark-outline': i.checkmarkOutline,
    'close-circle': i.closeCircle,
    // Content creation icons
    'save-outline': i.saveOutline,
    'document-text-outline': i.documentTextOutline,
    'pencil-outline': i.pencilOutline,
    'trash-outline': i.trashOutline,
    // Comments icons
    'chatbubbles-outline': i.chatbubblesOutline,
    // Carousel icons
    'chevron-back-outline': i.chevronBackOutline,
    'chevron-forward-outline': i.chevronForwardOutline,
    // Menu icons
    'menu-outline': i.menuOutline,
  });
}
