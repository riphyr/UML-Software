// useRelationRouting.ts
import { useMemo, useState } from "react";

import type { RelationPoint, UmlRelation } from "../../model/relation";
import type { ViewsById } from "../../model/views";
import type { NodeView } from "../../model/view";
import { buildPortLayout, getEndpointPortPoint } from "../relations/ports";
import type { PortLayout } from "../relations/ports";

type Side = "N" | "E" | "S" | "W";

const PORT_OFFSET = 14;
const AUTO_GAP = 24;
const PORT_HIT = 22;

// Invariant UI / UX:
// - en mode manuel, on ne descend jamais sous MIN_WP controlPoints
// - les points générés automatiquement restent orthogonaux

type Active = {
    relationId: string;
    kind: "waypoint" | "from" | "to";
    i: number;
    // polyline complète de base: [a, ...inner, b]
    basePoints: RelationPoint[];
    // nombre interne attendu (pour préserver le nombre de waypoints)
    desiredInnerCount: number;

    draft: RelationPoint;
};

function clampInt(n: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, Math.floor(n)));
}

function center(v: NodeView): RelationPoint {
    return { x: v.x + v.width / 2, y: v.y + v.height / 2 };
}

function chooseSide(from: NodeView, toPoint: RelationPoint): Side {
    const c = center(from);
    const dx = toPoint.x - c.x;
    const dy = toPoint.y - c.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "E" : "W";
    return dy >= 0 ? "S" : "N";
}

function sideMidpoint(v: NodeView, side: Side): RelationPoint {
    const cx = v.x + v.width / 2;
    const cy = v.y + v.height / 2;
    if (side === "N") return { x: cx, y: v.y };
    if (side === "S") return { x: cx, y: v.y + v.height };
    if (side === "W") return { x: v.x, y: cy };
    return { x: v.x + v.width, y: cy };
}

function sideNormal(side: Side): RelationPoint {
    if (side === "N") return { x: 0, y: -1 };
    if (side === "S") return { x: 0, y: 1 };
    if (side === "W") return { x: -1, y: 0 };
    return { x: 1, y: 0 };
}

function portPoint(v: NodeView, side: Side, offset = PORT_OFFSET): RelationPoint {
    const m = sideMidpoint(v, side);
    const n = sideNormal(side);
    return { x: m.x + n.x * offset, y: m.y + n.y * offset };
}

function dist(a: RelationPoint, b: RelationPoint) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function pushPoint(out: RelationPoint[], p: RelationPoint) {
    const last = out[out.length - 1];
    if (!last || Math.abs(last.x - p.x) > 0.001 || Math.abs(last.y - p.y) > 0.001) out.push(p);
}

function enforcePerpendicular(p: RelationPoint, ref: RelationPoint, side: Side): RelationPoint {
    if (side === "E" || side === "W") return { x: p.x, y: ref.y };
    return { x: ref.x, y: p.y };
}

function buildOrthoInnerWithCount(a: RelationPoint, aSide: Side, b: RelationPoint, bSide: Side, n: number, gap: number) {
    const out: RelationPoint[] = [];

    const an = sideNormal(aSide);
    const bn = sideNormal(bSide);

    const a1 = { x: a.x + an.x * gap, y: a.y + an.y * gap };
    const b1 = { x: b.x + bn.x * gap, y: b.y + bn.y * gap };

    const a1p = enforcePerpendicular(a1, a, aSide);
    const b1p = enforcePerpendicular(b1, b, bSide);

    const mid1: RelationPoint = { x: a1p.x, y: b1p.y };
    const mid2: RelationPoint = { x: b1p.x, y: a1p.y };

    const d1 =
        Math.abs(a1p.x - mid1.x) +
        Math.abs(a1p.y - mid1.y) +
        Math.abs(mid1.x - b1p.x) +
        Math.abs(mid1.y - b1p.y);
    const d2 =
        Math.abs(a1p.x - mid2.x) +
        Math.abs(a1p.y - mid2.y) +
        Math.abs(mid2.x - b1p.x) +
        Math.abs(mid2.y - b1p.y);

    const use1 = d1 <= d2;
    const m = use1 ? mid1 : mid2;

    const base: RelationPoint[] = [];
    pushPoint(base, a1p);
    pushPoint(base, m);
    pushPoint(base, b1p);

    let total = 0;
    for (let i = 0; i + 1 < base.length; i++) {
        total += Math.abs(base[i + 1].x - base[i].x) + Math.abs(base[i + 1].y - base[i].y);
    }
    total = Math.max(1, total);

    for (let k = 1; k <= n; k++) {
        const t = k / (n + 1);
        const target = total * t;

        let acc = 0;
        for (let i = 0; i + 1 < base.length; i++) {
            const p0 = base[i];
            const p1 = base[i + 1];
            const seg = Math.abs(p1.x - p0.x) + Math.abs(p1.y - p0.y);
            if (acc + seg >= target) {
                const local = (target - acc) / Math.max(1, seg);
                if (p0.x === p1.x) {
                    pushPoint(out, { x: p0.x, y: p0.y + (p1.y - p0.y) * local });
                } else {
                    pushPoint(out, { x: p0.x + (p1.x - p0.x) * local, y: p0.y });
                }
                break;
            }
            acc += seg;
        }
    }

    for (const p of out) {
        p.x = Math.round(p.x);
        p.y = Math.round(p.y);
    }

    return out;
}

