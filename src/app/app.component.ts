import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { AppMenuComponent } from './components/app-menu.component';
import { SiteSettingsService } from './services/site-settings.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [IonApp, IonRouterOutlet, AppMenuComponent],
})
export class AppComponent implements OnInit, OnDestroy {
  constructor(private siteSettingsService: SiteSettingsService) {}

  ngOnInit() {
    // Initialize site settings on app startup
    this.siteSettingsService.initialize();
  }

  ngOnDestroy() {
    // Cleanup subscription
    this.siteSettingsService.destroy();
  }
}
