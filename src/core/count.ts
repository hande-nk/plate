export type Box = { xmin: number; ymin: number; xmax: number; ymax: number};
type  Detection = { label: string; score: number; box: Box};

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