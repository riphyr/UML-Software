export type Camera = { x: number; y: number; scale: number };

export function screenToWorld(sx: number, sy: number, cam: Camera) {
    return { x: (sx - cam.x) / cam.scale, y: (sy - cam.y) / cam.scale };
}

export function worldToScreen(wx: number, wy: number, cam: Camera) {
    return { x: wx * cam.scale + cam.x, y: wy * cam.scale + cam.y };
}
