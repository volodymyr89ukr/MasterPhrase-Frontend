import {
  IrregularItem,
  IrregularBlock,
  Level,
} from "../../components/irregular/types";

export function generateBlocks(
  items: IrregularItem[],
  blockSize: number = 10
): IrregularBlock[] {
  const blocks: IrregularBlock[] = [];

  for (let i = 0; i < items.length; i += blockSize) {
    const blockItems = items.slice(i, i + blockSize);

    // Визначаємо рівень блоку за найвищим рівнем в блоці
    const levels: Level[] = blockItems.map((item) => item.level);
    const blockLevel = levels.includes("B2")
      ? "B2"
      : levels.includes("B1")
      ? "B1"
      : levels.includes("A2")
      ? "A2"
      : "A1";

    blocks.push({
      id: Math.floor(i / blockSize),
      items: blockItems,
      level: blockLevel,
      completed: false,
    });
  }

  return blocks;
}

export function filterByLevel(
  items: IrregularItem[],
  level: Level
): IrregularItem[] {
  return items.filter((item) => item.level === level);
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
