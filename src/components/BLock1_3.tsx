import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import BackButton from "./BackButton";

interface Thousand {
  id: number;
  name: string;
  description?: string | null;
}

interface WordSet {
  id: number;
  word_set: string;
  name?: string;
}

type WordItem = Word | string;

interface Word {
  id: number;
  word: string;
}

interface ExerciseMeta {
  id: number;
  exercise_name?: string;
  name?: string;
  title?: string;
}

interface ExerciseDetails {
  theory: string;
  data: any[];
  exercise_name?: string;
  name?: string;
  title?: string;
  error?: string;
}

interface ReadingTitle {
  id: number;
  title: string;
}

interface ReadingText {
  text: string;
  translation: string;
}

interface Language {
  id: number;
  code: string;
  name: string;
}

interface Block1Props {
  user: any;
  learningLanguage: Language | null;
}

export default function Block1({ user, learningLanguage }: Block1Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { thousandId, setId } = useParams();
  const location = useLocation();

  // State
  const [thousands, setThousands] = useState<Thousand[]>([]);
  const [wordSets, setWordSets] = useState<WordSet[]>([]);
  const [allWords, setAllWords] = useState<WordItem[]>([]);
  const [readingTitles, setReadingTitles] = useState<ReadingTitle[]>([]);
  const [exercisesMeta, setExercisesMeta] = useState<ExerciseMeta[]>([]);
  const [readingText, setReadingText] = useState<ReadingText | null>(null);
  const [activeTab, setActiveTab] = useState<"words" | "reading" | "exercises">(
    "words"
  );
  const [selectedReadingId, setSelectedReadingId] = useState<number | null>(
    null
  );
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(
    null
  );
  const [exerciseDetails, setExerciseDetails] =
    useState<ExerciseDetails | null>(null);

  // Loading & error
  const [loadingThousands, setLoadingThousands] = useState<boolean>(true);
  const [loadingWordSets, setLoadingWordSets] = useState<boolean>(false);
  const [loadingWords, setLoadingWords] = useState<boolean>(false);
  const [loadingReadings, setLoadingReadings] = useState<boolean>(false);
  const [loadingExercises, setLoadingExercises] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // --- Fetch thousands ---
  useEffect(() => {
    if (!learningLanguage) {
      setThousands([]);
      return;
    }
    setLoadingThousands(true);
    fetch(
      `${import.meta.env.VITE_API_URL}/api/thousands?language_id=${
        learningLanguage.id
      }`
    )
      .then((r) => r.json())
      .then((data) => {
        setThousands(Array.isArray(data.data) ? data.data : []);
        setLoadingThousands(false);
      })
      .catch(() => {
        setThousands([]);
        setLoadingThousands(false);
        setError(t("error_loading_thousands"));
      });
  }, [learningLanguage, t]);

  // --- Fetch word sets for selected thousand ---
  useEffect(() => {
    if (thousandId) {
      setLoadingWordSets(true);
      fetch(
        `${import.meta.env.VITE_API_URL}/api/thousands/${thousandId}/word-sets`
      )
        .then((r) => r.json())
        .then((data) => {
          setWordSets(Array.isArray(data.data) ? data.data : []);
          setLoadingWordSets(false);
        })
        .catch(() => {
          setWordSets([]);
          setLoadingWordSets(false);
          setError(t("error_loading_word_sets"));
        });
    }
  }, [thousandId, t]);

  // --- Fetch words, readings, exercises for selected set ---
  useEffect(() => {
    if (setId) {
      setLoadingWords(true);
      setLoadingReadings(true);
      setLoadingExercises(true);

      fetch(`${import.meta.env.VITE_API_URL}/api/word-sets/${setId}/words`)
        .then((r) => r.json())
        .then((data) => setAllWords(Array.isArray(data.data) ? data.data : []))
        .catch(() => setAllWords([]))
        .finally(() => setLoadingWords(false));

      fetch(`${import.meta.env.VITE_API_URL}/api/word-sets/${setId}/texts`)
        .then((r) => r.json())
        .then((data) =>
          setReadingTitles(Array.isArray(data.data) ? data.data : [])
        )
        .catch(() => setReadingTitles([]))
        .finally(() => setLoadingReadings(false));

      fetch(`${import.meta.env.VITE_API_URL}/api/word-sets/${setId}/exercises`)
        .then((r) => r.json())
        .then((data) =>
          setExercisesMeta(Array.isArray(data.data) ? data.data : [])
        )
        .catch(() => setExercisesMeta([]))
        .finally(() => setLoadingExercises(false));
    }
  }, [setId, t]);

  // --- Render logic by route ---
  // 1. Головна: вибір тисяч
  if (!thousandId) {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <h2 className="text-xl font-bold mb-4">{t("select_thousand")}</h2>
        {loadingThousands ? (
          <div>{t("loading")}</div>
        ) : (
          <ul>
            {thousands.map((th) => (
              <li key={th.id}>
                <button
                  className="w-full text-left py-2 px-3 rounded hover:bg-blue-100"
                  onClick={() => navigate(`/thousand/${th.id}`)}
                >
                  {th.name}
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <div className="text-red-500">{error}</div>}
      </div>
    );
  }

  // 2. Вибір комплекту в тисячі
  if (thousandId && !setId) {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <BackButton to="/" />
          <h2 className="text-xl font-bold">{t("select_word_set")}</h2>
        </div>
        {loadingWordSets ? (
          <div>{t("loading")}</div>
        ) : (
          <ul>
            {wordSets.map((ws) => (
              <li key={ws.id}>
                <button
                  className="w-full text-left py-2 px-3 rounded hover:bg-blue-100"
                  onClick={() =>
                    navigate(`/thousand/${thousandId}/set/${ws.id}`)
                  }
                >
                  {ws.name || ws.word_set}
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <div className="text-red-500">{error}</div>}
      </div>
    );
  }

  // 3. Перегляд комплекту (слова, читання, вправи)
  if (thousandId && setId) {
    return (
      <div className="p-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <BackButton to={`/thousand/${thousandId}`} />
          <div className="flex gap-2">
            <button
              className={`px-3 py-1 rounded ${
                activeTab === "words" ? "bg-blue-200" : "bg-gray-100"
              }`}
              onClick={() => setActiveTab("words")}
            >
              {t("tab_all_words")}
            </button>
            <button
              className={`px-3 py-1 rounded ${
                activeTab === "reading" ? "bg-blue-200" : "bg-gray-100"
              }`}
              onClick={() => setActiveTab("reading")}
            >
              {t("tab_reading")}
            </button>
            <button
              className={`px-3 py-1 rounded ${
                activeTab === "exercises" ? "bg-blue-200" : "bg-gray-100"
              }`}
              onClick={() => setActiveTab("exercises")}
            >
              {t("tab_exercises")}
            </button>
          </div>
        </div>
        {/* Tabs content */}
        {activeTab === "words" && (
          <div>
            {loadingWords ? (
              t("loading")
            ) : (
              <ul>
                {allWords.map((w: any, idx) => (
                  <li key={w.id || idx}>
                    {typeof w === "string" ? w : w.word}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {activeTab === "reading" && (
          <div>
            {loadingReadings ? (
              t("loading")
            ) : (
              <ul>
                {readingTitles.map((rt) => (
                  <li key={rt.id}>{rt.title}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {activeTab === "exercises" && (
          <div>
            {loadingExercises ? (
              t("loading")
            ) : (
              <ul>
                {exercisesMeta.map((ex) => (
                  <li key={ex.id}>{ex.title || ex.name || ex.exercise_name}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {error && <div className="text-red-500">{error}</div>}
      </div>
    );
  }

  return null;
}