function computeEndpoints(
    r: UmlRelation,
    viewsById: ViewsById,
    layout?: PortLayout
): { a: RelationPoint; b: RelationPoint; fromSide: Side; toSide: Side } | null {
    const from = viewsById[r.fromId];
    const to = viewsById[r.toId];
    if (!from || !to) return null;

    const toC = center(to);
    const fromC = center(from);

    const fromSide: Side = r.fromPortLocked
        ? ((r.fromPort as Side | undefined) ?? chooseSide(from, toC))
        : chooseSide(from, toC);
    const toSide: Side = r.toPortLocked
        ? ((r.toPort as Side | undefined) ?? chooseSide(to, fromC))
        : chooseSide(to, fromC);

    let a = portPoint(from, fromSide);
    let b = portPoint(to, toSide);

    if (layout) {
        const ap = getEndpointPortPoint(layout, r.id, "from", viewsById, PORT_OFFSET);
        const bp = getEndpointPortPoint(layout, r.id, "to", viewsById, PORT_OFFSET);
        if (ap) a = ap.point;
        if (bp) b = bp.point;
    }

    return { a, b, fromSide, toSide };
}

function findNearestPort(viewsById: ViewsById, p: RelationPoint, hit: number): { id: string; side: Side } | null {
    let best: { id: string; side: Side; d: number } | null = null;
    const sides: Side[] = ["N", "E", "S", "W"];

    for (const id of Object.keys(viewsById)) {
        const v = viewsById[id];
        if (!v) continue;
        for (const s of sides) {
            const pp = portPoint(v, s); // hit-test = face-only (midpoint)
            const d = dist(pp, p);
            if (d <= hit && (!best || d < best.d)) best = { id, side: s, d };
        }
    }

    if (!best) return null;
    return { id: best.id, side: best.side };
}

