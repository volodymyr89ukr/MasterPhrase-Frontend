// src/utils/ttsUtils.ts
// ======================
// Публічний API:
//   - preloadTTS(lang?: string): Promise<boolean>  (тихий preload без озвучення)
//   - initTTS(lang?: string): Promise<boolean>     (warm-up після першої взаємодії користувача)
//   - speakSmart(text: string, opts?: SpeakOptions): void
//   - cancelSpeak(): void
//   - getBestVoice(lang: string, voiceName?: string): Promise<SpeechSynthesisVoice | undefined>
//
// Стратегія:
//   1. На старті застосунку (без кліку) викликаємо preloadTTS для мов (learning + interface).
//   2. На першій взаємодії користувача — initTTS(currentLearningLang).
//   3. Для iOS: віддаємо пріоритет Siri/Enhanced/Premium, уникаємо Compact-варіантів.
//   4. В рідері (і в інших компонентах) використовуйте getBestVoice/speakSmart.
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

let warmedUpLangs = new Set<string>();
let preloadedLangs = new Set<string>();
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

// Переваги по іменах для iOS (за спаданням пріоритету)
const IOS_PREF_MAP: Record<string, RegExp[]> = {
  de: [/siri/i, /anna/i, /yannick/i, /helena/i],
  en: [/siri/i, /samantha/i, /alex/i, /karen/i, /daniel/i],
  es: [/siri/i, /monica/i, /jorge/i],
  fr: [/siri/i, /thomas/i, /am[eé]lie/i, /aur[eé]lie/i],
  it: [/siri/i, /alice/i, /luca/i],
  pt: [/siri/i, /joana/i, /luciana/i],
  ru: [/siri/i, /milena/i],
  pl: [/siri/i, /ewa/i, /zosia/i, /ania/i],
  tr: [/siri/i, /y[iı]ld[iı]z/i, /cem/i],
  uk: [/siri/i, /lesia/i, /mykola/i],
  ar: [/siri/i, /tarik/i, /maged/i],
};

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

function scoreIosVoice(v: SpeechSynthesisVoice, lang: string): number {
  const langLower = lang.toLowerCase();
  const prefix = langLower.slice(0, 2);
  const vLang = (v.lang || "").toLowerCase();
  const uri = String((v as any).voiceURI || "");
  const name = (v.name || "").toLowerCase();

  let s = 0;
  if (vLang === langLower) s += 40;
  else if (vLang.startsWith(prefix)) s += 25;

  if (/siri/i.test(name) || /siri/i.test(uri)) s += 45;
  if (/(enhanced|premium)/i.test(name) || /(enhanced|premium)/i.test(uri))
    s += 25;
  if (/compact/i.test(name) || /compact/i.test(uri)) s -= 30;

  const prefs = IOS_PREF_MAP[prefix] || [];
  const idx = prefs.findIndex((rx) => rx.test(name));
  if (idx >= 0) s += Math.max(0, 35 - idx * 5);

  // невеликий бонус за чоловічий/жіночий варіант у відповідності до Siri (не критично)
  if (/female/i.test(name) || /fem/i.test(uri)) s += 2;
  if (/male/i.test(name) || /masc/i.test(uri)) s += 1;

  return s;
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

  const sameLocale = voices.filter((v) => v.lang?.toLowerCase() === langLower);
  const sameLang = voices.filter((v) =>
    v.lang?.toLowerCase().startsWith(prefix)
  );
  const candidates = sameLocale.length
    ? sameLocale
    : sameLang.length
    ? sameLang
    : voices;

  if (isIOS()) {
    // На iOS використовуємо скоринг із пріоритетом Siri/Enhanced/Premium, уникаємо Compact
    let best: SpeechSynthesisVoice | undefined;
    let bestScore = -1e9;
    for (const v of candidates) {
      const s = scoreIosVoice(v, lang);
      if (s > bestScore) {
        bestScore = s;
        best = v;
      }
    }
    if (best) return best;
  } else {
    // Chrome/Android: надаємо перевагу Google voices
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

    const voices = await loadVoices(2200);
    const best = pickBestVoice(voices, lang);

    if (isIOS()) {
      await primeIOS(best, lang);
      await wait(50);
    } else {
      const dummy = new SpeechSynthesisUtterance(".");
      dummy.lang = lang;
      if (best) dummy.voice = best;
      dummy.volume = 0;
      window.speechSynthesis.speak(dummy);
      await wait(35);
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

/** Надати найкращий голос для мови (з урахуванням платформи та кешу) */
export async function getBestVoice(
  lang: string,
  voiceName?: string
): Promise<SpeechSynthesisVoice | undefined> {
  if (typeof window === "undefined" || !("speechSynthesis" in window))
    return undefined;
  const voices = loadedOnce ? safeGetVoices() : await loadVoices(1500);
  return pickBestVoice(voices, lang, voiceName);
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
  opts: SpeakOptions = {}
): Promise<void> {
  let {
    lang = DEFAULT_LANG,
    rate,
    pitch,
    volume,
    voiceName,
    onEnd,
    onError,
  } = opts;

  // Платформо-залежні дефолти (лише якщо не задано користувачем)
  if (rate == null) rate = isIOS() ? 0.95 : 0.85;
  if (pitch == null) pitch = 1.0;
  if (volume == null) volume = 0.95;

  const langLower = lang.toLowerCase();

  // Якщо warm-up ще не робився — для не-iOS можемо виконати inline
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
  utter.rate = Math.min(Math.max(rate, 0.75), 1.1);
  utter.pitch = Math.min(Math.max(pitch, 0.85), 1.2);
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

  await wait(10);
  window.speechSynthesis.speak(utter);
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

/** Примусове warm-up (наприклад після зміни мови навчання) */
export async function ensureWarm(lang: string): Promise<void> {
  if (!isLangWarmed(lang)) {
    await initTTS(lang);
  }
}
