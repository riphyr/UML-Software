import type { ActivityFlow, ActivityViewsById } from "../../../model/activity/activity";
import { routeOrthogonal } from "./routing";

function distPointToSegment2(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
    const abx = bx - ax;
    const aby = by - ay;
    const apx = px - ax;
    const apy = py - ay;

    const ab2 = abx * abx + aby * aby;
    const t = ab2 === 0 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));

    const cx = ax + t * abx;
    const cy = ay + t * aby;

    const dx = px - cx;
    const dy = py - cy;
    return dx * dx + dy * dy;
}

export function hitTestFlow(p: {
    flows: ActivityFlow[];
    viewsById: ActivityViewsById;
    world: { x: number; y: number };
    thresholdWorld: number;
}): string | null {
    const thr2 = p.thresholdWorld * p.thresholdWorld;

    for (const f of p.flows) {
        const a = p.viewsById[f.fromId];
        const b = p.viewsById[f.toId];
        if (!a || !b) continue;

        const poly = routeOrthogonal(a, b).points;
        for (let i = 0; i < poly.length - 1; i++) {
            const s = poly[i];
            const t = poly[i + 1];
            const d2 = distPointToSegment2(p.world.x, p.world.y, s.x, s.y, t.x, t.y);
            if (d2 <= thr2) return f.id;
        }
    }
    return null;
}
