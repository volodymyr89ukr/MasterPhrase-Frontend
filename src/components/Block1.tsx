import React, { useState, useEffect } from "react";
import ExerciseBlockContainer from "./ExerciseBlockContainer";
import TextSpeechHighlighter from "./TextSpeechHighlighter";
import { User } from "../types";
import { useTranslation } from "react-i18next";

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
  user: User | null;
  learningLanguage: Language | null;
  page: "thousands" | "sets" | "setDetails";
  onSelectThousand: (thousand: Thousand) => void;
  onSelectSet: (set: WordSet) => void;
  selectedThousand: Thousand | null;
  selectedSet: WordSet | null;
  onBackFromSet: () => void;
  onBackFromSets: () => void;
}

export default function Block1({
  user,
  learningLanguage,
  page,
  onSelectThousand,
  onSelectSet,
  selectedThousand,
  selectedSet,
  onBackFromSet,
  onBackFromSets,
}: Block1Props) {
  const { t } = useTranslation();

  // --- State ---
  const [thousands, setThousands] = useState<Thousand[]>([]);
  const [wordSets, setWordSets] = useState<WordSet[]>([]);
  const [allWords, setAllWords] = useState<WordItem[]>([]);
  const [readingTitles, setReadingTitles] = useState<ReadingTitle[]>([]);
  const [exercisesMeta, setExercisesMeta] = useState<ExerciseMeta[]>([]);
  const [selectedReadingId, setSelectedReadingId] = useState<number | null>(
    null
  );
  const [readingText, setReadingText] = useState<ReadingText | null>(null);
  const [activeTab, setActiveTab] = useState<"words" | "reading" | "exercises">(
    "words"
  );
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(
    null
  );
  const [exerciseDetails, setExerciseDetails] =
    useState<ExerciseDetails | null>(null);

  const [loadingThousands, setLoadingThousands] = useState<boolean>(true);
  const [loadingWordSets, setLoadingWordSets] = useState<boolean>(false);
  const [loadingWords, setLoadingWords] = useState<boolean>(false);
  const [loadingReadings, setLoadingReadings] = useState<boolean>(false);
  const [loadingExercises, setLoadingExercises] = useState<boolean>(false);
  const [loadingExerciseDetails, setLoadingExerciseDetails] =
    useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // --- Load thousands ---
  useEffect(() => {
    if (!learningLanguage) {
      setThousands([]);
      setLoadingThousands(false);
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

  // --- Load word sets when thousand selected ---
  useEffect(() => {
    if (page !== "sets" || !selectedThousand) return;
    setLoadingWordSets(true);
    fetch(
      `${import.meta.env.VITE_API_URL}/api/thousands/${
        selectedThousand.id
      }/word-sets`
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
  }, [page, selectedThousand, t]);

  // --- Load set details (words, readings, exercises) ---
  useEffect(() => {
    if (page !== "setDetails" || !selectedSet) return;
    setLoadingWords(true);
    setLoadingReadings(true);
    setLoadingExercises(true);

    fetch(
      `${import.meta.env.VITE_API_URL}/api/word-sets/${selectedSet.id}/words`
    )
      .then((r) => r.json())
      .then((data) => {
        setAllWords(Array.isArray(data) ? data : data.words || data.data || []);
      })
      .catch(() => setAllWords([]))
      .finally(() => setLoadingWords(false));

    fetch(
      `${import.meta.env.VITE_API_URL}/api/word-sets/${selectedSet.id}/texts`
    )
      .then((r) => r.json())
      .then((data) => {
        setReadingTitles(Array.isArray(data) ? data : data.data || []);
      })
      .catch(() => setReadingTitles([]))
      .finally(() => setLoadingReadings(false));

    fetch(
      `${import.meta.env.VITE_API_URL}/api/word-sets/${
        selectedSet.id
      }/exercises`
    )
      .then((r) => r.json())
      .then((data) => {
        setExercisesMeta(Array.isArray(data) ? data : data.data || []);
      })
      .catch(() => setExercisesMeta([]))
      .finally(() => setLoadingExercises(false));

    setReadingText(null);
    setSelectedReadingId(null);
    setActiveTab("words");
    setSelectedExerciseId(null);
    setExerciseDetails(null);
  }, [page, selectedSet]);

  // --- Load reading text when selected ---
  useEffect(() => {
    if (
      activeTab === "reading" &&
      readingTitles.length > 0 &&
      !selectedReadingId
    ) {
      handleSelectReading(readingTitles[0].id);
    }
    // eslint-disable-next-line
  }, [activeTab, readingTitles]);

  const handleSelectReading = async (readingId: number) => {
    setSelectedReadingId(readingId);
    setReadingText(null);
    if (readingId) {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/texts/${readingId}`
      );
      const data = await res.json();
      setReadingText(data.data || { text: "", translation: "" });
    }
  };

  const handleSelectExercise = async (exerciseId: number) => {
    setSelectedExerciseId(exerciseId);
    setLoadingExerciseDetails(true);
    setExerciseDetails(null);
    if (exerciseId && selectedSet) {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/word-sets/${
            selectedSet.id
          }/exercises/${exerciseId}`
        );
        const data = await res.json();
        setExerciseDetails(data);
      } catch {
        setExerciseDetails({
          error: t("failed_to_load_exercise"),
        } as ExerciseDetails);
      }
      setLoadingExerciseDetails(false);
    }
  };

  // --- UI: Вибір тисячі ---
  if (page === "thousands") {
    if (loadingThousands) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-blue-700">{t("loading_thousands")}</div>
        </div>
      );
    }
    return (
      <div className="p-4 w-full max-w-2xl mx-auto">
        <h2 className="text-xl font-bold mb-4 text-blue-700 text-center">
          {t("choose_thousand_title")}
        </h2>
        {error && <div className="text-red-600 text-center mb-2">{error}</div>}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {thousands.map((th) => (
            <button
              key={th.id}
              className="py-6 rounded-xl bg-white shadow hover:bg-blue-50 text-lg font-semibold text-blue-700 transition"
              onClick={() => onSelectThousand(th)}
            >
              {th.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- UI: Вибір комплекту ---
  if (page === "sets" && selectedThousand) {
    if (loadingWordSets) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
          <div className="text-blue-700">{t("loading_word_sets")}</div>
        </div>
      );
    }
    return (
      <div className="p-4 w-full max-w-2xl mx-auto">
        <div className="flex items-center mb-4">
          <button
            className="text-xl text-blue-600 hover:text-blue-800 mr-2"
            onClick={onBackFromSets}
            aria-label={t("back")}
          >
            ←
          </button>
          <h2 className="text-lg font-bold text-blue-700">
            {t("choose_set_title")}
          </h2>
        </div>
        {error && <div className="text-red-600 text-center mb-2">{error}</div>}
        <div className="flex flex-wrap gap-2">
          {wordSets.map((set) => (
            <button
              key={set.id}
              className="py-3 px-4 rounded-xl bg-white shadow hover:bg-blue-50 text-base font-semibold text-blue-700 transition"
              onClick={() => onSelectSet(set)}
            >
              {set.name || set.word_set}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- UI: Всередині комплекту ---
  if (page === "setDetails" && selectedSet) {
    // Tabs with icons
    const tabs = [
      { key: "words", label: t("all_words"), icon: "📋" },
      { key: "reading", label: t("reading"), icon: "📖" },
      { key: "exercises", label: t("exercises"), icon: "📝" },
    ] as const;

    return (
      <div className="p-2 sm:p-4 w-full max-w-3xl min-w-[320px] mx-auto">
        <div className="flex items-center mb-2">
          <button
            className="text-xl text-blue-600 hover:text-blue-800 mr-2"
            onClick={onBackFromSet}
            aria-label={t("back")}
          >
            ←
          </button>
          <span className="font-bold text-blue-700 text-lg">
            {selectedSet.name || selectedSet.word_set}
          </span>
        </div>
        {/* Sticky Tabs */}
        <div className="sticky top-0 z-20 bg-blue-50">
          <div className="flex gap-2 border-b border-blue-100 mb-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`flex items-center gap-1 px-3 py-2 rounded-t-md font-medium text-sm transition
                  ${
                    activeTab === tab.key
                      ? "bg-white text-blue-700 shadow"
                      : "text-blue-500 hover:text-blue-700"
                  }`}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        {/* Tab Content */}
        <div className="mt-2">
          {activeTab === "words" && (
            <div className="bg-white rounded-xl shadow p-4 min-h-[200px]">
              {loadingWords ? (
                <div className="text-blue-700">{t("loading_words")}</div>
              ) : allWords.length === 0 ? (
                <div className="text-gray-500">{t("no_words_found")}</div>
              ) : (
                <ul className="list-disc pl-6 space-y-1">
                  {allWords.map((w, idx) =>
                    typeof w === "string" ? (
                      <li key={idx}>{w}</li>
                    ) : (
                      <li key={w.id}>{w.word}</li>
                    )
                  )}
                </ul>
              )}
            </div>
          )}
          {activeTab === "reading" && (
            <div className="bg-white rounded-xl shadow p-4 min-h-[200px]">
              {loadingReadings ? (
                <div className="text-blue-700">{t("loading_readings")}</div>
              ) : readingTitles.length === 0 ? (
                <div className="text-gray-500">{t("no_readings_found")}</div>
              ) : (
                <div>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {readingTitles.map((rt) => (
                      <button
                        key={rt.id}
                        className={`px-3 py-1 rounded bg-blue-100 text-blue-700 font-medium text-sm
                          ${
                            selectedReadingId === rt.id
                              ? "bg-blue-500 text-white"
                              : "hover:bg-blue-200"
                          }`}
                        onClick={() => handleSelectReading(rt.id)}
                      >
                        {rt.title}
                      </button>
                    ))}
                  </div>
                  {readingText ? (
                    <TextSpeechHighlighter
                      text={readingText.text}
                      translation={readingText.translation}
                    />
                  ) : (
                    <div className="text-gray-500">{t("select_reading")}</div>
                  )}
                </div>
              )}
            </div>
          )}
          {activeTab === "exercises" && (
            <div className="bg-white rounded-xl shadow p-4 min-h-[200px]">
              {loadingExercises ? (
                <div className="text-blue-700">{t("loading_exercises")}</div>
              ) : exercisesMeta.length === 0 ? (
                <div className="text-gray-500">{t("no_exercises_found")}</div>
              ) : selectedExerciseId && exerciseDetails ? (
                <ExerciseBlockContainer
                  theoryText={exerciseDetails.theory}
                  exerciseData={exerciseDetails.data}
                  onBack={() => setSelectedExerciseId(null)}
                  title={exerciseDetails.title || exerciseDetails.name}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {exercisesMeta.map((ex) => (
                    <button
                      key={ex.id}
                      className="px-4 py-2 rounded bg-blue-100 text-blue-700 font-medium text-sm hover:bg-blue-200"
                      onClick={() => handleSelectExercise(ex.id)}
                    >
                      {ex.title || ex.name || ex.exercise_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Fallback ---
  return null;
}
