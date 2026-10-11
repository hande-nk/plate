/**
 * Reads the dish name from Nutrislice OCR text: the lines above "Serving Size",
 * minus phone junk (status bar, close button, arrow icons), joined into one name.
 * Returns null when there's no "Serving Size" line or nothing name-like above it.
 */


export function guessName(ocrText: string): string | null {
    const lines = ocrText.split('\n');
    const stop = lines.findIndex( (line) => /serving size|Amount per serving/i.test(line));
    if (stop === -1) return null;
    const above = lines.slice(0, stop);

    const parts = above
        .filter((line) => !/^\d{1,2}:\d{2}/.test(line))
        .map((line) => line.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9)']+$/g, "" ))
        .filter((line) => (line.match(/[A-Za-z]/g) ?? []).length >= 2);
    
    return parts.length > 0 ? parts.join(" ") : null;
}