import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonIcon } from '@ionic/angular/standalone';
import { PageHeaderComponent } from '../components/page-header.component';

@Component({
  selector: 'app-archives',
  templateUrl: './archives.page.html',
  styleUrls: ['./archives.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonIcon, PageHeaderComponent]
})
export class ArchivesPage {
  constructor() {}
}


