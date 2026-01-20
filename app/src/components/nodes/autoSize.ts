import type { UmlClass } from "../../model/uml";
import type { NodeView } from "../../model/view";
import type { GridState } from "../../model/ui";

import { NODE_LINE_HEIGHT, getAttrsCount, getMethodsStartY } from "./layout";

// Doit matcher le rendu (ClassNode / InlineEditors)
const PADDING_X = 8;

// Garde-fous
export const NODE_MIN_W = 180;
export const NODE_MAX_W = 520;
export const NODE_MIN_H = 90;
export const NODE_MAX_H = 900;

type Size = { width: number; height: number };

function clamp(n: number, a: number, b: number) {
    return Math.max(a, Math.min(b, n));
}

function snapUp(n: number, step: number) {
    if (step <= 0) return n;
    return Math.ceil(n / step) * step;
}

/**
 * Mesure approximative, stable, sans dépendre du DOM.
 * On préfère légèrement surestimer plutôt que tronquer.
 */
function approxTextWidthPx(text: string, fontSizePx: number) {
    // heuristique : ~0.56em par caractère pour Inter/system-ui
    const k = 0.56;
    return Math.ceil((text?.length ?? 0) * fontSizePx * k);
}

function requiredHeight(c: UmlClass): number {
    const attrsLen = c.attributes.length;
    const methodsLen = c.methods.length;

    const attrsCount = getAttrsCount(attrsLen);
    const methodsStartY = getMethodsStartY(attrsCount);

    const methodsBlockH = methodsLen > 0 ? methodsLen * NODE_LINE_HEIGHT : 0;

    const bottom = methodsStartY + methodsBlockH;
    const paddingBottom = 10;
    return bottom + paddingBottom;
}

function requiredWidth(c: UmlClass): number {
    const nameW = approxTextWidthPx(c.name ?? "", 14);

    let maxLineW = nameW;

    for (const a of c.attributes ?? []) maxLineW = Math.max(maxLineW, approxTextWidthPx(a ?? "", 12));
    for (const m of c.methods ?? []) maxLineW = Math.max(maxLineW, approxTextWidthPx(m ?? "", 12));

    const margin = 14;
    return PADDING_X * 2 + maxLineW + margin;
}

export function computeAutoSize(c: UmlClass, grid: GridState): Size {
    let w = requiredWidth(c);
    let h = requiredHeight(c);

    w = clamp(w, NODE_MIN_W, NODE_MAX_W);
    h = clamp(h, NODE_MIN_H, NODE_MAX_H);

    if (grid.enabled) {
        w = snapUp(w, grid.size);
        h = snapUp(h, grid.size);
    }

    return { width: w, height: h };
}

export function applyAutoSizeIfNeeded(args: {
    view: NodeView | undefined;
    nextClass: UmlClass;
    grid: GridState;
}): Partial<NodeView> | null {
    const { view, nextClass, grid } = args;
    if (!view) return null;

    const mode = view.sizeMode ?? "auto";
    if (mode !== "auto") return null;

    const { width, height } = computeAutoSize(nextClass, grid);
    return { width, height };
}
