import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "./types";
import i18n from "./i18n"; // Додаємо імпорт i18n

export interface Language {
  // ← Додаємо export
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
}

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

  // Синхронізуємо зміну мови інтерфейсу з i18next
  useEffect(() => {
    if (interfaceLanguage?.code) {
      i18n.changeLanguage(interfaceLanguage.code);
    }
  }, [interfaceLanguage]);

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
