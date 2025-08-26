// src/utils/ttsUtils.ts
// ======================
// Публічний API:
//   - initTTS(lang?: string): Promise<boolean>
//   - speakSmart(text: string, opts?: { lang?: string; rate?: number; pitch?: number; volume?: number; voiceName?: string; onEnd?: () => void; onError?: () => void }): void
//   - cancelSpeak(): void
//
// Особливості:
//   • Явний pre-warm через initTTS() (рекомендовано викликати ОДИН раз після кліку "Увімкнути озвучення")
//   • Кешування обраного голосу в localStorage (з валідацією)
//   • Коректна робота з iOS (warm-up), Android/Chrome (Google-voices), уникнення "ковтання" першого слова
//   • Гарантія: новий speak зупиняє попередній; ніяких дубльованих програвань
//   • Зворотна сумісність зі старими викликами (параметри lang/rate/onEnd/onError ті самі)

type SpeakOptions = {
  lang?: string; // BCP-47, напр. "de-DE"
  rate?: number; // 0.5–1.2 (оптимально ~0.9–1.0 для iOS)
  pitch?: number; // 0–2 (1 = дефолт)
  volume?: number; // 0–1
  voiceName?: string; // форсувати голос за назвою
  onEnd?: () => void;
  onError?: () => void;
};

const DEFAULT_LANG = "de-DE";
const LS_KEY_PREFIX = "mp_tts_voice_";
const LS_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 днів

let warmedUpLangs = new Set<string>();
let currentUtterance: SpeechSynthesisUtterance | null = null;
let currentPlayId = 0; // маркер поточного відтворення (щоб не спрацьовували старі колбеки)
let loadedOnce = false; // чи вже підвантажували голоси хоча б раз

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPhone/iPad, включно з iPadOS, що інколи репортує себе як Mac
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

/** Дочекатися, поки браузер реально підвантажить голоси */
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
    // ignore (Safari private mode etc.)
  }
}

function validateCachedVoice(
  voices: SpeechSynthesisVoice[],
  cache: CachedVoice
): SpeechSynthesisVoice | null {
  // Спочатку за voiceURI (більш стабільний), потім за (name+lang)
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

/** Вибір найкращого доступного голосу під мову/платформу, з урахуванням кешу та форсованої назви */
function pickBestVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
  forcedName?: string
): SpeechSynthesisVoice | undefined {
  const langLower = lang.toLowerCase();
  const langPrefix = langLower.slice(0, 2);

  // 0) Кеш
  const cached = readCachedVoice(lang);
  if (cached) {
    const valid = validateCachedVoice(voices, cached);
    if (valid) return valid;
  }

  // 1) Форсована назва
  if (forcedName) {
    const exact = voices.find(
      (v) =>
        v.name.toLowerCase() === forcedName.toLowerCase() &&
        v.lang.toLowerCase().startsWith(langPrefix)
    );
    if (exact) return exact;
  }

  const sameLocale = voices.filter((v) => v.lang.toLowerCase() === langLower);
  const sameLang = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(langPrefix)
  );

  if (isIOS()) {
    // iOS: шукати Siri/Enhanced/преміальні
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
    // Chrome/Android: Google-voices зазвичай найкращі
    const preferGoogle = (list: SpeechSynthesisVoice[]) =>
      list.find((v) => /google/i.test(v.name));
    const g1 = preferGoogle(sameLocale);
    if (g1) return g1;
    const g2 = preferGoogle(sameLang);
    if (g2) return g2;
  }

  // Далі — перший з точним локалем, або з тим самим префіксом
  if (sameLocale.length > 0) return sameLocale[0];
  if (sameLang.length > 0) return sameLang[0];

  return voices[0];
}

/** iOS warm-up: коротка тиха фраза, щоб "розбудити" синтезатор */
async function primeIOS(
  voice: SpeechSynthesisVoice | undefined,
  lang: string
): Promise<void> {
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(".");
    u.lang = lang;
    if (voice) u.voice = voice;
    u.rate = 1.0;
    u.pitch = 1.0;
    u.volume = 0; // беззвучно
    u.onend = () => resolve();
    u.onerror = () => resolve(); // не блокуємо
    window.speechSynthesis.speak(u);
  });
}

