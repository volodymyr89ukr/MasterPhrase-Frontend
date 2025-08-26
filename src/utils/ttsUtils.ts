// src/utils/ttsUtils.ts
// ======================
// Публічний API:
//   - preloadTTS(lang?: string): Promise<boolean>  (тихий preload без озвучення)
//   - initTTS(lang?: string): Promise<boolean>     (warm-up після першої взаємодії користувача)
//   - speakSmart(text: string, opts?: SpeakOptions): void
//   - cancelSpeak(): void
//
// Стратегія:
//   1. На старті застосунку (без кліку) викликаємо preloadTTS для мов (learning + interface) — це підвантажує та кешує голоси без звуку.
//   2. При першій взаємодії користувача (pointerdown / keydown / touchstart) викликаємо initTTS(currentLearningLang).
//   3. Надалі speakSmart працює без затримок і без «ковтання» першого слова (особливо на iOS).
//
// Особливості:
//   • iOS: warm-up лише після взаємодії; preload не програє звук (не блокується).
//   • Кеш голосу з TTL (30 днів), валідація при кожному запуску.
//   • cancelSpeak() інвалідовує попередні колбеки (race-safe).
//   • Без дублюючих програвань; кожен новий speak повністю замінює попередній.
//   • Швидка повторна озвучка (мінімальні очікування).
//
// Backward-compatible: існуючі виклики speakSmart() не треба міняти.

type SpeakOptions = {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceName?: string;
  onEnd?: () => void;
  onError?: () => void;
};

const DEFAULT_LANG = "de-DE";
const LS_KEY_PREFIX = "mp_tts_voice_";
const LS_TTL_MS = 30 * 24 * 60 * 60 * 1000;

let warmedUpLangs = new Set<string>(); // Мови з виконаним warm-up
let preloadedLangs = new Set<string>(); // Мови, де робили preload
let currentUtterance: SpeechSynthesisUtterance | null = null;
let currentPlayId = 0;
let loadedOnce = false;

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const iOSLike =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Mac") &&
      typeof document !== "undefined" &&
      "ontouchend" in document);
  return iOSLike;
}

function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function safeGetVoices(): SpeechSynthesisVoice[] {
  try {
    return window.speechSynthesis.getVoices() || [];
  } catch {
    return [];
  }
}

function onVoicesChangedOnce(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const handler = () => {
      synth.removeEventListener("voiceschanged", handler as any);
      resolve(safeGetVoices());
    };
    synth.addEventListener("voiceschanged", handler as any);
  });
}

async function loadVoices(timeoutMs = 2000): Promise<SpeechSynthesisVoice[]> {
  let voices = safeGetVoices();
  if (voices.length > 0) {
    loadedOnce = true;
    return voices;
  }
  const race = Promise.race([
    onVoicesChangedOnce(),
    (async () => {
      await wait(timeoutMs);
      return safeGetVoices();
    })(),
  ]);
  voices = await race;
  loadedOnce = voices.length > 0;
  return voices;
}

type CachedVoice = {
  name: string;
  voiceURI?: string;
  lang: string;
  ts: number;
};

function getCacheKey(lang: string) {
  return LS_KEY_PREFIX + lang.toLowerCase();
}

function readCachedVoice(lang: string): CachedVoice | null {
  try {
    const raw = localStorage.getItem(getCacheKey(lang));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedVoice;
    if (!parsed || !parsed.name || !parsed.lang || !parsed.ts) return null;
    if (Date.now() - parsed.ts > LS_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedVoice(v: CachedVoice) {
  try {
    localStorage.setItem(getCacheKey(v.lang), JSON.stringify(v));
  } catch {
    // ignore
  }
}

function validateCachedVoice(
  voices: SpeechSynthesisVoice[],
  cache: CachedVoice
): SpeechSynthesisVoice | null {
  if (cache.voiceURI) {
    const byUri = voices.find((v) => (v as any).voiceURI === cache.voiceURI);
    if (byUri) return byUri;
  }
  const byNameLang = voices.find(
    (v) =>
      v.name.toLowerCase() === cache.name.toLowerCase() &&
      v.lang.toLowerCase() === cache.lang.toLowerCase()
  );
  return byNameLang || null;
}

function pickBestVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
  forcedName?: string
): SpeechSynthesisVoice | undefined {
  if (!voices.length) return;
  const langLower = lang.toLowerCase();
  const prefix = langLower.slice(0, 2);

  // Cache first
  const cached = readCachedVoice(lang);
  if (cached) {
    const valid = validateCachedVoice(voices, cached);
    if (valid) return valid;
  }

  // Forced
  if (forcedName) {
    const exact = voices.find(
      (v) =>
        v.name.toLowerCase() === forcedName.toLowerCase() &&
        v.lang.toLowerCase().startsWith(prefix)
    );
    if (exact) return exact;
  }

  const sameLocale = voices.filter((v) => v.lang.toLowerCase() === langLower);
  const sameLang = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(prefix)
  );

  if (isIOS()) {
    const prefer = (list: SpeechSynthesisVoice[]) =>
      list.find(
        (v) =>
          /siri|enhanced|premium/i.test(v.name) ||
          /com\.apple\.ttsbundle/i.test((v as any).voiceURI || "")
      ) || list.find((v) => /(anna|marlene|helena|yannick)/i.test(v.name));
    const p1 = prefer(sameLocale);
    if (p1) return p1;
    const p2 = prefer(sameLang);
    if (p2) return p2;
  } else {
    const preferGoogle = (list: SpeechSynthesisVoice[]) =>
      list.find((v) => /google/i.test(v.name));
    const g1 = preferGoogle(sameLocale);
    if (g1) return g1;
    const g2 = preferGoogle(sameLang);
    if (g2) return g2;
  }

  if (sameLocale.length) return sameLocale[0];
  if (sameLang.length) return sameLang[0];
  return voices[0];
}

/** Тихий iOS warm-up */
async function primeIOS(
  voice: SpeechSynthesisVoice | undefined,
  lang: string
): Promise<void> {
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(".");
    u.lang = lang;
    if (voice) u.voice = voice;
    u.rate = 1;
    u.pitch = 1;
    u.volume = 0;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

/** Тихий preload (без фактичного програвання контенту) */
export async function preloadTTS(
  lang: string = DEFAULT_LANG
): Promise<boolean> {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window))
      return false;
    if (preloadedLangs.has(lang.toLowerCase())) return true;
    const voices = await loadVoices(2000);
    const best = pickBestVoice(voices, lang);
    if (best) {
      writeCachedVoice({
        name: best.name,
        voiceURI: (best as any).voiceURI,
        lang,
        ts: Date.now(),
      });
    }
    preloadedLangs.add(lang.toLowerCase());
    return true;
  } catch {
    return false;
  }
}

