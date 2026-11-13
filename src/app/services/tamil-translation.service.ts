import { Injectable } from '@angular/core';
import { TranslationResult, WordMeaning } from '../models/chat.models';

// Keys are lowercase, with punctuation removed (apostrophes kept).
const PHRASES = new Map<string, string>(
  Object.entries({
    'hello': 'வணக்கம்.',
    'hi': 'வணக்கம்.',
    'good morning': 'காலை வணக்கம்.',
    'good afternoon': 'மதிய வணக்கம்.',
    'good evening': 'மாலை வணக்கம்.',
    'good night': 'இனிய இரவு.',
    'how are you': 'நீங்கள் எப்படி இருக்கிறீர்கள்?',
    'i am fine': 'நான் நலமாக இருக்கிறேன்.',
    'i am happy': 'நான் மகிழ்ச்சியாக இருக்கிறேன்.',
    'i am tired': 'நான் களைப்பாக இருக்கிறேன்.',
    'thank you': 'நன்றி.',
    'thank you very much': 'மிக்க நன்றி.',
    'you are welcome': 'பரவாயில்லை.',
    'sorry': 'மன்னிக்கவும்.',
    'excuse me': 'மன்னிக்கவும்.',
    'please': 'தயவுசெய்து.',
    'what is your name': 'உங்கள் பெயர் என்ன?',
    'nice to meet you': 'உங்களைச் சந்தித்ததில் மகிழ்ச்சி.',
    'where do you live': 'நீங்கள் எங்கே வசிக்கிறீர்கள்?',
    'i agree with you': 'நான் உங்களுடன் உடன்படுகிறேன்.',
    "i don't understand": 'எனக்குப் புரியவில்லை.',
    'can you help me': 'நீங்கள் எனக்கு உதவ முடியுமா?',
    'please speak slowly': 'தயவுசெய்து மெதுவாகப் பேசுங்கள்.',
    'i am learning english': 'நான் ஆங்கிலம் கற்றுக்கொண்டிருக்கிறேன்.',
    'i work in an office': 'நான் ஒரு அலுவலகத்தில் வேலை செய்கிறேன்.',
    'i am working in an office': 'நான் ஒரு அலுவலகத்தில் வேலை செய்துகொண்டிருக்கிறேன்.',
    "i didn't go to office": 'நான் அலுவலகத்திற்குப் போகவில்லை.',
    "she doesn't like tea": 'அவளுக்கு தேநீர் பிடிக்காது.',
    'he has a car': 'அவனிடம் ஒரு கார் உள்ளது.',
    // Questions and messages the assistant uses
    'what did you do today': 'நீங்கள் இன்று என்ன செய்தீர்கள்?',
    'tell me about your family': 'உங்கள் குடும்பத்தைப் பற்றி சொல்லுங்கள்.',
    'what is your favourite food': 'உங்களுக்குப் பிடித்த உணவு என்ன?',
    'what is your favorite food': 'உங்களுக்குப் பிடித்த உணவு என்ன?',
    'what are your plans for the weekend': 'வார இறுதிக்கு உங்கள் திட்டங்கள் என்ன?',
    'why do you want to learn english': 'நீங்கள் ஏன் ஆங்கிலம் கற்றுக்கொள்ள விரும்புகிறீர்கள்?',
    'i am your english buddy': 'நான் உங்கள் ஆங்கில நண்பன்.',
    'say or type a sentence and i will check it':
      'ஒரு வாக்கியத்தைச் சொல்லுங்கள் அல்லது தட்டச்சு செய்யுங்கள், நான் அதைச் சரிபார்க்கிறேன்.',
    'good job': 'நன்றாகச் செய்தீர்கள்!',
    'i found no mistakes using my simple rules': 'என் எளிய விதிகளின்படி எந்தத் தவறும் இல்லை.',
    'this does not prove your sentence is perfect':
      'உங்கள் வாக்கியம் முழுமையாகச் சரியானது என்பதை இது உறுதிப்படுத்தாது.',
  })
);

const GLOSSARY = new Map<string, string>(
  Object.entries({
    i: 'நான்', you: 'நீங்கள்', he: 'அவன்', she: 'அவள்', we: 'நாங்கள்',
    they: 'அவர்கள்', it: 'அது', my: 'என்', your: 'உங்கள்',
    name: 'பெயர்', family: 'குடும்பம்', food: 'உணவு', favourite: 'பிடித்த',
    today: 'இன்று', yesterday: 'நேற்று', tomorrow: 'நாளை', weekend: 'வார இறுதி',
    plan: 'திட்டம்', plans: 'திட்டங்கள்', learn: 'கற்றுக்கொள்', english: 'ஆங்கிலம்',
    tamil: 'தமிழ்', speak: 'பேசு', understand: 'புரிந்துகொள்', help: 'உதவி',
    happy: 'மகிழ்ச்சி', tired: 'களைப்பு', good: 'நல்ல', morning: 'காலை',
    evening: 'மாலை', night: 'இரவு', water: 'தண்ணீர்', tea: 'தேநீர்',
    coffee: 'காபி', house: 'வீடு', home: 'வீடு', office: 'அலுவலகம்',
    work: 'வேலை', school: 'பள்ளி', friend: 'நண்பன்', mother: 'அம்மா',
    father: 'அப்பா', brother: 'சகோதரன்', sister: 'சகோதரி', go: 'போ',
    come: 'வா', eat: 'சாப்பிடு', drink: 'குடி', like: 'விரும்பு',
    love: 'அன்பு', want: 'வேண்டும்', car: 'கார்', book: 'புத்தகம்',
    time: 'நேரம்', day: 'நாள்', why: 'ஏன்', what: 'என்ன',
    where: 'எங்கே', when: 'எப்போது', who: 'யார்', how: 'எப்படி',
    yes: 'ஆம்', no: 'இல்லை', thank: 'நன்றி', please: 'தயவுசெய்து',
    sorry: 'மன்னிக்கவும்', agree: 'உடன்படு', question: 'கேள்வி',
    sentence: 'வாக்கியம்', type: 'தட்டச்சு செய்', check: 'சரிபார்', with: 'உடன்',
  })
);

/**
 * OFFLINE phrase dictionary + word glossary. This is NOT machine
 * translation: it only knows the sentences and words listed above.
 */
@Injectable({ providedIn: 'root' })
export class TamilTranslationService {
  translate(text: string): TranslationResult {
    const sentences = text
      .split(/[.!?:]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const found: string[] = [];
    for (const sentence of sentences) {
      const tamil = PHRASES.get(this.normalize(sentence));
      if (tamil) {
        found.push(tamil);
      }
    }

    return {
      tamil: found.length > 0 ? found.join(' ') : null,
      complete: sentences.length > 0 && found.length === sentences.length,
      wordMeanings: this.lookupWords(text),
    };
  }

  private lookupWords(text: string): WordMeaning[] {
    const seen = new Set<string>();
    const result: WordMeaning[] = [];
    for (const word of this.normalize(text).split(' ')) {
      const tamil = GLOSSARY.get(word);
      if (tamil && !seen.has(word)) {
        seen.add(word);
        result.push({ english: word, tamil });
      }
    }
    return result;
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .replace(/[‘’]/g, "'")
      .replace(/[^a-z' ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
