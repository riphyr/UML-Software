import type { ActivityNodeView } from "../../../model/activity/activity";
import { chooseSide, portPoint } from "../nodes/ports";

export type Polyline = { points: { x: number; y: number }[] };

export function routeOrthogonal(fromV: ActivityNodeView, toV: ActivityNodeView): Polyline {
    const fromCenter = { x: fromV.x + fromV.w / 2, y: fromV.y + fromV.h / 2 };
    const toCenter = { x: toV.x + toV.w / 2, y: toV.y + toV.h / 2 };

    const s1 = chooseSide(fromV, toCenter);
    const s2 = chooseSide(toV, fromCenter);

    const a = portPoint(fromV, s1, 10);
    const b = portPoint(toV, s2, 10);

    // L simple : (a.x, a.y) -> (a.x, b.y) -> (b.x, b.y) OU via (b.x, a.y)
    const mid1 = { x: a.x, y: b.y };
    const mid2 = { x: b.x, y: a.y };

    const useMid1 = Math.abs(mid1.x - a.x) + Math.abs(mid1.y - a.y) + Math.abs(b.x - mid1.x) + Math.abs(b.y - mid1.y);
    const useMid2 = Math.abs(mid2.x - a.x) + Math.abs(mid2.y - a.y) + Math.abs(b.x - mid2.x) + Math.abs(b.y - mid2.y);

    const pts = useMid1 <= useMid2 ? [a, mid1, b] : [a, mid2, b];
    return { points: simplify(pts) };
}

function simplify(pts: { x: number; y: number }[]) {
    // retire points colinéaires
    const out: { x: number; y: number }[] = [];
    for (const p of pts) {
        out.push(p);
        while (out.length >= 3) {
            const a = out[out.length - 3];
            const b = out[out.length - 2];
            const c = out[out.length - 1];
            const col = (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y);
            if (col) out.splice(out.length - 2, 1);
            else break;
        }
    }
    return out;
}
