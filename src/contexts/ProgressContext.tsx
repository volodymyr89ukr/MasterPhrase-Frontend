import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { useSettings } from "./SettingsContext";

const STORAGE_KEY_KNOWN = "mp_known_words_by_lang_v1";

interface ProgressContextProps {
  knownWordIds: number[]; // для поточної learningLanguage.code
  setKnownWordIds: (ids: number[], langCode?: string) => void;
  toggleKnownWord: (id: number, langCode?: string) => void;
  isWordKnown: (id: number, langCode?: string) => boolean;
  knownWordIdsSet: Set<number>; // ✅ O(1) lookup
}

const ProgressContext = createContext<ProgressContextProps | undefined>(
  undefined
);

export const ProgressProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { learningLanguage } = useSettings();

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

  // ✅ Set для O(1) lookup
  const knownWordIdsSet = useMemo(() => new Set(knownWordIds), [knownWordIds]);

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

  const value = useMemo(
    () => ({
      knownWordIds,
      setKnownWordIds,
      toggleKnownWord,
      isWordKnown,
      knownWordIdsSet,
    }),
    [knownWordIds, knownWordIdsSet] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
};

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}
