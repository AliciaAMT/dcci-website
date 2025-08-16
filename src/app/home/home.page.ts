import { Component } from '@angular/core';
import {
  IonContent
} from '@ionic/angular/standalone';
import { VersionService } from '../services/version.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonContent],
  standalone: true
})
export class HomePage {
  version: string;
  currentYear: number;

  constructor(private versionService: VersionService) {
    this.version = this.versionService.getDisplayVersion();
    this.currentYear = new Date().getFullYear();
  }
}
