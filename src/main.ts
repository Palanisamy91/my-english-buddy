import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));

// Offline support: the service worker (public/sw.js) saves the app files and lesson data the first
// time the app is opened. It is not used while running `ng serve` (development mode), so you always see
// your latest code there. It needs https or localhost, which the browser enforces by itself.
if (!isDevMode() && 'serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* offline support is optional; the app works without it */
    });
  });
}
