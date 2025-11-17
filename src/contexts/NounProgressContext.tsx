import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { NounProgressData } from "../components/irregular/types";

const STORAGE_KEY = "mp_nouns_progress_v1";

interface NounProgressContextProps {
  progress: NounProgressData;
  markSetCompleted: (supersetId: number, setId: number) => void;
  isSetCompleted: (supersetId: number, setId: number) => boolean;
  getSupersetProgress: (supersetId: number, totalSets: number) => number;
  resetProgress: (supersetId: number) => void;
  resetAllProgress: () => void;
}

const NounProgressContext = createContext<NounProgressContextProps | undefined>(
  undefined
);

export const NounProgressProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [progress, setProgress] = useState<NounProgressData>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadProgress = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setProgress(JSON.parse(saved));
        }
      } catch (error) {
        console.error("Failed to load nouns progress:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadProgress();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      console.error("Failed to save nouns progress:", error);
    }
  }, [progress, isLoaded]);

  const markSetCompleted = useCallback((supersetId: number, setId: number) => {
    setProgress((prev) => {
      const key = String(supersetId);
      const data = prev[key] || {
        completedSets: [],
        lastStudied: new Date().toISOString(),
      };
      const completedSet = new Set(data.completedSets);
      completedSet.add(setId);
      return {
        ...prev,
        [key]: {
          completedSets: Array.from(completedSet),
          lastStudied: new Date().toISOString(),
        },
      };
    });
  }, []);

  const isSetCompleted = useCallback(
    (supersetId: number, setId: number): boolean => {
      const data = progress[String(supersetId)];
      return data ? data.completedSets.includes(setId) : false;
    },
    [progress]
  );

  const getSupersetProgress = useCallback(
    (supersetId: number, totalSets: number): number => {
      if (totalSets === 0) return 0;
      const data = progress[String(supersetId)];
      if (!data) return 0;
      return Math.round((data.completedSets.length / totalSets) * 100);
    },
    [progress]
  );

  const resetProgress = useCallback((supersetId: number) => {
    setProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[String(supersetId)];
      return newProgress;
    });
  }, []);

  const resetAllProgress = useCallback(() => {
    setProgress({});
  }, []);

  const value = useMemo(
    () => ({
      progress,
      markSetCompleted,
      isSetCompleted,
      getSupersetProgress,
      resetProgress,
      resetAllProgress,
    }),
    [
      progress,
      markSetCompleted,
      isSetCompleted,
      getSupersetProgress,
      resetProgress,
      resetAllProgress,
    ]
  );

  return (
    <NounProgressContext.Provider value={value}>
      {children}
    </NounProgressContext.Provider>
  );
};

export function useNounProgress() {
  const ctx = useContext(NounProgressContext);
  if (!ctx)
    throw new Error("useNounProgress must be used within NounProgressProvider");
  return ctx;
}
