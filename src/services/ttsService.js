import { Capacitor } from '@capacitor/core';
import { TextToSpeech } from '@capacitor-community/text-to-speech';

class TTSService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.voices = [];
    this.listeners = new Set();
    this.activeState = {
      isPlaying: false,
      sentenceId: null,
      rate: 1.0,
      lang: null
    };

    if (!this.isNative && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        this.voices = window.speechSynthesis.getVoices();
      };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.activeState);
    return () => this.listeners.delete(listener);
  }

  notify(newState) {
    this.activeState = { ...this.activeState, ...newState };
    this.listeners.forEach((fn) => fn(this.activeState));
  }

  /**
   * Finds the best matching voice for a given BCP-47 locale in Web Speech API.
   */
  findBestWebVoice(lang = 'nl-NL') {
    if (!this.voices || this.voices.length === 0) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        this.voices = window.speechSynthesis.getVoices();
      }
    }
    const normalized = lang.toLowerCase();
    const prefix = normalized.split('-')[0];

    // 1. Exact locale match + localService preferred
    const exactLocal = this.voices.find(
      (v) => v.lang.toLowerCase().replace('_', '-') === normalized && v.localService
    );
    if (exactLocal) return exactLocal;

    // 2. Exact locale match
    const exact = this.voices.find(
      (v) => v.lang.toLowerCase().replace('_', '-') === normalized
    );
    if (exact) return exact;

    // 3. Language prefix match (e.g., 'nl')
    return this.voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) || null;
  }

  /**
   * Stops any ongoing speech output immediately.
   */
  async stop() {
    try {
      if (this.isNative) {
        await TextToSpeech.stop();
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // Ignore errors when stopping idle speech
    } finally {
      this.notify({ isPlaying: false, sentenceId: null, rate: 1.0, lang: null });
    }
  }

  /**
   * Speaks text in the specified language and speed (e.g. 1.0 normal, 0.75 slow).
   * @param {string} text - Text to speak
   * @param {object} options - { lang: 'nl-NL', rate: 1.0, sentenceId: null }
   */
  async speak(text, { lang = 'nl-NL', rate = 1.0, sentenceId = null } = {}) {
    if (!text) return;

    await this.stop();
    this.notify({ isPlaying: true, sentenceId, rate, lang });

    try {
      if (this.isNative) {
        await TextToSpeech.speak({
          text,
          lang,
          rate,
          pitch: 1.0,
          volume: 1.0,
          category: 'ambient'
        });
        this.notify({ isPlaying: false, sentenceId: null, rate: 1.0, lang: null });
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        await new Promise((resolve, reject) => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = lang;
          utterance.rate = rate;
          utterance.pitch = 1.0;

          const matchedVoice = this.findBestWebVoice(lang);
          if (matchedVoice) {
            utterance.voice = matchedVoice;
          }

          utterance.onend = () => {
            this.notify({ isPlaying: false, sentenceId: null, rate: 1.0, lang: null });
            resolve();
          };

          utterance.onerror = (event) => {
            this.notify({ isPlaying: false, sentenceId: null, rate: 1.0, lang: null });
            if (event.error === 'interrupted' || event.error === 'canceled') {
              resolve();
            } else {
              reject(event);
            }
          };

          window.speechSynthesis.speak(utterance);
        });
      }
    } catch (err) {
      console.warn('TTS playback error:', err);
      this.notify({ isPlaying: false, sentenceId: null, rate: 1.0, lang: null });
    }
  }
}

export const ttsService = new TTSService();
