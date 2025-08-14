import { Component } from '@angular/core';
import {
  IonContent,
  IonIcon
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonContent, IonIcon],
  standalone: true
})
export class HomePage {
  constructor() {}
}
