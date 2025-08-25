import { Component } from '@angular/core';
import {
  IonContent,
  IonIcon
} from '@ionic/angular/standalone';
import { VersionService } from '../services/version.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonContent, IonIcon],
  standalone: true
})
export class HomePage {
  version: string;
  
  constructor(private versionService: VersionService) {
    this.version = this.versionService.getVersion();
  }
}
