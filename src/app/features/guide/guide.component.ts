import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/icon.component';

interface GuideItem { title: string; route: string; location: string; details: string; options: string[]; icon: string; }

@Component({
  selector: 'app-guide',
  standalone: true,
  imports: [RouterLink, IconComponent],
  template: `
    <header class="hero">
      <p class="eyebrow">MY ENGLISH BUDDY · HELP CENTRE</p>
      <h1>App Guide &amp; Features</h1>
      <p>Find every learning section, what it does, and where to open it. தமிழ்: இந்த செயலியில் உள்ள வசதிகள் மற்றும் அவற்றை எங்கே திறப்பது என்பதற்கான வழிகாட்டி.</p>
    </header>
    <section class="quick card">
      <h2>How to find a feature</h2>
      <ul>
        <li><strong>Mobile:</strong> Tap the ☰ menu at the top-left, then choose a section. The bottom bar also has quick links; tap <strong>More</strong> for all sections.</li>
        <li><strong>Tablet / computer:</strong> Use the left sidebar. On a tablet, tap the menu icon to expand or collapse it.</li>
        <li><strong>Home:</strong> The Home screen contains shortcut cards for frequently used learning features.</li>
      </ul>
    </section>
    <h2 class="section-title">All features and where to find them</h2>
    <div class="feature-list">
      @for (item of features; track item.route) {
        <article class="feature card">
          <div class="feature-head"><span class="feature-icon"><app-icon [name]="item.icon" [size]="22" /></span><div><h3>{{ item.title }}</h3><p class="where">Open: {{ item.location }}</p></div></div>
          <p>{{ item.details }}</p>
          <ul>
            @for (option of item.options; track option) { <li>{{ option }}</li> }
          </ul>
          <a class="open-link" [routerLink]="item.route">Open {{ item.title }} <span aria-hidden="true">→</span></a>
        </article>
      }
    </div>
    <section class="card tips">
      <h2>Voice and offline tips</h2>
      <ul>
        <li><strong>Leela speaking:</strong> Use the speaker / listen controls in the Lela conversation. On Android, install or enable Google Speech Services and download an English voice if the phone has no voice available.</li>
        <li><strong>Dictionary pronunciation:</strong> Use the speaker icon beside a word to hear it. Pronunciation depends on the voices installed on your device.</li>
        <li><strong>Microphone:</strong> Allow microphone permission when Android asks. Speech recognition may require an internet connection and a supported browser / speech service.</li>
        <li><strong>Offline:</strong> Saved learning content can be available offline after it has loaded. Online dictionary lookup and speech recognition need a connection.</li>
        <li><strong>Progress:</strong> Your learning progress is stored on this device. Avoid clearing app/browser storage if you want to keep it.</li>
      </ul>
    </section>
    <section class="card settings-note">
      <h2>Settings and app information</h2>
      <p>Open <strong>About</strong> from the menu to change speaking speed, show or hide Tamil meanings, check microphone / speech availability, view grammar-checker limitations, and reset local progress.</p>
      <a class="open-link" routerLink="/about">Open Settings &amp; About →</a>
    </section>
    <p class="footnote">Feature availability can depend on the device, installed language voices, microphone permission, and internet connection.</p>
  `,
  styles: `
    :host { display:block; }
    .hero { padding:22px; border-radius:22px; color:#fff; background:linear-gradient(135deg,#4c2a9a,#8055df); margin-bottom:16px; }
    .hero h1 { color:#fff; margin:4px 0 8px; font-size:1.65rem; }
    .hero p { margin:0; line-height:1.55; }
    .eyebrow { font-size:.75rem; letter-spacing:.12em; font-weight:800; opacity:.8; }
    .card { background:#fff; border:1px solid var(--border); border-radius:16px; padding:16px; margin:12px 0; box-shadow:var(--shadow); }
    h2 { font-size:1.12rem; margin:0 0 10px; } h3 { font-size:1rem; margin:0; }
    ul { padding-left:20px; margin:8px 0; } li { margin:6px 0; line-height:1.45; }
    .section-title { margin:22px 0 10px; }
    .feature-list { display:grid; grid-template-columns:1fr; gap:10px; }
    .feature { margin:0; }
    .feature-head { display:flex; align-items:center; gap:12px; }
    .feature-icon { display:grid; place-items:center; width:44px; height:44px; flex:none; border-radius:13px; color:var(--primary); background:var(--primary-soft); }
    .where { margin:3px 0 0; font-size:.82rem; color:var(--muted); }
    .feature > p { line-height:1.5; margin:12px 0 6px; }
    .feature ul { font-size:.9rem; }
    .open-link { display:inline-flex; gap:6px; align-items:center; margin-top:8px; color:var(--primary-dark); font-weight:700; text-decoration:none; }
    .open-link:hover { text-decoration:underline; }
    .tips, .settings-note { margin-top:18px; }
    .footnote { color:var(--muted); font-size:.82rem; margin:16px 4px; }
    @media(min-width:760px) { .feature-list { grid-template-columns:repeat(2,minmax(0,1fr)); } .hero { padding:30px; } .hero h1 { font-size:2rem; } }
    @media(min-width:1200px) { .feature-list { grid-template-columns:repeat(3,minmax(0,1fr)); } }
  `,
})
export class GuideComponent {
  readonly features: GuideItem[] = [
    { title:'Home dashboard', route:'/', location:'Home', details:'Your starting screen with shortcuts, daily goals, streak and revision reminder.', icon:'home', options:['Start today’s lesson','Speak with Lela','See learning shortcuts and daily progress'] },
    { title:'Daily lesson', route:'/daily', location:'Menu → Daily lesson', details:'A short daily learning routine to build a regular English habit.', icon:'calendar', options:['Daily words and sentences','Practice tasks','Mark daily learning progress'] },
    { title:'Vocabulary / Words', route:'/vocabulary', location:'Menu → Words', details:'Learn useful English words with simple explanations and Tamil support.', icon:'book', options:['Browse learning words','Read meanings and examples','Use available listen controls'] },
    { title:'My Dictionary', route:'/dictionary', location:'Menu → My Dictionary', details:'Search for a word, use suggestions, and check dictionary meanings.', icon:'search', options:['Word search and autocomplete','Free online dictionary lookup when connected','Tamil meaning and pronunciation speaker control','Saved words can be reused locally'] },
    { title:'My Practice Words', route:'/practice-words', location:'Menu → My Practice Words', details:'Manage words saved from dictionary and learning activities.', icon:'bookmark', options:['Review saved words','Search / browse your saved list','Remove words you no longer need'] },
    { title:'Prepositions', route:'/prepositions', location:'Menu → Prepositions', details:'Learn how common prepositions work in everyday English.', icon:'text', options:['Preposition explanations and examples','Practice sentences','Search and Tamil support where provided'] },
    { title:'Irregular Verb Practice', route:'/irregular-verbs', location:'Menu → Irregular Verb Practice', details:'Study irregular verb forms and test your recall.', icon:'book', options:['Base form','Past simple','Past participle','Present participle (-ing)','Tamil meaning, search and practice'] },
    { title:'Sentences', route:'/sentences', location:'Menu → Sentences', details:'Read useful English sentences with Tamil meaning to improve everyday usage.', icon:'original', options:['Browse sentence collections','Read English and Tamil meanings','Practise sentence patterns'] },
    { title:'Grammar', route:'/grammar', location:'Menu → Grammar', details:'Review simple grammar explanations and common language patterns.', icon:'text', options:['Short grammar notes','Examples for common structures','Use the notes while practising'] },
    { title:'Daily Practice', route:'/practice', location:'Menu → Daily Practice', details:'Practise converting Tamil thoughts into natural English.', icon:'text', options:['Tamil-to-English prompts','Submit your answer','Review feedback and corrections'] },
    { title:'Revision', route:'/revision', location:'Menu → Revise', details:'Return to words that are ready for review and strengthen memory.', icon:'repeat', options:['Review due words','Practise remembered vocabulary','Build a revision habit'] },
    { title:'Conversations', route:'/conversations', location:'Menu → Conversations', details:'Study everyday conversations for practical situations.', icon:'chat', options:['Everyday topics and role-plays','English dialogue with Tamil support','Read and practise useful exchanges'] },
    { title:'Talk with Lela', route:'/lela', location:'Menu → Lela', details:'Have a voice-based practice session with Lela.', icon:'mic', options:['Speak using the microphone','Listen to Lela’s spoken replies when device speech is available','Practise natural short conversations'] },
    { title:'Speak & Correct', route:'/speaking', location:'Menu → Speak', details:'Say an English sentence and review suggested corrections.', icon:'mic', options:['Voice input where supported','See the recognised sentence','Review correction and explanation'] },
    { title:'Chat with Lela', route:'/chat', location:'Menu → Chat with Lela', details:'Type messages to practise written conversation with Lela.', icon:'chat', options:['Send text messages','Read replies and corrections','Use Tamil explanations where available'] },
    { title:'Progress', route:'/progress', location:'Menu → Progress', details:'Check your learning activity and keep track of improvement.', icon:'chart', options:['Learning streak and scores','Practice / lesson activity','Backup or review progress tools when available'] },
    { title:'Settings & About', route:'/about', location:'Menu → About', details:'Adjust app preferences and check device capabilities.', icon:'info', options:['Speaking speed','Show or hide Tamil meanings','Check speech, microphone and storage status','Grammar checker information and reset option'] },
    { title:'App Guide', route:'/guide', location:'Menu → App Guide', details:'This page: a map of the app’s sections and what each one does.', icon:'info', options:['Feature descriptions','Where each section is located','Direct Open links to each section'] },
  ];
}
