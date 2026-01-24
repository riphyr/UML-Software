export type Rect = { x: number; y: number; w: number; h: number };
export type Pt = { x: number; y: number };

export function rectCenter(r: Rect): Pt {
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

// retourne le point sur le bord du rectangle r, dans la direction vers 'to'
export function rectEdgePointTowards(r: Rect, to: Pt): Pt {
    const c = rectCenter(r);
    const dx = to.x - c.x;
    const dy = to.y - c.y;

    // cas dégénéré
    if (dx === 0 && dy === 0) return c;

    // on cherche t minimal tel que (c + t*(dx,dy)) touche un côté
    const halfW = r.w / 2;
    const halfH = r.h / 2;

    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    // scale pour atteindre le bord (comparaison normalisée)
    const tx = adx === 0 ? Infinity : halfW / adx;
    const ty = ady === 0 ? Infinity : halfH / ady;

    const t = Math.min(tx, ty);

    return { x: c.x + dx * t, y: c.y + dy * t };
}

// --- vecteurs 2D (utiles pour les marqueurs de relations UML) ---

export function vSub(a: Pt, b: Pt): Pt {
    return { x: a.x - b.x, y: a.y - b.y };
}

export function vAdd(a: Pt, b: Pt): Pt {
    return { x: a.x + b.x, y: a.y + b.y };
}

export function vMul(a: Pt, s: number): Pt {
    return { x: a.x * s, y: a.y * s };
}

export function vLen(a: Pt): number {
    return Math.hypot(a.x, a.y);
}

export function vNorm(a: Pt): Pt {
    const l = vLen(a);
    if (l === 0) return { x: 1, y: 0 };
    return { x: a.x / l, y: a.y / l };
}

export function vPerp(a: Pt): Pt {
    return { x: -a.y, y: a.x };
}
