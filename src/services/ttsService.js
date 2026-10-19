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
   * Local system voices (`localService === true`) are strongly preferred because
   * remote/Google network voices in Chrome often ignore `utterance.rate`!
   */
  findBestWebVoice(lang = 'nl-NL') {
    if (!this.voices || this.voices.length === 0) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        this.voices = window.speechSynthesis.getVoices();
      }
    }
    const normalized = lang.toLowerCase();
    const prefix = normalized.split('-')[0];

    // 1. Exact locale match + localService (honors rate change)
    const exactLocal = this.voices.find(
      (v) => v.lang.toLowerCase().replace('_', '-') === normalized && v.localService
    );
    if (exactLocal) return exactLocal;

    // 2. Any localService voice matching language prefix (e.g. nl-BE or nl_NL on macOS/iOS)
    const prefixLocal = this.voices.find(
      (v) => v.lang.toLowerCase().startsWith(prefix) && v.localService
    );
    if (prefixLocal) return prefixLocal;

    // 3. Exact locale match (network voice)
    const exact = this.voices.find(
      (v) => v.lang.toLowerCase().replace('_', '-') === normalized
    );
    if (exact) return exact;

    // 4. Language prefix match
    return this.voices.find((v) => v.lang.toLowerCase().startsWith(prefix)) || null;
  }

  /**
   * Stops any ongoing speech output immediately.
   */
  async stop() {
    this._cancelSequence = true;
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
   * Helper to speak a single Web Speech utterance as a Promise.
   */
  speakSingleWebUtterance(text, { lang, effectiveRate, voice }) {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = lang;
      }
      utterance.rate = effectiveRate;
      utterance.pitch = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = (event) => {
        if (event.error === 'interrupted' || event.error === 'canceled') {
          resolve();
        } else {
          reject(event);
        }
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  /**
   * Speaks text in the specified language and speed (e.g. 1.0 normal, 0.75 slow).
   * Note: On Web Speech API, 0.75 is often imperceptibly close to 1.0 on macOS/iOS voices,
   * and Chrome's network voices (`localService: false`) ignore `rate` completely.
   * We map slow mode (< 1.0) to 0.55 for a distinctly slower articulation, and if the only
   * available voice is a remote network voice, we also add brief pauses between word groups.
   * @param {string} text - Text to speak
   * @param {object} options - { lang: 'nl-NL', rate: 1.0, sentenceId: null }
   */
  async speak(text, { lang = 'nl-NL', rate = 1.0, sentenceId = null } = {}) {
    if (!text) return;

    await this.stop();
    this._cancelSequence = false;
    this.notify({ isPlaying: true, sentenceId, rate, lang });

    const isSlowMode = rate < 1.0;
    const effectiveRate = isSlowMode ? 0.55 : rate;

    try {
      if (this.isNative) {
        await TextToSpeech.speak({
          text,
          lang,
          rate: isSlowMode ? 0.65 : rate,
          pitch: 1.0,
          volume: 1.0,
          category: 'ambient'
        });
        this.notify({ isPlaying: false, sentenceId: null, rate: 1.0, lang: null });
      } else if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        // Give Chrome/Safari a brief 40ms tick after .cancel() so the new rate isn't dropped
        await new Promise((r) => setTimeout(r, 40));
        if (this._cancelSequence) return;

        const matchedVoice = this.findBestWebVoice(lang);

        // If slow mode is requested AND the browser only has a remote network voice
        // (which ignores utterance.rate in Chrome), speak in small 2-word chunks with pauses
        if (isSlowMode && matchedVoice && matchedVoice.localService === false) {
          const words = text.trim().split(/\s+/);
          const chunks = [];
          for (let i = 0; i < words.length; i += 2) {
            chunks.push(words.slice(i, i + 2).join(' '));
          }

          for (const chunk of chunks) {
            if (this._cancelSequence) break;
            await this.speakSingleWebUtterance(chunk, {
              lang,
              effectiveRate,
              voice: matchedVoice
            });
            if (this._cancelSequence) break;
            await new Promise((r) => setTimeout(r, 220));
          }
        } else {
          await this.speakSingleWebUtterance(text, {
            lang,
            effectiveRate,
            voice: matchedVoice
          });
        }

        if (!this._cancelSequence) {
          this.notify({ isPlaying: false, sentenceId: null, rate: 1.0, lang: null });
        }
      }
    } catch (err) {
      console.warn('TTS playback error:', err);
      this.notify({ isPlaying: false, sentenceId: null, rate: 1.0, lang: null });
    }
  }
}

export const ttsService = new TTSService();
