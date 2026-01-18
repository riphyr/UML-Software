export type Camera = { x: number; y: number; scale: number };

export function clamp(v: number, min: number, max: number) {
    return Math.min(max, Math.max(min, v));
}

export function screenToWorld(
    sx: number,
    sy: number,
    camera: Camera
) {
    return {
        x: (sx - camera.x) / camera.scale,
        y: (sy - camera.y) / camera.scale,
    };
}

export function worldToScreen(
    wx: number,
    wy: number,
    camera: Camera
) {
    return {
        x: wx * camera.scale + camera.x,
        y: wy * camera.scale + camera.y,
    };
}