/** Явний pre-warm: викликається ОДИН раз після кліку користувача */
export async function initTTS(lang: string = DEFAULT_LANG): Promise<boolean> {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window))
      return false;

    // дочекатися голосів
    const voices = await loadVoices(2000);
    const best = pickBestVoice(voices, lang);

    // iOS warm-up
    if (isIOS()) {
      await primeIOS(best, lang);
      await wait(40);
    }

    // закешувати, якщо зрозумілий голос
    if (best) {
      writeCachedVoice({
        name: best.name,
        voiceURI: (best as any).voiceURI,
        lang,
        ts: Date.now(),
      });
    }

    warmedUpLangs.add(lang.toLowerCase());
    return true;
  } catch {
    return false;
  }
}

/** Зовнішня зупинка (можеш викликати сам у будь-який момент) */
export function cancelSpeak() {
  try {
    currentPlayId++; // інвалідовуємо колбеки попереднього відтворення
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
    rate = 0.95,
    pitch = 1.0,
    volume = 1.0,
    voiceName,
    onEnd,
    onError,
  }: SpeakOptions = {}
): Promise<void> {
  const langLower = lang.toLowerCase();

  // Зупинити все попереднє і "дати видихнути"
  cancelSpeak();
  await wait(60);

  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    if (onEnd) setTimeout(onEnd, 600);
    return;
  }

  const synth = window.speechSynthesis;

  // Завантажити голоси (якщо ще ні)
  const voices = loadedOnce ? safeGetVoices() : await loadVoices(2000);

  // Вибрати найкращий голос (з урахуванням кешу/форсу)
  const best = pickBestVoice(voices, lang, voiceName);

  // Якщо ініціалізації не було — зробимо легкий warm-up на iOS,
  // але лише один раз (щоб не "подвійно" програвати)
  if (isIOS() && !warmedUpLangs.has(langLower)) {
    await primeIOS(best, lang);
    warmedUpLangs.add(langLower);
    await wait(40);
  }

  // Підготувати utterance
  const utter = new SpeechSynthesisUtterance(text.trim());
  utter.lang = lang;
  if (best) utter.voice = best;

  // Обережні межі — Safari інколи спотворює на екстремальних значеннях
  utter.rate = Math.min(Math.max(rate, 0.75), 1.15);
  utter.pitch = Math.min(Math.max(pitch, 0.8), 1.2);
  utter.volume = Math.min(Math.max(volume, 0.0), 1.0);

  // Зберегти вибраний голос у кеш (актуалізація)
  if (best) {
    writeCachedVoice({
      name: best.name,
      voiceURI: (best as any).voiceURI,
      lang,
      ts: Date.now(),
    });
  }

  // Конкурентність: маркер відтворення
  const myId = ++currentPlayId;
  currentUtterance = utter;

  // Колбеки — спрацьовують ТІЛЬКИ якщо це найновіше відтворення
  utter.onend = () => {
    if (myId !== currentPlayId) return; // застарілий колбек
    currentUtterance = null;
    onEnd && onEnd();
  };
  utter.onerror = () => {
    if (myId !== currentPlayId) return; // застарілий колбек
    currentUtterance = null;
    onError && onError();
    // ВАЖЛИВО: не викликаємо жодних "fallback speak" тут,
    // щоб не спричиняти дубльовані програвання.
  };

  // Коротка затримка перед стартом — допомагає Android/Chrome
  await wait(20);

  // Остаточний старт (додатковий cancel НЕ робимо, щоб уникати race)
  synth.speak(utter);
}

/** Публічна функція: повертає void (для сумісності зі старим кодом) */
export function speakSmart(text: string, opts?: SpeakOptions): void {
  void speakInternal(text, opts);
}
