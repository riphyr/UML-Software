import type { ActivityNodeView } from "../../../model/activity/activity";

export type PortSide = "N" | "E" | "S" | "W";

export function portPoint(v: ActivityNodeView, side: PortSide, offset = 10) {
    const cx = v.x + v.w / 2;
    const cy = v.y + v.h / 2;
    if (side === "N") return { x: cx, y: v.y - offset };
    if (side === "S") return { x: cx, y: v.y + v.h + offset };
    if (side === "W") return { x: v.x - offset, y: cy };
    return { x: v.x + v.w + offset, y: cy };
}

export function chooseSide(from: ActivityNodeView, toPoint: { x: number; y: number }): PortSide {
    const cx = from.x + from.w / 2;
    const cy = from.y + from.h / 2;
    const dx = toPoint.x - cx;
    const dy = toPoint.y - cy;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "E" : "W";
    return dy >= 0 ? "S" : "N";
}
