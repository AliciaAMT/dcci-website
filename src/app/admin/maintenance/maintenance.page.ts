import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonIcon
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-maintenance',
  templateUrl: './maintenance.page.html',
  styleUrls: ['./maintenance.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonIcon,
    CommonModule
  ]
})
export class MaintenancePage implements OnInit {
  constructor() {}

  ngOnInit() {}
}

