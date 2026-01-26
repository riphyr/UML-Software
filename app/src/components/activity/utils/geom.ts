export function clamp(v: number, a: number, b: number) {
    return Math.max(a, Math.min(b, v));
}

export function dist2(ax: number, ay: number, bx: number, by: number) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
}

export function pointInRect(px: number, py: number, r: { x: number; y: number; w: number; h: number }) {
    return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function snap(v: number, grid: number) {
    return Math.round(v / grid) * grid;
}
