import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { User } from "./types";
import i18n from "./i18n";
import { preloadTTS } from "./utils/ttsUtils";

export interface Language {
  id: number;
  code: string;
  name: string;
}

interface TTSSettings {
  readingRate: number;
  pauseBase: number;
}

interface AppContextProps {
  user: User | null;
  setUser: (u: User | null) => void;
  interfaceLanguage: Language | null;
  setInterfaceLanguage: (l: Language | null) => void;
  learningLanguage: Language | null;
  setLearningLanguage: (l: Language | null) => void;
  ttsSettings: TTSSettings;
  setTtsSettings: (s: TTSSettings) => void;

  // Відомі слова, скоуплені по мові навчання
  knownWordIds: number[]; // для поточної learningLanguage.code
  setKnownWordIds: (ids: number[], langCode?: string) => void;
  toggleKnownWord: (id: number, langCode?: string) => void;
  isWordKnown: (id: number, langCode?: string) => boolean;
}

const STORAGE_KEY_KNOWN = "mp_known_words_by_lang_v1";

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [interfaceLanguage, setInterfaceLanguage] = useState<Language | null>(
    null
  );
  const [learningLanguage, setLearningLanguage] = useState<Language | null>(
    null
  );
  const [ttsSettings, setTtsSettings] = useState<TTSSettings>({
    readingRate: 0.85,
    pauseBase: 1,
  });

  // Стан відомих слів: Record<langCodeLower, number[]>
  const [knownWordIdsByLang, setKnownWordIdsByLang] = useState<
    Record<string, number[]>
  >(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_KNOWN);
      const parsed = raw ? JSON.parse(raw) : {};
      if (parsed && typeof parsed === "object") return parsed;
      return {};
    } catch {
      return {};
    }
  });

  // Синхронізуємо зміну мови інтерфейсу з i18next
  useEffect(() => {
    if (interfaceLanguage?.code) {
      i18n.changeLanguage(interfaceLanguage.code);
    }
  }, [interfaceLanguage]);

  // Тихий preload TTS для навчальної мови при зміні
  useEffect(() => {
    if (learningLanguage?.code) {
      preloadTTS(learningLanguage.code);
    }
  }, [learningLanguage]);

  // Зберігаємо knownWordIdsByLang у localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_KNOWN,
        JSON.stringify(knownWordIdsByLang)
      );
    } catch {
      // ignore
    }
  }, [knownWordIdsByLang]);

  const currentLang = (learningLanguage?.code || "").toLowerCase();

  const knownWordIds = useMemo(() => {
    return currentLang ? knownWordIdsByLang[currentLang] || [] : [];
  }, [knownWordIdsByLang, currentLang]);

  const setKnownWordIds = (ids: number[], langCode?: string) => {
    const lang = (langCode || currentLang || "").toLowerCase();
    if (!lang) return;
    const sanitized = Array.from(
      new Set(ids.filter((x) => Number.isFinite(x)))
    );
    setKnownWordIdsByLang((prev) => ({ ...prev, [lang]: sanitized }));
  };

  const toggleKnownWord = (id: number, langCode?: string) => {
    const lang = (langCode || currentLang || "").toLowerCase();
    if (!lang || !Number.isFinite(id)) return;
    setKnownWordIdsByLang((prev) => {
      const lane = prev[lang] || [];
      const next = lane.includes(id)
        ? lane.filter((x) => x !== id)
        : [...lane, id];
      return { ...prev, [lang]: next };
    });
  };

  const isWordKnown = (id: number, langCode?: string) => {
    const lang = (langCode || currentLang || "").toLowerCase();
    if (!lang || !Number.isFinite(id)) return false;
    const arr = knownWordIdsByLang[lang] || [];
    return arr.includes(id);
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        interfaceLanguage,
        setInterfaceLanguage,
        learningLanguage,
        setLearningLanguage,
        ttsSettings,
        setTtsSettings,
        knownWordIds,
        setKnownWordIds,
        toggleKnownWord,
        isWordKnown,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
