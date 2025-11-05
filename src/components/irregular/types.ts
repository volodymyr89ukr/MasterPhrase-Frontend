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

export interface ProgressData {
  [categoryId: string]: {
    completedBlocks: number[];
    lastStudied?: string;
  };
}
