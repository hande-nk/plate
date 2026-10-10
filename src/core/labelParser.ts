import { todo } from "./todo";

/*
 Turn messy OCR text from a US nutrition label into numbers.
 Tesseract makes mistakes: "Calor1es", "Prote in", "43q", "O" for "0".
 Return null if you can't find calories at all: the app then asks one question.
*/

export interface LabelFacts {
  kcal: number;
  servingSize: string | null;  // as printed, e.g. "1 bar (68g)"
  proteinG: number | null;
  carbsG: number | null;       // Total Carbohydrate
  fatG: number | null;         // Total Fat
}

export function parseLabel(ocrText: string): LabelFacts | null {
  return todo("parseLabel");
}