export function useRelationRouting(p: {
    viewsById: ViewsById;
    relations: UmlRelation[];
    setRelations: React.Dispatch<React.SetStateAction<UmlRelation[]>>;
    disabled: boolean;
    grid: { enabled: boolean; size: number };
}) {
    const { viewsById, relations, setRelations, disabled, grid } = p;

    const portLayout = useMemo(() => buildPortLayout(relations, viewsById), [relations, viewsById]);

    const [active, setActive] = useState<Active | null>(null);

    const routing = useMemo(() => {
        if (!active) return { isActive: false as const };

        const r0 = relations.find((r) => r.id === active.relationId);
        if (!r0) return { isActive: false as const };

        return {
            isActive: true as const,
            relationId: active.relationId,
            kind: active.kind,
            i: active.i,
            draft: active.draft,
            basePoints: active.basePoints,
            desiredInnerCount: active.desiredInnerCount,
        };
    }, [active, relations]);

    function snapPoint(p0: RelationPoint) {
        if (!grid.enabled) return p0;

        const base = Math.max(2, grid.size);

        // 2x plus de positions: demi-pas
        const step = base / 2;

        return {
            x: Math.round(p0.x / step) * step,
            y: Math.round(p0.y / step) * step,
        };
    }

    function setDraft(p0: RelationPoint) {
        setActive((prev) => {
            if (!prev) return prev;

            // Libre. Snap uniquement si grid ON.
            const p1 = snapPoint(p0);
            return { ...prev, draft: p1 };
        });
    }

    function startWaypointDrag(args: { relationId: string; i: number; draft: RelationPoint }) {
        if (disabled) return;

        const r0 = relations.find((r) => r.id === args.relationId);
        if (!r0) return;

        const ends = computeEndpoints(r0, viewsById, portLayout);
        if (!ends) return;

        const cps = r0.controlPoints ?? [];
        const basePoints: RelationPoint[] = [ends.a, ...cps, ends.b];

        setActive({
            relationId: r0.id,
            kind: "waypoint",
            i: args.i,
            basePoints,
            desiredInnerCount: Math.max(0, cps.length),
            draft: snapPoint(args.draft),
        });
    }

    function startEndpointDrag(args: { relationId: string; end: "from" | "to"; draft: RelationPoint }) {
        if (disabled) return;

        const r0 = relations.find((r) => r.id === args.relationId);
        if (!r0) return;

        const ends = computeEndpoints(r0, viewsById, portLayout);
        if (!ends) return;

        const cps = r0.controlPoints ?? [];
        const basePoints: RelationPoint[] = [ends.a, ...cps, ends.b];

        setActive({
            relationId: r0.id,
            kind: args.end === "from" ? "from" : "to",
            i: 0,
            basePoints,
            desiredInnerCount: Math.max(0, cps.length),
            draft: snapPoint(args.draft),
        });
    }

    function repairOrthoAround(
        cps: RelationPoint[],
        i: number,
        a: RelationPoint,
        b: RelationPoint
    ) {
        // On ne bouge jamais cps[i] (le point draggué).
        // On ajuste seulement les voisins immédiats pour que:
        // prev -> curr et curr -> next soient horizontaux ou verticaux.

        const curr = cps[i];
        if (!curr) return cps;

        const prevIsEndpoint = i === 0;
        const nextIsEndpoint = i === cps.length - 1;

        const prev = prevIsEndpoint ? a : cps[i - 1];
        const next = nextIsEndpoint ? b : cps[i + 1];

        // Ajuster prev (si c'est un waypoint)
        if (!prevIsEndpoint && prev) {
            const dx = Math.abs(prev.x - curr.x);
            const dy = Math.abs(prev.y - curr.y);

            // Choix: aligner X ou Y en bougeant le moins possible prev
            if (dx <= dy) cps[i - 1] = { x: curr.x, y: prev.y };
            else cps[i - 1] = { x: prev.x, y: curr.y };
        }

        // Ajuster next (si c'est un waypoint)
        if (!nextIsEndpoint && next) {
            const dx = Math.abs(next.x - curr.x);
            const dy = Math.abs(next.y - curr.y);

            if (dx <= dy) cps[i + 1] = { x: curr.x, y: next.y };
            else cps[i + 1] = { x: next.x, y: curr.y };
        }

        return cps;
    }

    function commit() {
        if (!active) return;

        const r0 = relations.find((r) => r.id === active.relationId);
        if (!r0) {
            setActive(null);
            return;
        }

        // 1) WAYPOINT: commit direct (pas de hit-test port)
        if (active.kind === "waypoint") {
            const cps = [...(r0.controlPoints ?? [])];
            const snapped = snapPoint(active.draft);

            if (active.i >= 0 && active.i < cps.length) cps[active.i] = snapped;

            // Réparation des coudes uniquement si grid ON (c’est ton mode “orthogonal strict”)
            if (grid.enabled) {
                const ends = computeEndpoints(r0, viewsById, portLayout);
                if (ends) {
                    repairOrthoAround(cps, active.i, ends.a, ends.b);
                }
            }

            setRelations((prev) =>
                prev.map((r) => {
                    if (r.id !== r0.id) return r;
                    return { ...r, routingMode: "manual", controlPoints: cps };
                })
            );

            setActive(null);
            return;
        }

        // 2) ENDPOINT: on ne commit que si on lâche sur un port
        const snappedPort = findNearestPort(viewsById, active.draft, PORT_HIT);
        if (!snappedPort) {
            setActive(null);
            return;
        }

        const movingFrom = active.kind === "from";
        const movingTo = active.kind === "to";

        const v = viewsById[snappedPort.id];
        if (!v) {
            setActive(null);
            return;
        }

        const other = computeEndpoints(r0, viewsById, portLayout);
        if (!other) {
            setActive(null);
            return;
        }

        // preview/commit point = port face-only. La répartition exacte est recalculée par portLayout ensuite.
        const ep = portPoint(v, snappedPort.side);

        const a = movingFrom ? ep : other.a;
        const b = movingFrom ? other.b : ep;

        const n = clampInt(active.desiredInnerCount, 0, 10);
        const inner = buildOrthoInnerWithCount(
            a,
            movingFrom ? snappedPort.side : other.fromSide,
            b,
            movingFrom ? other.toSide : snappedPort.side,
            n,
            AUTO_GAP
        );

        setRelations((prev) =>
            prev.map((r) => {
                if (r.id !== r0.id) return r;

                if (movingFrom) {
                    return {
                        ...r,
                        fromId: snappedPort.id,
                        fromPort: snappedPort.side,
                        fromPortLocked: true,
                        routingMode: "manual",
                        controlPoints: inner,
                    };
                }
                if (movingTo) {
                    return {
                        ...r,
                        toId: snappedPort.id,
                        toPort: snappedPort.side,
                        toPortLocked: true,
                        routingMode: "manual",
                        controlPoints: inner,
                    };
                }

                return r;
            })
        );

        setActive(null);
    }

    function cancel() {
        setActive(null);
    }

    return {
        routing,
        startWaypointDrag,
        startEndpointDrag,
        setDraft,
        commit,
        cancel,
    };
}
