import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import i18n from "../i18n";
import { preloadTTS } from "../utils/ttsUtils";

export interface Language {
  id: number;
  code: string;
  name: string;
}

interface TTSSettings {
  readingRate: number;
  pauseBase: number;
}

interface SettingsContextProps {
  interfaceLanguage: Language | null;
  setInterfaceLanguage: (l: Language | null) => void;
  learningLanguage: Language | null;
  setLearningLanguage: (l: Language | null) => void;
  ttsSettings: TTSSettings;
  setTtsSettings: (s: TTSSettings) => void;
  poolSize: number;
  setPoolSize: (size: number) => void;
}

const SettingsContext = createContext<SettingsContextProps | undefined>(
  undefined
);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
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

  // Кількість фраз для переходу між блоками (default: 4)
  const [poolSize, setPoolSize] = useState<number>(() => {
    try {
      const raw = localStorage.getItem("mp_pool_size");
      const val = raw ? parseInt(raw, 10) : 4;
      return val >= 3 && val <= 6 ? val : 4;
    } catch {
      return 4;
    }
  });

  // Синхронізація мови інтерфейсу з i18next
  useEffect(() => {
    if (interfaceLanguage?.code) {
      i18n.changeLanguage(interfaceLanguage.code);
    }
  }, [interfaceLanguage]);

  // Preload TTS для навчальної мови
  useEffect(() => {
    if (learningLanguage?.code) {
      preloadTTS(learningLanguage.code);
    }
  }, [learningLanguage]);

  // Зберігати poolSize в localStorage
  useEffect(() => {
    try {
      localStorage.setItem("mp_pool_size", String(poolSize));
    } catch {
      // ignore
    }
  }, [poolSize]);

  const value = useMemo(
    () => ({
      interfaceLanguage,
      setInterfaceLanguage,
      learningLanguage,
      setLearningLanguage,
      ttsSettings,
      setTtsSettings,
      poolSize,
      setPoolSize,
    }),
    [interfaceLanguage, learningLanguage, ttsSettings, poolSize]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
