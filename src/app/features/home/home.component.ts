import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProgressService } from '../../core/progress.service';
import { SpeechService } from '../../services/speech.service';
import { IconComponent } from '../../shared/icon.component';

interface Feature { path: string; title: string; text: string; icon: string; color: string; tint: string; }

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <section class="banner">
      <div class="banner-text">
        <p class="hello"><app-icon name="flag-in" [size]="22" /> வணக்கம்! Welcome back</p>
        <h1>Speak English with confidence</h1>
        <p class="sub">Practise a little every day. <span lang="ta">தினமும் கொஞ்சம் பயிற்சி செய்யுங்கள்.</span></p>
        <div class="row cta">
          <a class="btn primary light" routerLink="/daily">
            <app-icon name="calendar" [size]="20" /> {{ progress.lessonCompleteToday() ? 'Review today\\'s lesson' : 'Start today\\'s lesson' }}
          </a>
          <a class="btn ghost" routerLink="/lela"><app-icon name="mic" [size]="20" /> Speak with Lela</a>
        </div>
        <ul class="checks" aria-label="Today's goals">
          @let day = progress.todayRecord();
          <li [class.done]="day.wordsLearned">{{ day.wordsLearned ? '✓' : '○' }} 10 new words</li>
          <li [class.done]="day.sentencesLearned">{{ day.sentencesLearned ? '✓' : '○' }} 10 new sentences</li>
          <li [class.done]="day.practiceDone">{{ day.practiceDone ? '✓' : '○' }} Practice</li>
          <li [class.done]="day.speakingDone">{{ day.speakingDone ? '✓' : '○' }} Speaking</li>
        </ul>
      </div>
      <img class="lela-home" src="/images/leela.png" alt="Lela, your English practice friend" />

    </section>

    <div class="stats">
      <section class="card stat"><span class="stat-icon" style="--c:#f76707;--t:#fff4e6"><app-icon name="flame" [size]="24" /></span><div><strong>{{ progress.stats().streak }} day streak</strong><p class="small">Best: {{ progress.stats().bestStreak }} days</p></div></section>
      <section class="card stat"><span class="stat-icon" style="--c:#7048e8;--t:#f3f0ff"><app-icon name="repeat" [size]="24" /></span><div><strong>{{ progress.dueWordIds().length }} to revise</strong><p class="small"><a routerLink="/revision">Open revision</a></p></div></section>
    </div>

    <h2 class="section-title">What would you like to practise?</h2>
    <div class="feature-grid">
      @for (f of features; track f.path) {
        <a class="feature" [routerLink]="f.path" [style.--c]="f.color" [style.--t]="f.tint">
          <span class="f-icon"><app-icon [name]="f.icon" [size]="28" /></span>
          <strong>{{ f.title }}</strong>
          <span class="f-text">{{ f.text }}</span>
        </a>
      }
    </div>

    <section class="card small status">
      @if (online()) { <p><app-icon name="corrected" [size]="16" /> Online. Lessons, words and conversations also work offline once opened.</p> }
      @else { <p><app-icon name="wifi-off" [size]="16" /> Offline. Lessons, words and the 2,000 conversations still work. Microphone speech recognition needs internet, so type your answers.</p> }
      @if (speech.recognitionIssue; as issue) { <p><app-icon name="mic-off" [size]="16" /> {{ issue }} You can type your answers.</p> }
      @if (!progress.storageHealthy()) {
        <p class="warn-text">⚠️ This browser is not saving progress (private mode or blocked storage). Progress will be lost when you close the page.</p>
      }
    </section>
  `,
  styles: `
    .banner { display: grid; grid-template-columns: 1fr; gap: 8px; align-items: center; margin: 0 0 16px; padding: 20px 18px 8px; border-radius: 22px; color: #fff; background: radial-gradient(circle at 85% 20%, #9775fa 0, transparent 45%), linear-gradient(135deg, #4c2a9a, #6a3fc9 60%, #8a5cf0); box-shadow: var(--shadow); overflow: hidden; }
    .banner h1 { color: #fff; font-size: 1.55rem; margin: 4px 0; } .banner .sub { margin: 4px 0 14px; opacity: .95; }
    .hello { margin: 0; display: flex; align-items: center; gap: 8px; font-weight: 600; opacity: .95; }
    .cta { margin-bottom: 12px; }
    .btn.light { background: #fff; color: var(--primary-dark); border-color: #fff; } .btn.light:hover:not(:disabled) { background: var(--primary-soft); }
    .btn.ghost { background: rgba(255,255,255,.16); color: #fff; border-color: rgba(255,255,255,.55); } .btn.ghost:hover:not(:disabled) { background: rgba(255,255,255,.28); }
    .checks { list-style: none; padding: 0; margin: 0 0 8px; display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: .9rem; }
    .checks li { opacity: .85; } .checks li.done { color: #b2f2bb; font-weight: 700; opacity: 1; }
    .art { display:none; }
    .lela-home { width: min(230px, 68%); max-height: 230px; object-fit: cover; object-position: center 24%; border-radius: 28px 28px 70px 28px; justify-self: center; box-shadow: 0 12px 28px #29105a44; border: 3px solid #ffffffaa; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 4px; }
    .stat { display: flex; align-items: center; gap: 10px; margin: 0; padding: 12px; } .stat strong { display: block; line-height: 1.2; font-size: .98rem; } .stat p { margin: 2px 0 0; }
    .stat-icon { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 14px; background: var(--t); color: var(--c); flex: none; }
    .section-title { margin: 18px 0 10px; font-size: 1.2rem; }
    .feature { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; padding: 16px 14px; background: #fff; border-radius: var(--radius); box-shadow: var(--shadow); text-decoration: none; color: var(--text); border: 1px solid transparent; min-height: 132px; transition: transform .18s, box-shadow .18s, border-color .18s; }
    .feature:hover { transform: translateY(-4px); box-shadow: var(--shadow-hover); border-color: var(--c); }
    .f-icon { display: inline-flex; align-items: center; justify-content: center; width: 52px; height: 52px; border-radius: 16px; background: var(--t); color: var(--c); }
    .feature strong { font-size: 1rem; line-height: 1.25; } .f-text { font-size: .82rem; color: var(--muted); line-height: 1.35; }
    .status { margin-top: 16px; } .status p { display: flex; align-items: flex-start; gap: 8px; margin: 4px 0; } .warn-text { color: #b71c1c; }
    @media (min-width: 768px) {
      .banner { grid-template-columns: 1.3fr 1fr; padding: 28px 32px 12px; } .banner h1 { font-size: 2rem; }
      .art { display:none; } .lela-home { width: 100%; max-width: 280px; max-height: 270px; } .feature { min-height: 150px; padding: 20px 18px; } .f-text { font-size: .9rem; }
    }
    @media (min-width: 1440px) { .banner { padding: 40px 56px 16px; } .banner h1 { font-size: 2.4rem; } .art { display:none; } .lela-home { max-width: 340px; max-height: 320px; } .stats { grid-template-columns: repeat(2, minmax(0, 360px)); } }
    @media (prefers-reduced-motion: reduce) { .feature { transition: none; } .feature:hover { transform: none; } }
  `,
})
export class HomeComponent {
  readonly progress = inject(ProgressService);
  readonly speech = inject(SpeechService);
  readonly online = signal(typeof navigator === 'undefined' ? true : navigator.onLine);

  readonly features: Feature[] = [
    { path: '/lela', title: 'Speak with Lela', text: 'Talk using your microphone. Lela listens and speaks back.', icon: 'mic', color: '#7048e8', tint: '#f3f0ff' },
    { path: '/chat', title: 'Chat with Lela', text: 'Type messages and get text replies, corrections and Tamil explanations.', icon: 'chat', color: '#1c7ed6', tint: '#e7f5ff' },
    { path: '/speaking', title: 'Speak & correct', text: 'Say a sentence, see what to fix', icon: 'mic', color: '#e64980', tint: '#fff0f6' },
    { path: '/conversations', title: 'Conversations', text: '2,000 everyday exchanges with Tamil', icon: 'chat', color: '#1c7ed6', tint: '#e7f5ff' },
    { path: '/vocabulary', title: 'Words', text: 'Learn new words with meaning', icon: 'book', color: '#f08c00', tint: '#fff4e6' },
    { path: '/dictionary', title: 'My Dictionary', text: 'Search words with autocomplete and free online meanings', icon: 'search', color: '#7048e8', tint: '#f3f0ff' },
    { path: '/practice-words', title: 'My Practice Words', text: 'Review and delete the words you have saved', icon: 'bookmark', color: '#0c8599', tint: '#e3fafc' },
    { path: '/irregular-verbs', title: 'Irregular Verb Practice', text: 'Practise V1, V2, V3 and V-ing with Tamil meanings', icon: 'book', color: '#7950f2', tint: '#f3f0ff' },
    { path: '/sentences', title: 'Sentences', text: 'Useful sentences, Tamil meaning', icon: 'original', color: '#0ca678', tint: '#e6fcf5' },
    { path: '/grammar', title: 'Grammar', text: 'Short, simple grammar notes', icon: 'text', color: '#d6336c', tint: '#fff0f6' },
    { path: '/revision', title: 'Revision', text: 'Review words before you forget', icon: 'repeat', color: '#3b5bdb', tint: '#edf2ff' },
    { path: '/progress', title: 'Progress', text: 'Your streak and results', icon: 'chart', color: '#2f9e44', tint: '#ebfbee' },
  ];

  @HostListener('window:online') goOnline(): void { this.online.set(true); }
  @HostListener('window:offline') goOffline(): void { this.online.set(false); }
}
