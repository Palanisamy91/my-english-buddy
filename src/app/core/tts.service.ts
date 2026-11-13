
import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

@Injectable({
  providedIn: 'root'
})
export class TtsService {

  private speaking = false;

  async speak(text: string): Promise<void> {

    if (!text || !text.trim()) {
      return;
    }

    try {
      await this.stop();

      if (Capacitor.isNativePlatform()) {

        this.speaking = true;

        await TextToSpeech.speak({
          text: text.trim(),
          lang: 'en-IN',
          rate: 0.9,
          pitch: 1.1,
          volume: 1.0,
          queueStrategy: 0
        });

        this.speaking = false;

      } else if ('speechSynthesis' in window) {

        const utterance = new SpeechSynthesisUtterance(text);

        utterance.lang = 'en-IN';
        utterance.rate = 0.9;
        utterance.pitch = 1.1;
        utterance.volume = 1;

        window.speechSynthesis.speak(utterance);
      }

    } catch (error) {
      this.speaking = false;
      console.error('Leela TTS error:', error);
    }
  }

  async stop(): Promise<void> {

    try {
      if (Capacitor.isNativePlatform()) {
        await TextToSpeech.stop();
      } else if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }

      this.speaking = false;

    } catch (error) {
      console.error('TTS stop error:', error);
    }
  }
}
 