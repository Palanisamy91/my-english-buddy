import { Routes } from '@angular/router';

// Every screen is loaded only when it is opened (lazy loading), which keeps the first load small.
export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./features/home/home.component').then((m) => m.HomeComponent), title: 'Lela — English Communication Trainer' },
  { path: 'daily', loadComponent: () => import('./features/daily/daily.component').then((m) => m.DailyComponent), title: "Today's lesson" },
  { path: 'vocabulary', loadComponent: () => import('./features/vocabulary/vocabulary.component').then((m) => m.VocabularyComponent), title: 'Vocabulary' },
  { path: 'dictionary', loadComponent: () => import('./features/dictionary/dictionary.component').then((m) => m.DictionaryComponent), title: 'My Dictionary' },
  { path: 'practice-words', loadComponent: () => import('./features/practice-words/practice-words.component').then((m) => m.PracticeWordsComponent), title: 'My Practice Words' },
  { path: 'prepositions', loadComponent: () => import('./features/prepositions/prepositions.component').then((m) => m.PrepositionsComponent), title: 'Prepositions Practice' },
  { path: 'irregular-verbs', loadComponent: () => import('./features/irregular-verbs/irregular-verbs.component').then((m) => m.IrregularVerbsComponent), title: 'Irregular Verbs' },
  { path: 'sentences', loadComponent: () => import('./features/sentences/sentences.component').then((m) => m.SentencesComponent), title: 'Sentences' },
  { path: 'grammar', loadComponent: () => import('./features/grammar/grammar.component').then((m) => m.GrammarComponent), title: 'Grammar' },
  { path: 'practice', loadComponent: () => import('./features/practice-centre/practice-centre.component').then((m) => m.PracticeCentreComponent), title: 'Daily Tamil to English Practice' },
  { path: 'revision', loadComponent: () => import('./features/revision/revision.component').then((m) => m.RevisionComponent), title: 'Revision' },
  { path: 'speaking', loadComponent: () => import('./features/speaking/speaking.component').then((m) => m.SpeakingComponent), title: 'Speaking practice' },
  { path: 'conversations', loadComponent: () => import('./features/conversations/conversations.component').then((m) => m.ConversationsComponent), title: 'Conversation practice' },
  { path: 'lela', loadComponent: () => import('./lela/lela.component').then((m) => m.LelaComponent), title: 'Talk with Lela' },
  { path: 'chat', loadComponent: () => import('./components/chat/chat.component').then((m) => m.ChatComponent), title: 'Chat with Lela' },
  { path: 'progress', loadComponent: () => import('./features/progress/progress.component').then((m) => m.ProgressComponent), title: 'My progress' },
  { path: 'about', loadComponent: () => import('./features/about/about.component').then((m) => m.AboutComponent), title: 'Settings and about' },
  { path: 'guide', loadComponent: () => import('./features/guide/guide.component').then((m) => m.GuideComponent), title: 'App Guide and Features' },
  { path: '**', redirectTo: '' },
];
