import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  standalone: true,
  imports: [CommonModule, IonIcon]
})
export class FooterComponent {
  @Input() version: string = '1.0.0';
  currentYear: number;

  constructor(private router: Router) {
    this.currentYear = new Date().getFullYear();
  }

  navigateToContact() {
    this.router.navigate(['/contact'], { queryParams: { subject: 'Website Problem Report' } });
  }
}