/** Warm-up (звукова ініціалізація) — викликаємо тільки після першої взаємодії користувача */
export async function initTTS(lang: string = DEFAULT_LANG): Promise<boolean> {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window))
      return false;
    const langLower = lang.toLowerCase();
    if (warmedUpLangs.has(langLower)) return true;

    const voices = await loadVoices(2000);
    const best = pickBestVoice(voices, lang);

    if (isIOS()) {
      await primeIOS(best, lang);
      await wait(40);
    } else {
      // Легкий "mute" прогін, щоб уникнути першого пропуску (Chrome інколи)
      const dummy = new SpeechSynthesisUtterance(".");
      dummy.lang = lang;
      if (best) dummy.voice = best;
      dummy.volume = 0;
      window.speechSynthesis.speak(dummy);
      await wait(30);
    }

    if (best) {
      writeCachedVoice({
        name: best.name,
        voiceURI: (best as any).voiceURI,
        lang,
        ts: Date.now(),
      });
    }

    warmedUpLangs.add(langLower);
    return true;
  } catch {
    return false;
  }
}

/** Скасування/зупинка поточного відтворення */
export function cancelSpeak() {
  try {
    currentPlayId++;
    if (currentUtterance) {
      currentUtterance.onend = null;
      currentUtterance.onerror = null;
      currentUtterance = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // ignore
  }
}

async function speakInternal(
  text: string,
  {
    lang = DEFAULT_LANG,
    rate = 0.85,
    pitch = 1.0,
    volume = 0.95,
    voiceName,
    onEnd,
    onError,
  }: SpeakOptions = {}
): Promise<void> {
  const langLower = lang.toLowerCase();

  // Якщо warm-up ще не робився — для не-iOS можемо спробувати preload→warm-up inline
  if (!warmedUpLangs.has(langLower) && !isIOS()) {
    await preloadTTS(lang);
    await initTTS(lang);
  }

  cancelSpeak();
  await wait(40);

  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd && setTimeout(onEnd, 10);
    return;
  }

  const synth = window.speechSynthesis;
  const voices = loadedOnce ? safeGetVoices() : await loadVoices(1200);
  const best = pickBestVoice(voices, lang, voiceName);

  // iOS fallback warm-up (якщо не був)
  if (isIOS() && !warmedUpLangs.has(langLower)) {
    await primeIOS(best, lang);
    warmedUpLangs.add(langLower);
    await wait(30);
  }

  const utter = new SpeechSynthesisUtterance(text.trim());
  utter.lang = lang;
  if (best) utter.voice = best;
  utter.rate = Math.min(Math.max(rate, 0.7), 1.2);
  utter.pitch = Math.min(Math.max(pitch, 0.7), 1.3);
  utter.volume = Math.min(Math.max(volume, 0), 1);

  if (best) {
    writeCachedVoice({
      name: best.name,
      voiceURI: (best as any).voiceURI,
      lang,
      ts: Date.now(),
    });
  }

  const myId = ++currentPlayId;
  currentUtterance = utter;

  utter.onend = () => {
    if (myId !== currentPlayId) return;
    currentUtterance = null;
    onEnd && onEnd();
  };
  utter.onerror = () => {
    if (myId !== currentPlayId) return;
    currentUtterance = null;
    onError && onError();
  };

  // Невелика пауза для стабільності Chrome/Android
  await wait(10);
  synth.speak(utter);
}

/** Публічна функція озвучення */
export function speakSmart(text: string, opts?: SpeakOptions): void {
  if (!text || !text.trim()) return;
  void speakInternal(text, opts);
}

/** Допоміжне: чи warmed */
export function isLangWarmed(lang?: string): boolean {
  if (!lang) return false;
  return warmedUpLangs.has(lang.toLowerCase());
}

/** Примусове гарантоване warm-up (наприклад після зміни мови навчання) */
export async function ensureWarm(lang: string): Promise<void> {
  if (!isLangWarmed(lang)) {
    await initTTS(lang);
  }
}
