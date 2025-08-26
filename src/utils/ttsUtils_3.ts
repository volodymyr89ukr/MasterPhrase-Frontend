// src/utils/ttsUtils.ts
type SpeakOptions = {
  lang?: string; // BCP-47, напр. "de-DE"
  rate?: number; // 0.5–1.2 (краще тримати біля 0.9–1.0 на iOS)
  pitch?: number; // 0–2 (1 = дефолт)
  volume?: number; // 0–1
  voiceName?: string; // примусовий вибір голосу за назвою
  onEnd?: () => void;
  onError?: () => void;
};

/** Визначення платформи (грубо, але достатньо для tts) */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // iPhone/iPad, у т.ч. iPadOS, що прикидається Mac
  const iOSLike =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes("Mac") && "ontouchend" in document);
  return iOSLike;
}

/** Дочекатися, поки браузер реально підвантажить голоси */
function loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    let voices = synth.getVoices();
    if (voices && voices.length > 0) {
      resolve(voices);
      return;
    }
    let resolved = false;

    const handler = () => {
      voices = synth.getVoices();
      if (voices && voices.length > 0 && !resolved) {
        resolved = true;
        synth.removeEventListener("voiceschanged", handler as any);
        resolve(voices);
      }
    };

    synth.addEventListener("voiceschanged", handler as any);

    // страховка на випадок, якщо подія не прийде
    setTimeout(() => {
      if (!resolved) {
        voices = synth.getVoices();
        resolved = true;
        synth.removeEventListener("voiceschanged", handler as any);
        resolve(voices || []);
      }
    }, timeoutMs);
  });
}

/** Вибір найкращого доступного голосу під мову/платформу */
function pickBestVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
  forcedName?: string
): SpeechSynthesisVoice | undefined {
  const langPrefix = lang.toLowerCase().slice(0, 2);

  // Якщо користувач вказав конкретну назву голосу — спробуємо її
  if (forcedName) {
    const exact = voices.find(
      (v) =>
        v.name.toLowerCase() === forcedName.toLowerCase() &&
        v.lang.toLowerCase().startsWith(langPrefix)
    );
    if (exact) return exact;
  }

  // 1) Пошук точного збігу мови (де-де, ен-ҐБ тощо)
  const sameLocale = voices.filter(
    (v) => v.lang.toLowerCase() === lang.toLowerCase()
  );

  // 2) Пошук по префіксу (де-, ен-)
  const sameLang = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(langPrefix)
  );

  // iOS: Спробуємо знайти Siri/Enhanced/преміум-голоси
  if (isIOS()) {
    const prefer = (list: SpeechSynthesisVoice[]) =>
      list.find(
        (v) =>
          /siri|enhanced|premium/i.test(v.name) ||
          /com\.apple\.ttsbundle/i.test((v as any).voiceURI || "")
      ) ||
      // Німецькі якісні: Anna, Marlene, Helena тощо
      list.find((v) => /(anna|marlene|helena|yannick)/i.test(v.name));

    const pick1 = prefer(sameLocale);
    if (pick1) return pick1;

    const pick2 = prefer(sameLang);
    if (pick2) return pick2;
  } else {
    // Chrome/Android: Google-голоси зазвичай якісніші
    const preferGoogle = (list: SpeechSynthesisVoice[]) =>
      list.find((v) => /google/i.test(v.name));
    const pick1 = preferGoogle(sameLocale);
    if (pick1) return pick1;
    const pick2 = preferGoogle(sameLang);
    if (pick2) return pick2;
  }

  // Якщо нічого "преміального" — беремо перший з точним локалем
  if (sameLocale.length > 0) return sameLocale[0];

  // Або перший з тією ж мовою
  if (sameLang.length > 0) return sameLang[0];

  // Фолбек — перший доступний
  return voices[0];
}

/** Невелика затримка — допомагає уникнути «ковтання» першого слова */
function wait(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** iOS warm-up: коротка тиха фраза, щоб «розбудити» синтезатор */
async function primeIOSVoice(
  voice: SpeechSynthesisVoice,
  lang: string
): Promise<void> {
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(".");
    u.lang = lang;
    u.voice = voice;
    u.rate = 1.0;
    u.pitch = 1.0;
    u.volume = 0; // беззвучно
    u.onend = () => resolve();
    u.onerror = () => resolve(); // не блокуємо основне відтворення
    window.speechSynthesis.speak(u);
  });
}

/**
 * Головна функція озвучення.
 * Робить коректний вибір голосу (в т.ч. на iOS), прогріває движок на iOS,
 * і уникає «ковтання» першого слова на Android/Safari.
 */
export async function speakSmart(
  text: string,
  {
    lang = "de-DE",
    rate = 0.95, // трохи вище ніж 0.85 — iOS звучить натуральніше
    pitch = 1.0,
    volume = 1.0,
    voiceName,
    onEnd,
    onError,
  }: SpeakOptions = {}
) {
  try {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      // немає підтримки — «імітуємо» завершення
      if (onEnd) setTimeout(onEnd, 600);
      return;
    }

    const synth = window.speechSynthesis;

    // Скасувати попереднє відтворення і дати синтезатору «видихнути»
    synth.cancel();
    await wait(60);

    // 1) Дочекатися завантаження голосів
    const voices = await loadVoices(2000);

    // 2) Обрати найкращий голос під платформу/мову
    const bestVoice = pickBestVoice(voices, lang, voiceName);

    // 3) iOS warm-up, щоб не ковтало перше слово/не сипів голос
    if (isIOS() && bestVoice) {
      await primeIOSVoice(bestVoice, lang);
      // невелика пауза теж допомагає
      await wait(40);
    }

    // 4) Підготувати основний utterance
    const utter = new SpeechSynthesisUtterance(text.trim());
    utter.lang = lang;
    if (bestVoice) utter.voice = bestVoice;

    // Safari інколи спотворює голоси при дуже низьких/високих значеннях
    utter.rate = Math.min(Math.max(rate, 0.75), 1.15);
    utter.pitch = Math.min(Math.max(pitch, 0.8), 1.2);
    utter.volume = Math.min(Math.max(volume, 0.0), 1.0);

    // Колбеки
    utter.onend = () => {
      onEnd && onEnd();
    };
    utter.onerror = () => {
      onError && onError();
      // на випадок помилки — спроба коротко повторити без кастомного голосу
      try {
        const fallback = new SpeechSynthesisUtterance(text.trim());
        fallback.lang = lang;
        fallback.rate = 1.0;
        fallback.pitch = 1.0;
        fallback.volume = 1.0;
        window.speechSynthesis.speak(fallback);
      } catch {
        /* ignore */
      }
    };

    // 5) Невелика затримка перед стартом допомагає Android/Chrome
    await wait(20);
    synth.speak(utter);
  } catch (e) {
    onError && onError();
    // останній фолбек — «імітація» завершення
    if (onEnd) setTimeout(onEnd, 600);
  }
}
