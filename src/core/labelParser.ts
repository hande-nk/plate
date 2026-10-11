
/*
 Turn messy OCR text from a US nutrition label into numbers.
 Tesseract makes mistakes: "Calor1es", "Prote in", "43q", "O" for "0".
 Return null if it can't find calories at all: the app then asks one question.
*/

export interface LabelFacts {
  kcal: number;
  servingSize: string | null;  // as printed, e.g. "1 bar (68g)"
  proteinG: number | null;
  carbsG: number | null;       // Total Carbohydrate
  fatG: number | null;         // Total Fat
}

//funtion to turn mis-read spaces and digits into letters
function cleanOCR(text: string): string {
  return text
    .replace(/(?<=[a-z])1(?=[a-z])/gi, "i")  // 1 -> l in the middle of a word
    .replace(/(?<=[a-z])0(?=[a-z])/gi, "o")  // 0 -> o in the middle of a word
    .replace(/Prote\s+in/gi, "Protein")  // common OCR mistake
    .replace(/Calor\s+ies/gi, "Calories")  // common OCR mistake
    .replace(/(?<=[a-z])q(?=[a-z])/gi, "g")  // q -> g in the middle of a word
    .replace(/(?<=\d)\s?0\s?z+\b/gi, " oz")
}

function toNumber(s: string): number{
  return parseFloat(s.replace(/[Oo]/g, "0").replace(/\//g, ""));
}

function grab(text:string, re:RegExp): number | null {
  const m = text.match(re);
  return m ? toNumber(m[1]) : null;
}



//funtion to parse the OCR text and extract nutrition facts
export function parseLabel(ocrText: string): LabelFacts | null {
  const text = cleanOCR(ocrText);

  const kcal = grab(text, /Calories(?!\s+from)\s+([\dOo/]+)/i);
  if (kcal === null) return null;

  const servingSizeMatch = text.match(/Serving Size\s+([^\n]+)/i);
  const servingSize = servingSizeMatch ? servingSizeMatch[1].trim() : null;
  return {
    kcal,
    servingSize,
    proteinG: grab(text, /Protein\s+([\dOo.]+)/i),
    carbsG: grab(text, /Total Carbohydrate\s+([\dOo.]+)/i),
    fatG: grab(text, /Total\s+Fat\s+([\dOo.]+)/i)
  }
}
