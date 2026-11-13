import { Component, HostListener, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { IconComponent } from './shared/icon.component';

interface NavItem { path: string; label: string; icon: string; }

/**
 * App shell. One set of routes, three navigation layouts chosen by CSS breakpoints:
 *  - mobile (320-767px):   compact header + hamburger drawer + bottom navigation
 *  - tablet (768-1023px):  icon sidebar (tap the toggle to expand it)
 *  - laptop/desktop (1024px+): full left sidebar, collapsible; content centred to a readable width
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, NgTemplateOutlet],
  template: `
    <header class="top">
      <button type="button" class="icon-btn menu-btn" aria-label="Open menu" [attr.aria-expanded]="drawer()" (click)="drawer.set(true)"><app-icon name="menu" [size]="24" /></button>
      <button type="button" class="icon-btn side-toggle" [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'" [attr.aria-expanded]="!collapsed()" (click)="collapsed.set(!collapsed())"><app-icon name="menu" [size]="22" /></button>
      <a class="brand" routerLink="/" aria-label="My English Buddy home">
        <app-icon name="flag-in" [size]="26" />
        <span class="brand-text">My English Buddy</span>
      </a>
      @if (!online()) { <span class="offline" role="status"><app-icon name="wifi-off" [size]="14" /> Offline</span> }
    </header>

    <aside class="sidebar" [class.collapsed]="collapsed()">
      <nav aria-label="Main">
        <ng-container [ngTemplateOutlet]="links" />
      </nav>
      <p class="side-foot">🇮🇳 Made for Tamil speakers learning English</p>
    </aside>

    <div class="scrim" [class.open]="drawer()" (click)="drawer.set(false)"></div>
    <aside class="drawer" [class.open]="drawer()" [attr.aria-hidden]="!drawer()" aria-label="All sections">
      <div class="drawer-head">
        <strong><app-icon name="flag-in" [size]="22" /> My English Buddy</strong>
        <button type="button" class="icon-btn" aria-label="Close menu" (click)="drawer.set(false)"><app-icon name="close" [size]="22" /></button>
      </div>
      <nav aria-label="All sections">
        <ng-container [ngTemplateOutlet]="links" />
      </nav>
    </aside>

    <main class="page"><div class="page-inner"><router-outlet /></div></main>

    <nav class="bottom" aria-label="Quick">
      @for (item of quick; track item.path) {
        <a [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.path === '' }">
          <app-icon [name]="item.icon" [size]="22" /><span>{{ item.label }}</span>
        </a>
      }
      <button type="button" (click)="drawer.set(true)" aria-label="More sections"><app-icon name="more" [size]="22" /><span>More</span></button>
    </nav>

    <ng-template #links>
      @for (item of items; track item.path) {
        <a class="nav-link" [routerLink]="item.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: item.path === '' }" [title]="item.label">
          <app-icon [name]="item.icon" [size]="22" /><span class="nav-label">{{ item.label }}</span>
        </a>
      }
    </ng-template>
  `,
  styles: `
    :host { display: block; --top-h: 56px; }
    .top { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; gap: 8px; min-height: var(--top-h); padding: 6px 12px; padding-top: max(6px, env(safe-area-inset-top)); background: linear-gradient(135deg, var(--primary-dark), var(--primary)); color: #fff; box-shadow: 0 2px 10px rgba(76,42,154,.25); }
    .brand { display: flex; align-items: center; gap: 10px; color: #fff; font-weight: 700; font-size: 1.1rem; text-decoration: none; min-width: 0; }
    .brand-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 12px; border: 0; background: transparent; color: inherit; }
    .icon-btn:hover { background: rgba(255,255,255,.15); }
    .side-toggle { display: none; }
    .offline { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; background: #ffe8a3; color: #4a3200; border-radius: 12px; padding: 3px 10px; font-size: .8rem; font-weight: 700; flex: none; }

    /* ---- navigation links (shared by sidebar and drawer) ---- */
    .nav-link { display: flex; align-items: center; gap: 14px; padding: 11px 14px; border-radius: 12px; color: var(--text); text-decoration: none; min-height: 46px; font-weight: 500; transition: background .15s, transform .15s; }
    .nav-link:hover { background: var(--primary-tint); transform: translateX(2px); }
    .nav-link.active { background: var(--primary-soft); color: var(--primary-dark); font-weight: 700; }
    nav { display: flex; flex-direction: column; gap: 2px; }

    /* ---- mobile drawer ---- */
    .scrim { position: fixed; inset: 0; z-index: 40; background: rgba(36,26,58,.45); opacity: 0; pointer-events: none; transition: opacity .2s; }
    .scrim.open { opacity: 1; pointer-events: auto; }
    .drawer { position: fixed; z-index: 50; top: 0; bottom: 0; left: 0; width: min(300px, 86vw); background: #fff; padding: 12px; padding-top: max(12px, env(safe-area-inset-top)); transform: translateX(-105%); transition: transform .22s ease; overflow-y: auto; visibility: hidden; box-shadow: var(--shadow-hover); }
    .drawer.open { transform: none; visibility: visible; }
    .drawer-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; color: var(--primary-dark); }
    .drawer-head strong { display: flex; align-items: center; gap: 8px; }
    .drawer .icon-btn { color: var(--primary-dark); } .drawer .icon-btn:hover { background: var(--primary-tint); }

    /* ---- sidebar (hidden on phones) ---- */
    .sidebar { display: none; }

    /* ---- bottom navigation (phones only) ---- */
    .bottom { position: fixed; z-index: 30; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-around; align-items: stretch; background: #fff; border-top: 1px solid var(--border); padding: 4px 4px max(4px, env(safe-area-inset-bottom)); box-shadow: 0 -4px 16px rgba(76,42,154,.10); flex-direction: row; gap: 0; }
    .bottom a, .bottom button { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-height: 52px; padding: 4px 2px; border: 0; background: transparent; color: var(--muted); text-decoration: none; font-size: .72rem; border-radius: 14px; font-weight: 600; }
    .bottom span { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bottom a.active { color: var(--primary-dark); background: var(--primary-soft); }

    .page { width: 100%; max-width: 100%; margin: 0 auto; padding: 14px 14px calc(var(--bottom-nav-h) + 28px + env(safe-area-inset-bottom)); padding-left: max(14px, env(safe-area-inset-left)); padding-right: max(14px, env(safe-area-inset-right)); }

    /* ---- tablet: icon sidebar ---- */
    @media (min-width: 768px) {
      .menu-btn, .bottom, .scrim, .drawer { display: none; }
      .side-toggle { display: inline-flex; }
      .sidebar { display: flex; flex-direction: column; justify-content: space-between; position: fixed; z-index: 20; top: calc(var(--top-h) + env(safe-area-inset-top)); bottom: 0; left: 0; width: var(--sidebar-w); background: #fff; border-right: 1px solid var(--border); padding: 12px 10px; overflow-y: auto; transition: width .2s; }
      .sidebar.collapsed { width: var(--sidebar-w-collapsed); }
      .sidebar.collapsed .nav-label, .sidebar.collapsed .side-foot { display: none; }
      .sidebar.collapsed .nav-link { justify-content: center; padding: 11px 0; }
      .side-foot { font-size: .8rem; color: var(--muted); margin: 8px 6px; }
      .page { margin-left: var(--sidebar-w); width: calc(100% - var(--sidebar-w)); max-width: none; padding: 20px 24px 40px; transition: margin-left .2s, width .2s; }
      :host(.rail) .page { margin-left: var(--sidebar-w-collapsed); width: calc(100% - var(--sidebar-w-collapsed)); }
    }
    @media (min-width: 768px) and (max-width: 1023px) {
      .page { padding-left: 20px; padding-right: 20px; }
    }
    /* ---- laptop ---- */
    @media (min-width: 768px) { .page-inner { max-width: 880px; margin: 0 auto; } }
    @media (min-width: 1024px) { .page-inner { max-width: 1100px; } .page { padding: 24px 32px 48px; } }
    /* ---- large desktop ---- */
    @media (min-width: 1440px) { .page { padding: 28px 48px 56px; } .page-inner { max-width: 1320px; } }
    @media (prefers-reduced-motion: reduce) { .drawer, .sidebar, .page, .nav-link, .scrim { transition: none; } }
  `,
  host: { '[class.rail]': 'collapsed()' },
})
export class App {
  readonly items: NavItem[] = [
    { path: '', label: 'Home', icon: 'home' },
    { path: 'daily', label: 'Daily lesson', icon: 'calendar' },
    { path: 'vocabulary', label: 'Words', icon: 'book' },
    { path: 'sentences', label: 'Sentences', icon: 'original' },
    { path: 'grammar', label: 'Grammar', icon: 'text' },
    { path: 'revision', label: 'Revise', icon: 'repeat' },
    { path: 'conversations', label: 'Conversations', icon: 'chat' },
    { path: 'lela', label: 'Lela', icon: 'user' },
    { path: 'speaking', label: 'Speak', icon: 'mic' },
    { path: 'chat', label: 'Free chat', icon: 'send' },
    { path: 'progress', label: 'Progress', icon: 'chart' },
    { path: 'about', label: 'About', icon: 'info' },
  ];
  /** The five buttons of the bottom navigation on phones (the sixth, "More", opens the drawer). */
  readonly quick: NavItem[] = [this.items[0], this.items[7], this.items[8], this.items[2]];
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);
  readonly drawer = signal(false);
  readonly collapsed = signal(typeof window !== 'undefined' && window.innerWidth < 1024);
  private wasWide = typeof window !== 'undefined' && window.innerWidth >= 1024;

  constructor(router: Router) {
    router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.drawer.set(false));
  }

  @HostListener('window:online') goOnline(): void { this.online.set(true); }
  @HostListener('window:offline') goOffline(): void { this.online.set(false); }
  @HostListener('window:keydown.escape') closeDrawer(): void { this.drawer.set(false); }
  /** Crossing the laptop breakpoint resets the sidebar to its natural state for that size. */
  @HostListener('window:resize') onResize(): void {
    const wide = window.innerWidth >= 1024;
    if (wide !== this.wasWide) { this.wasWide = wide; this.collapsed.set(!wide); }
    if (window.innerWidth >= 768) this.drawer.set(false);
  }
}
