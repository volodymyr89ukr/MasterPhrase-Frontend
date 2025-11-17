export type Level = "A1" | "A2" | "B1" | "B2";

export interface IrregularItem {
  id: number;
  german: string;
  translation: string;
  level: Level;
  // Для іменників
  article?: "der" | "die" | "das";
  plural?: string;
  // Для дієслів
  prateritum?: string;
  partizip?: string;
  // Для відмінювання
  ich?: string;
  du?: string;
  er?: string;
  wir?: string;
  ihr?: string;
  sie?: string;
}

export interface IrregularBlock {
  id: number;
  items: IrregularItem[];
  level: Level;
  completed: boolean;
  lastStudied?: Date;
}

export interface Category {
  id: string;
  title: string;
  description: string;
  icon: string;
  totalItems: number;
  blocks: IrregularBlock[];
  progress: number; // 0-100
}

export interface NounSuperset {
  id: number;
  name: string;
  description?: string;
  totalWords: number; // 180 слів
  totalSets: number; // 10 комплектів по 18 слів
  progress: number; // 0-100
}

export interface NounWordSet {
  id: number;
  name: string;
  words: NounWord[];
  completed: boolean;
  quizPassed: boolean;
}

export interface NounWord {
  wordId: number;
  german: string;
  translation: string | null;
  article: "der" | "die" | "das" | "der/die";
  plural: string | null;
  artikelExplanation?: string;
  pluralExplanation?: string;
}

export interface QuizQuestion {
  id: number;
  type: "article" | "plural";
  word: string;
  correctAnswer: string;
  options: string[];
  explanation?: string;
}

export interface ProgressData {
  [categoryId: string]: {
    completedBlocks: number[];
    lastStudied?: string;
  };
}

export interface NounProgressData {
  [supersetId: string]: {
    completedSets: number[]; // ID завершених комплектів
    lastStudied?: string;
  };
}
