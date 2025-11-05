import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { ProgressData } from "../components/irregular/types";

const STORAGE_KEY = "mp_irregular_progress_v1";

interface IrregularProgressContextProps {
  progress: ProgressData;
  markBlockCompleted: (categoryId: string, blockId: number) => void;
  isBlockCompleted: (categoryId: string, blockId: number) => boolean;
  getCategoryProgress: (categoryId: string, totalBlocks: number) => number;
  resetProgress: (categoryId: string) => void;
  resetAllProgress: () => void;
}

const IrregularProgressContext = createContext<
  IrregularProgressContextProps | undefined
>(undefined);

export const IrregularProgressProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [progress, setProgress] = useState<ProgressData>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Завантаження з LocalStorage
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setProgress(parsed);
        }
      } catch (error) {
        console.error("Failed to load irregular progress:", error);
      } finally {
        setIsLoaded(true);
      }
    };
    loadProgress();
  }, []);

  // Збереження в LocalStorage
  useEffect(() => {
    if (!isLoaded) return;
    const saveProgress = async () => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      } catch (error) {
        console.error("Failed to save irregular progress:", error);
      }
    };
    saveProgress();
  }, [progress, isLoaded]);

  const markBlockCompleted = useCallback(
    (categoryId: string, blockId: number) => {
      setProgress((prev) => {
        const categoryData = prev[categoryId] || {
          completedBlocks: [],
          lastStudied: new Date().toISOString(),
        };

        const completedSet = new Set(categoryData.completedBlocks);
        completedSet.add(blockId);

        return {
          ...prev,
          [categoryId]: {
            completedBlocks: Array.from(completedSet),
            lastStudied: new Date().toISOString(),
          },
        };
      });
    },
    []
  );

  const isBlockCompleted = useCallback(
    (categoryId: string, blockId: number): boolean => {
      const categoryData = progress[categoryId];
      if (!categoryData) return false;
      return categoryData.completedBlocks.includes(blockId);
    },
    [progress]
  );

  const getCategoryProgress = useCallback(
    (categoryId: string, totalBlocks: number): number => {
      if (totalBlocks === 0) return 0;
      const categoryData = progress[categoryId];
      if (!categoryData) return 0;
      const completed = categoryData.completedBlocks.length;
      return Math.round((completed / totalBlocks) * 100);
    },
    [progress]
  );

  const resetProgress = useCallback((categoryId: string) => {
    setProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[categoryId];
      return newProgress;
    });
  }, []);

  const resetAllProgress = useCallback(() => {
    setProgress({});
  }, []);

  const value = useMemo(
    () => ({
      progress,
      markBlockCompleted,
      isBlockCompleted,
      getCategoryProgress,
      resetProgress,
      resetAllProgress,
    }),
    [
      progress,
      markBlockCompleted,
      isBlockCompleted,
      getCategoryProgress,
      resetProgress,
      resetAllProgress,
    ]
  );

  return (
    <IrregularProgressContext.Provider value={value}>
      {children}
    </IrregularProgressContext.Provider>
  );
};

export function useIrregularProgress() {
  const ctx = useContext(IrregularProgressContext);
  if (!ctx)
    throw new Error(
      "useIrregularProgress must be used within IrregularProgressProvider"
    );
  return ctx;
}
