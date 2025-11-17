const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface ThousandData {
  id: number;
  name: string;
  description?: string | null;
}

export interface WordSetData {
  id: number;
  word_set: string;
}

export interface NounData {
  word_id: number;
  word: string;
  translation: string | null;
  noun_id: number | null;
  article: "der" | "die" | "das" | "der/die" | null;
  gender: "m" | "n" | "f" | "pl" | null;
  plural: string | null;
  plural_alt: string | null;
  artikel_explanation: string | null;
  plural_explanation: string | null;
}

export interface QuizQuestion {
  id: number;
  type: "article" | "plural";
  word: string;
  correctAnswer: string;
  options: string[];
  explanation?: string;
}

// GET /api/thousands?language_id=1
export async function fetchThousands(
  languageId: number = 1
): Promise<ThousandData[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/thousands?language_id=${languageId}`
  );
  if (!response.ok) throw new Error("Failed to fetch thousands");
  const json = await response.json();
  return json.data;
}

// GET /api/thousands/:id/word-sets
export async function fetchWordSetsByThousand(
  thousandId: number
): Promise<WordSetData[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/thousands/${thousandId}/word-sets`
  );
  if (!response.ok) throw new Error("Failed to fetch word sets");
  const json = await response.json();
  return json.data;
}

// GET /api/nouns/word-set/:word_set_id?interface_language=uk
export async function fetchNounsByWordSet(
  wordSetId: number,
  interfaceLanguage: string = "uk"
): Promise<NounData[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/nouns/word-set/${wordSetId}?interface_language=${interfaceLanguage}`
  );
  if (!response.ok) throw new Error("Failed to fetch nouns");
  const json = await response.json();
  return json.data;
}

// Генератор міні-тесту на основі даних
export function generateQuiz(
  nouns: NounData[],
  count: number = 4
): QuizQuestion[] {
  const shuffled = [...nouns].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  return selected.map((noun, idx) => {
    const isArticleQuestion = Math.random() > 0.5;

    if (isArticleQuestion) {
      return {
        id: idx,
        type: "article",
        word: noun.word,
        correctAnswer: noun.article || "der",
        options: ["der", "die", "das"].sort(() => Math.random() - 0.5),
        explanation: noun.artikel_explanation || undefined,
      };
    } else {
      const wrongOptions = shuffled
        .filter((n) => n.word_id !== noun.word_id && n.plural)
        .slice(0, 2)
        .map((n) => n.plural!);

      return {
        id: idx,
        type: "plural",
        word: noun.word,
        correctAnswer: noun.plural || "-",
        options: [noun.plural || "-", ...wrongOptions].sort(
          () => Math.random() - 0.5
        ),
        explanation: noun.plural_explanation || undefined,
      };
    }
  });
}
