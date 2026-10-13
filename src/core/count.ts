export type Box = { xmin: number; ymin: number; xmax: number; ymax: number};
export type  Detection = { label: string; score: number; box: Box};

//Intersection over Union
// overlap area / union area, 0 if union is 0
export function iou(a: Box, b: Box): number {
    const width = Math.max(0, Math.min(a.xmax, b.xmax) - Math.max(a.xmin, b.xmin));
    const height = Math.max(0, Math.min(a.ymax, b.ymax) - Math.max(a.ymin, b.ymin));
    const intersection = width * height;

    const areaA = (a.xmax - a.xmin) * (a.ymax - a.ymin);
    const areaB = (b.xmax - b.xmin) * (b.ymax - b.ymin);
    const union = areaA + areaB - intersection;

    return union > 0 ? intersection / union : 0;
}

//Non-Max Suppression (which boxes arer duplicates of each other)
//highest score first; keep if IoU with every kept box <= maxIou
export function nms(dets: Detection[], maxIou = 0.5): Detection[] {
    const sorted = [...dets].sort((a, b) => b.score - a.score);
    const kept: Detection[] = [];

    for (const d of sorted) {
        //asks whether this box overlaps every winner so far by 0.5 or less
        if (kept.every((k) => iou(k.box, d.box) <= maxIou)) {
            kept.push(d);
        }
    }

    return kept;
}

//ContItems
//how many of this food are on the plate?
export function countItems(dets: Detection[], label: string, minScore = 0.1, maxIou = 0.5): number {
    //keep only the selected food's boxes
    const selected: Detection[] = [];
    for (const d of dets) {
        if (d.label === label && d.score >= minScore) 
            selected.push(d);
    }

    return nms(selected, maxIou).length;
}