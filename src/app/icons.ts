// Centralized Ionicons registration
import { addIcons } from '@ionic/core';
import {
  constructOutline,
  hammerOutline,
  videocamOutline,
  phonePortraitOutline,
  searchOutline,
  eyeOutline,
  shieldCheckmarkOutline,
  archiveOutline,
  mailOutline,
  logoYoutube,
  cardOutline,
  heartOutline,
  closeOutline,
  walletOutline,
  timeOutline,
  informationCircleOutline,
  openOutline,
} from '@ionic/core/ionicons';

export function registerIonicons() {
  addIcons({
    'construct-outline': constructOutline,
    'hammer-outline': hammerOutline,
    'videocam-outline': videocamOutline,
    'phone-portrait-outline': phonePortraitOutline,
    'search-outline': searchOutline,
    'eye-outline': eyeOutline,
    'shield-checkmark-outline': shieldCheckmarkOutline,
    'archive-outline': archiveOutline,
    'mail-outline': mailOutline,
    'logo-youtube': logoYoutube,
    'card-outline': cardOutline,
    'heart-outline': heartOutline,
    'close-outline': closeOutline,
    'wallet-outline': walletOutline,
    'time-outline': timeOutline,
    'information-circle-outline': informationCircleOutline,
    'open-outline': openOutline,
  });
}
