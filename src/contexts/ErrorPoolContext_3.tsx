import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Phrase } from "../components/ExerciseSwitcher"; // Імпортуємо тип

// Використовуємо Map для O(1) операцій та унікальності
type ErrorPool = Map<number, Phrase>;

interface ErrorPoolContextProps {
  errorPool: ErrorPool;
  addError: (phrase: Phrase) => void;
  removeErrors: (phraseIds: number[]) => void;
  clearErrors: () => void;
  getErrorArray: () => Phrase[];
  injectErrors: (
    data: Phrase[],
    count: number
  ) => Promise<[Phrase[], number[]]>; // Повертає [нові дані, id видалених помилок]
}

const ErrorPoolContext = createContext<ErrorPoolContextProps | undefined>(
  undefined
);

const STORAGE_KEY = "mp_error_pool_v1";

// Допоміжна функція для перемішування та вибору
function shuffleAndPick<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export const ErrorPoolProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [errorPool, setErrorPool] = useState<ErrorPool>(new Map());
  const isLoaded = useRef(false); // Завантаження пулу при старті

  useEffect(() => {
    const loadPool = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          // Зберігаємо як [id, Phrase][]
          const parsed = JSON.parse(stored) as [number, Phrase][];
          setErrorPool(new Map(parsed));
        }
      } catch (e) {
        console.error("Failed to load error pool", e);
        await AsyncStorage.removeItem(STORAGE_KEY);
      } finally {
        isLoaded.current = true;
      }
    };
    loadPool();
  }, []); // Збереження пулу при змінах

  useEffect(() => {
    if (!isLoaded.current) return; // Не зберігаємо, поки не завантажили

    const savePool = async () => {
      try {
        const dataToStore = JSON.stringify(Array.from(errorPool.entries()));
        await AsyncStorage.setItem(STORAGE_KEY, dataToStore);
      } catch (e) {
        console.error("Failed to save error pool", e);
      }
    };
    savePool();
  }, [errorPool]);

  const addError = useCallback((phrase: Phrase) => {
    // ✅ ПРІОРИТЕТ: phrase_id (з бекенду) > stableId > id (локальний)
    const stableId = phrase.phrase_id ?? phrase.stableId ?? phrase.id;

    // Переконуємось, що ID стабільний
    if (typeof stableId !== "number") {
      console.warn(
        "❌ Attempted to add error phrase with invalid stableId",
        phrase
      );
      return;
    }

    console.log("✅ Adding error to pool:", {
      phrase: phrase.phrase,
      stableId,
      phrase_id: phrase.phrase_id,
      localId: phrase.id,
    });

    setErrorPool((prev) => {
      const newMap = new Map(prev);
      // Зберігаємо фразу з гарантованим stableId
      newMap.set(stableId, { ...phrase, stableId });
      return newMap;
    });
  }, []);

  const removeErrors = useCallback((phraseIds: number[]) => {
    if (!phraseIds || phraseIds.length === 0) return;

    console.log("🗑️ Removing errors from pool:", phraseIds);

    setErrorPool((prev) => {
      const newMap = new Map(prev);
      let removedCount = 0;

      phraseIds.forEach((id) => {
        if (newMap.has(id)) {
          newMap.delete(id);
          removedCount++;
        }
      });

      console.log(`✅ Removed ${removedCount}/${phraseIds.length} errors`);
      console.log(`📊 Pool size: ${newMap.size}`);

      return newMap;
    });
  }, []);

  const clearErrors = useCallback(() => {
    setErrorPool(new Map());
  }, []);

  const getErrorArray = useCallback(() => {
    return Array.from(errorPool.values());
  }, [errorPool]); // Логіка "Ін'єкції"

  const injectErrors = useCallback(
    async (data: Phrase[], count: number): Promise<[Phrase[], number[]]> => {
      const allErrors = Array.from(errorPool.values());
      if (allErrors.length === 0) {
        return [data, []];
      }

      // Обираємо фрази для ін'єкції
      const errorsToInject = shuffleAndPick(allErrors, count);

      // Збираємо stableId для повернення (для логування/аналітики)
      const injectedIds = errorsToInject
        .map((p) => p.stableId ?? p.id)
        .filter((id): id is number => typeof id === "number");

      // ⚠️ НЕ ВИДАЛЯЄМО ПОМИЛКИ З ПУЛУ!
      // Видалення відбудеться в WritingExercise після успішного проходження

      // Повертаємо об'єднаний масив
      return [[...data, ...errorsToInject], injectedIds];
    },
    [errorPool]
  );

  const value = {
    errorPool,
    addError,
    removeErrors,
    clearErrors,
    getErrorArray,
    injectErrors,
  };

  return (
    <ErrorPoolContext.Provider value={value}>
            {children}   {" "}
    </ErrorPoolContext.Provider>
  );
};

export function useErrorPool() {
  const ctx = useContext(ErrorPoolContext);
  if (!ctx)
    throw new Error("useErrorPool must be used within ErrorPoolProvider");
  return ctx;
}
