import { DatePipe } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LelaConversationService } from '../../lela/lela-conversation.service';
import { IconComponent } from '../../shared/icon.component';
import { DataService } from '../../core/data.service';
import type { Word } from '../../models/learning.models';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent, DatePipe],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  readonly lela = inject(LelaConversationService);
  readonly draft = signal('');
  readonly showHistory = signal(false);
  readonly practiceLanguage = signal<'english' | 'tamil' | 'tenses'>('english');
  readonly tenseDirection = signal<'english' | 'tamil'>('english');
  readonly selectedTense = signal('present-simple');
  readonly tenseWordSearch = signal('');
  readonly tenseWords = signal<Word[]>([]);
  readonly tenseMessages = signal<{ id: number; from: 'lela' | 'user'; text: string }[]>([]);
  readonly tenseIndex = signal(0);
  readonly tenseFeedback = signal('');
  private readonly data = inject(DataService);
  readonly tenses = [
    { id:'present-simple', name:'Present Simple', formula:'Subject + base verb (s/es)', en:'I practise English every day.', ta:'நான் தினமும் ஆங்கிலம் பயிற்சி செய்கிறேன்.', answer:'I practise English every day.', explanation:'Daily habits and routines — வழக்கமாக நடக்கும் செயல்கள்.' },
    { id:'present-continuous', name:'Present Continuous', formula:'Subject + am/is/are + verb-ing', en:'I am learning new words now.', ta:'நான் இப்போது புதிய சொற்களைக் கற்றுக்கொண்டிருக்கிறேன்.', answer:'I am learning new words now.', explanation:'An action happening now — இப்போது நடந்து கொண்டிருக்கும் செயல்.' },
    { id:'present-perfect', name:'Present Perfect', formula:'Subject + has/have + past participle', en:'I have finished my work.', ta:'நான் என் வேலையை முடித்துவிட்டேன்.', answer:'I have finished my work.', explanation:'A completed action connected to the present — நிகழ்காலத்துடன் தொடர்புள்ள முடிந்த செயல்.' },
    { id:'present-perfect-continuous', name:'Present Perfect Continuous', formula:'Subject + has/have been + verb-ing', en:'I have been studying for two hours.', ta:'நான் இரண்டு மணி நேரமாகப் படித்துக்கொண்டிருக்கிறேன்.', answer:'I have been studying for two hours.', explanation:'An action that started earlier and continues — முன்பு தொடங்கி இப்போதும் தொடரும் செயல்.' },
    { id:'past-simple', name:'Past Simple', formula:'Subject + past verb', en:'I visited my friend yesterday.', ta:'நான் நேற்று என் நண்பரைச் சந்தித்தேன்.', answer:'I visited my friend yesterday.', explanation:'A finished action in the past — கடந்த காலத்தில் முடிந்த செயல்.' },
    { id:'past-continuous', name:'Past Continuous', formula:'Subject + was/were + verb-ing', en:'I was watching television at eight.', ta:'எட்டு மணிக்கு நான் தொலைக்காட்சி பார்த்துக்கொண்டிருந்தேன்.', answer:'I was watching television at eight.', explanation:'An action in progress at a past time — கடந்த நேரத்தில் நடந்துகொண்டிருந்த செயல்.' },
    { id:'past-perfect', name:'Past Perfect', formula:'Subject + had + past participle', en:'I had eaten before he arrived.', ta:'அவர் வருவதற்கு முன்பே நான் சாப்பிட்டிருந்தேன்.', answer:'I had eaten before he arrived.', explanation:'An earlier past action before another past action — மற்றொரு கடந்தகாலச் செயலுக்கு முன் முடிந்த செயல்.' },
    { id:'past-perfect-continuous', name:'Past Perfect Continuous', formula:'Subject + had been + verb-ing', en:'I had been waiting for an hour.', ta:'நான் ஒரு மணி நேரமாகக் காத்துக்கொண்டிருந்தேன்.', answer:'I had been waiting for an hour.', explanation:'Duration before a point in the past — கடந்தகாலத்தில் ஒரு நேரத்திற்கு முன்புவரை தொடர்ந்த செயல்.' },
    { id:'future-simple', name:'Future Simple', formula:'Subject + will + base verb', en:'I will call you tomorrow.', ta:'நான் நாளை உங்களை அழைப்பேன்.', answer:'I will call you tomorrow.', explanation:'A future action or decision — எதிர்காலத்தில் நடக்கும் செயல்.' },
    { id:'future-continuous', name:'Future Continuous', formula:'Subject + will be + verb-ing', en:'I will be working at ten.', ta:'பத்து மணிக்கு நான் வேலை செய்துகொண்டிருப்பேன்.', answer:'I will be working at ten.', explanation:'An action in progress at a future time — எதிர்கால நேரத்தில் நடந்துகொண்டிருக்கும் செயல்.' },
    { id:'future-perfect', name:'Future Perfect', formula:'Subject + will have + past participle', en:'I will have completed it by Monday.', ta:'திங்கட்கிழமைக்குள் அதை முடித்திருப்பேன்.', answer:'I will have completed it by Monday.', explanation:'An action completed before a future time — எதிர்கால நேரத்திற்கு முன் முடிந்திருக்கும் செயல்.' },
    { id:'future-perfect-continuous', name:'Future Perfect Continuous', formula:'Subject + will have been + verb-ing', en:'By June, I will have been working here for a year.', ta:'ஜூன் மாதத்திற்குள் நான் இங்கு ஒரு வருடமாக வேலை செய்துகொண்டிருப்பேன்.', answer:'By June, I will have been working here for a year.', explanation:'Duration continuing up to a future point — எதிர்கால நேரம் வரை தொடர்ந்திருக்கும் செயல்.' }
  ];
  readonly translationMessages = signal<{ id: number; from: 'lela' | 'user'; text: string; note?: string }[]>([]);
  readonly translationTopic = signal('Shopping');
  readonly translationIndex = signal(0);
  readonly translationFeedback = signal('');
  readonly translationTopics = ['Shopping', 'Hotel', 'Restaurant', 'Travel', 'Daily life', 'Friends & Family', 'Workplace', 'Job Interview', 'Telephone'];
  private readonly translationSets: Record<string, { ta: string; answers: string[]; note: string }[]> = {
    Shopping: [
      { ta: 'இந்த சட்டையின் விலை எவ்வளவு?', answers: ['how much is this shirt', 'what is the price of this shirt'], note: 'Use “How much is…?” to ask the price.' },
      { ta: 'எனக்கு ஒரு நீல நிற சட்டை வேண்டும்.', answers: ['i want a blue shirt', 'i would like a blue shirt'], note: '“I would like” is a polite way to say what you want.' },
      { ta: 'வேறு நிறங்கள் இருக்கிறதா?', answers: ['do you have other colours', 'are there any other colours'], note: 'Use “Do you have…?” to ask what is available.' },
      { ta: 'நான் இதை முயற்சி செய்து பார்க்கலாமா?', answers: ['can i try this on', 'may i try this on'], note: '“Try this on” means wear it to check the fit.' },
      { ta: 'கொஞ்சம் குறைக்க முடியுமா?', answers: ['can you reduce the price a little', 'could you give me a discount'], note: '“Could you…?” makes a polite request.' }
    ],
    Hotel: [
      { ta: 'எனக்கு ஒரு அறை முன்பதிவு செய்ய வேண்டும்.', answers: ['i want to book a room', 'i would like to book a room'], note: 'Use “book a room” for a hotel reservation.' },
      { ta: 'ஒரு இரவுக்கு எவ்வளவு?', answers: ['how much is it for one night', 'how much does it cost for one night'], note: 'Use “How much…?” to ask about the cost.' },
      { ta: 'காலை உணவு இதில் சேர்க்கப்பட்டுள்ளதா?', answers: ['is breakfast included', 'is breakfast included in this'], note: '“Included” means part of the price.' },
      { ta: 'அறையை எப்போது காலி செய்ய வேண்டும்?', answers: ['when should i check out', 'what time do i need to check out'], note: '“Check out” means leave the hotel room.' },
      { ta: 'எனக்கு இன்னொரு தலையணை வேண்டும்.', answers: ['i need another pillow', 'could i have another pillow'], note: '“Could I have…?” is a polite request.' }
    ],
    Restaurant: [
      { ta: 'இரண்டு பேருக்கு ஒரு மேசை வேண்டும்.', answers: ['i need a table for two', 'i would like a table for two'], note: 'Use “a table for two” when asking for seating.' },
      { ta: 'உங்களிடம் சைவ உணவு இருக்கிறதா?', answers: ['do you have vegetarian food', 'do you have any vegetarian dishes'], note: '“Do you have…?” asks about availability.' },
      { ta: 'கணக்கைக் கொடுக்க முடியுமா?', answers: ['can i have the bill', 'could i have the bill please'], note: '“Could I have the bill?” is polite.' }
    ],
    Travel: [
      { ta: 'பேருந்து நிலையம் எங்கே இருக்கிறது?', answers: ['where is the bus station', 'where is the bus stand'], note: 'Use “Where is…?” to ask for a place.' },
      { ta: 'இந்த ரயில் சென்னைக்குச் செல்கிறதா?', answers: ['does this train go to chennai', 'is this train going to chennai'], note: 'Use “Does this…?” for a simple present question.' }
    ],
    'Daily life': [
      { ta: 'நான் தினமும் காலை ஆறு மணிக்கு எழுந்திருப்பேன்.', answers: ['i wake up at six every morning', 'i get up at six every day'], note: 'Use the simple present for daily habits.' },
      { ta: 'இன்று எனக்கு கொஞ்சம் வேலை இருக்கிறது.', answers: ['i have some work today', 'i have a little work today'], note: '“I have…” describes something you need to do.' }
    ],
    'Friends & Family': [
      { ta: 'நீ இன்று மாலை என்ன செய்கிறாய்?', answers: ['what are you doing this evening', 'what are you doing tonight'], note: 'Use present continuous for a planned activity.' },
      { ta: 'நாம் ஒன்றாக தேநீர் குடிக்கலாமா?', answers: ['shall we have tea together', 'can we have tea together'], note: '“Shall we…?” makes a friendly suggestion.' }
    ],
    Workplace: [
      { ta: 'நான் இந்த வேலையை நாளைக்குள் முடித்துவிடுவேன்.', answers: ['i will finish this work by tomorrow', 'i will complete this task by tomorrow'], note: 'Use “will” for a future promise.' },
      { ta: 'தயவுசெய்து அந்த கோப்பை எனக்கு அனுப்புங்கள்.', answers: ['please send me that file', 'could you please send me that file'], note: '“Could you please…?” is polite at work.' }
    ],
    'Job Interview': [
      { ta: 'எனக்கு ஏழு வருட தொழில்நுட்ப ஆதரவு அனுபவம் உள்ளது.', answers: ['i have seven years of technical support experience', 'i have seven years experience in technical support'], note: 'Use “I have … years of experience” to describe your background.' },
      { ta: 'நான் புதிய தொழில்நுட்பங்களை கற்றுக்கொள்ள விரும்புகிறேன்.', answers: ['i want to learn new technologies', 'i would like to learn new technologies'], note: '“Would like to” sounds professional and polite.' }
    ],
    Telephone: [
      { ta: 'நான் ரவியுடன் பேசலாமா?', answers: ['may i speak to ravi', 'can i speak to ravi'], note: 'Use “May I speak to…?” on a formal call.' },
      { ta: 'தயவுசெய்து அவரை அழைக்கச் சொல்லுங்கள்.', answers: ['please ask him to call me', 'could you ask him to call me'], note: '“Ask him to call me” is a polite request.' }
    ]
  };

  readonly practiceModes = [
    { id: 'free', label: 'Free chat', icon: '💬', hint: 'Talk about anything' },
    { id: 'daily', label: 'Daily life', icon: '🌅', hint: 'Everyday conversations' },
    { id: 'office', label: 'Office', icon: '🏢', hint: 'Workplace communication' },
    { id: 'interview', label: 'Interview', icon: '🎯', hint: 'Practise interview answers' },
    { id: 'telephone', label: 'Phone calls', icon: '📞', hint: 'Speak politely on calls' },
    { id: 'travel', label: 'Travel', icon: '✈️', hint: 'Hotels, stations and directions' },
  ];
  readonly quickPrompts = [
    'Ask me about my day',
    'Let us practise introducing ourselves',
    'I want to speak English at work',
    'Help me explain my daily routine',
  ];
  @ViewChild('scrollBox') private scrollBox?: ElementRef<HTMLDivElement>;
  private scrollPending = false;

  ngOnInit(): void {
    void this.start();
    void this.loadTenseWords();
  }

  private async loadTenseWords(): Promise<void> {
    try {
      const manifest = await this.data.manifest();
      const lists = await Promise.all(manifest.vocabCategories.map(c => this.data.vocabulary(c.id)));
      const seen = new Set<string>();
      const words = lists.flat().filter(w => { const key = w.word.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 1500);
      this.tenseWords.set(words);
    } catch { this.tenseWords.set([]); }
  }

  /** Current tense selected in the practice dropdown (template-safe; no arrow functions in HTML). */
  get selectedTenseInfo() {
    return this.tenses.find(item => item.id === this.selectedTense()) ?? this.tenses[0];
  }

  get filteredTenseWords(): Word[] {
    const q = this.tenseWordSearch().trim().toLowerCase();
    const list = this.tenseWords();
    return (q ? list.filter(w => w.word.toLowerCase().includes(q) || w.tamil.includes(q)) : list).slice(0, 30);
  }

  async start(): Promise<void> {
    await this.lela.startTextChat();
    this.scrollPending = true;
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.send();
    }
  }

  async send(): Promise<void> {
    const text = this.draft().trim();
    if (!text || this.lela.phase() === 'thinking') return;
    this.draft.set('');
    if (this.practiceLanguage() === 'tamil') { this.checkTranslation(text); this.scrollPending = true; return; }
    if (this.practiceLanguage() === 'tenses') { this.checkTenseAnswer(text); this.scrollPending = true; return; }
    await this.lela.submit(text, 'typed');
    this.scrollPending = true;
  }

  chooseLanguage(mode: 'english' | 'tamil' | 'tenses'): void {
    this.practiceLanguage.set(mode);
    if (mode === 'tamil') this.startTranslationPractice(this.translationTopic());
    else if (mode === 'tenses') this.startTensePractice();
    else { this.translationMessages.set([]); this.tenseMessages.set([]); void this.lela.newTextConversation(); }
  }

  startTensePractice(): void {
    this.tenseIndex.set(0); this.tenseFeedback.set(''); this.tenseMessages.set([]);
    this.askTenseQuestion();
  }

  selectTense(id: string): void { this.selectedTense.set(id); this.startTensePractice(); }

  selectTenseDirection(direction: 'english' | 'tamil'): void { this.tenseDirection.set(direction); this.startTensePractice(); }

  private askTenseQuestion(): void {
    const item = this.tenses.find(t => t.id === this.selectedTense()) ?? this.tenses[0];
    const prompt = this.tenseDirection() === 'tamil' ? `தமிழில் இருந்து ஆங்கிலத்திற்கு மொழிபெயர்க்கவும்:\n\n${item.ta}` : `Translate this English sentence into Tamil:\n\n${item.en}`;
    this.tenseMessages.set([...this.tenseMessages(), { id: Date.now(), from:'lela', text:`${item.name}\n${item.formula}\n\n${prompt}` }]);
  }

  private checkTenseAnswer(answer: string): void {
    const item = this.tenses.find(t => t.id === this.selectedTense()) ?? this.tenses[0];
    const expected = this.tenseDirection() === 'tamil' ? item.answer : item.ta;
    const normalized = (v: string) => v.toLowerCase().replace(/[^\p{L}\p{N} ]/gu,'').replace(/\s+/g,' ').trim();
    const ok = normalized(answer) === normalized(expected);
    const msgs = [...this.tenseMessages(), { id:Date.now(), from:'user' as const, text:answer }, { id:Date.now()+1, from:'lela' as const, text:`${ok ? 'அருமை! சரியான பதில். / Excellent!' : 'நல்ல முயற்சி! / Good try!'}\n\n${this.tenseDirection() === 'tamil' ? item.answer : item.ta}\n\n${item.name}: ${item.formula}\n${item.explanation}\n\n${this.tenseDirection() === 'tamil' ? 'இந்த வாக்கியத்தை மீண்டும் எழுதிப் பாருங்கள் அல்லது அடுத்த பயிற்சிக்குச் செல்லுங்கள்.' : 'Read the Tamil meaning and try the next sentence.'}` }];
    this.tenseMessages.set(msgs); this.tenseIndex.update(n => n + 1);
  }

  nextTenseQuestion(): void { this.askTenseQuestion(); }

  startTranslationPractice(topic: string): void {
    this.translationTopic.set(topic); this.translationIndex.set(0); this.translationFeedback.set('');
    const first = this.translationSets[topic]?.[0];
    this.translationMessages.set([{ id: 1, from: 'lela', text: `சரி! ${topic} பயிற்சி செய்வோம். இந்த வாக்கியத்தை ஆங்கிலத்தில் மொழிபெயர்க்கவும்:\n\n${first?.ta ?? 'நீங்கள் இன்று எப்படி இருக்கிறீர்கள்?'}` }]);
  }

  private checkTranslation(answer: string): void {
    const list = this.translationSets[this.translationTopic()] ?? [];
    const item = list[this.translationIndex() % Math.max(1, list.length)];
    const normalize = (v: string) => v.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
    const ok = !!item && item.answers.some(a => normalize(a) === normalize(answer));
    const msgs: { id: number; from: 'lela' | 'user'; text: string; note?: string }[] = [...this.translationMessages(), { id: Date.now(), from: 'user', text: answer }];
    if (ok) {
      msgs.push({ id: Date.now()+1, from: 'lela', text: `அருமை! சரியான பதில்.\n\n${item.answers[0]}.\n\n${item.note}` });
    } else {
      msgs.push({ id: Date.now()+1, from: 'lela', text: `நல்ல முயற்சி! சரியான பதில்: ${item.answers[0]}.\n\n${item.note}\n\nமீண்டும் முயற்சி செய்யலாம்.` });
    }
    if (ok) {
      const nextIndex = this.translationIndex() + 1; this.translationIndex.set(nextIndex);
      const next = list[nextIndex % Math.max(1, list.length)];
      if (next) msgs.push({ id: Date.now()+2, from: 'lela', text: `அடுத்த வாக்கியம்:\n\n${next.ta}` });
    } else {
      msgs.push({ id: Date.now()+2, from: 'lela', text: `மீண்டும் முயற்சி செய்யுங்கள்: ${item.ta}` });
    }
    this.translationMessages.set(msgs);
  }

  async newChat(modeId?: string): Promise<void> {
    this.showHistory.set(false);
    await this.lela.newTextConversation(modeId);
    this.scrollPending = true;
  }

  choosePrompt(prompt: string): void {
    this.draft.set(prompt);
  }

  ngAfterViewChecked(): void {
    if (!this.scrollPending) return;
    this.scrollPending = false;
    const box = this.scrollBox?.nativeElement;
    if (box) box.scrollTop = box.scrollHeight;
  }

  ngOnDestroy(): void {
    this.lela.pause();
  }
}
