import { useMemo, useState } from "react";

import type { RelationPoint, UmlRelation } from "../../model/relation";
import type { ViewsById } from "../../model/views";
import type { NodeView } from "../../model/view";

type Side = "N" | "E" | "S" | "W";

const PORT_OFFSET = 14;

type Active = {
    relationId: string;
    index: number;
    basePoints: RelationPoint[];
    draft: RelationPoint;
};

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

function isSamePoint(a: RelationPoint, b: RelationPoint) {
    return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}

function pushPoint(out: RelationPoint[], p: RelationPoint) {
    const last = out[out.length - 1];
    if (!last || !isSamePoint(last, p)) out.push(p);
}

function autoOrthoRoute(a: RelationPoint, aSide: Side, b: RelationPoint, bSide: Side, gap: number): RelationPoint[] {
    const na = sideNormal(aSide);
    const nb = sideNormal(bSide);

    const exit = { x: a.x + na.x * gap, y: a.y + na.y * gap };
    const entry = { x: b.x + nb.x * gap, y: b.y + nb.y * gap };

    const pts: RelationPoint[] = [];
    pushPoint(pts, exit);

    const dx = entry.x - exit.x;
    const dy = entry.y - exit.y;

    if (Math.abs(dx) >= 0.001 && Math.abs(dy) >= 0.001) {
        const preferHFirst = Math.abs(dx) >= Math.abs(dy);
        const mid = preferHFirst ? { x: entry.x, y: exit.y } : { x: exit.x, y: entry.y };
        pushPoint(pts, mid);
    }

    pushPoint(pts, entry);
    return pts;
}

function computeAutoControlsForRelation(r: UmlRelation, viewsById: ViewsById, opts: { gap: number }): RelationPoint[] {
    const from = viewsById[r.fromId];
    const to = viewsById[r.toId];
    if (!from || !to) return [];

    const toC = center(to);
    const fromC = center(from);

    const fromSide: Side = r.fromPortLocked
        ? ((r.fromPort as Side | undefined) ?? chooseSide(from, toC))
        : chooseSide(from, toC);
    const toSide: Side = r.toPortLocked
        ? ((r.toPort as Side | undefined) ?? chooseSide(to, fromC))
        : chooseSide(to, fromC);

    const a = portPoint(from, fromSide);
    const b = portPoint(to, toSide);

    return autoOrthoRoute(a, fromSide, b, toSide, opts.gap);
}

function computeEndpoints(r: UmlRelation, viewsById: ViewsById): { a: RelationPoint; b: RelationPoint } | null {
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

    return { a: portPoint(from, fromSide), b: portPoint(to, toSide) };
}

function dist(a: RelationPoint, b: RelationPoint) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
}

function findNearestPort(
    viewsById: ViewsById,
    p: RelationPoint,
    hit: number
): { id: string; side: Side } | null {
    let best: { id: string; side: Side; d: number } | null = null;
    const sides: Side[] = ["N", "E", "S", "W"];

    for (const id of Object.keys(viewsById)) {
        const v = viewsById[id];
        if (!v) continue;
        for (const s of sides) {
            const pp = portPoint(v, s);
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

    const [active, setActive] = useState<Active | null>(null);

    function cancel() {
        setActive(null);
    }

    function start(relationId: string, index: number) {
        if (disabled) return;

        const r = relations.find(x => x.id === relationId);
        if (!r) return;

        const ends = computeEndpoints(r, viewsById);
        if (!ends) return;

        const gap = 24;
        const inner = r.controlPoints && r.controlPoints.length > 0 ? r.controlPoints : computeAutoControlsForRelation(r, viewsById, { gap });
        // effective points = endpoints + inner control points
        const pts = [ends.a, ...inner, ends.b];

        if (index < 0 || index >= pts.length) return;

        setActive({
            relationId,
            index,
            basePoints: pts,
            draft: { ...pts[index] },
        });
    }

    function updateToWorld(x: number, y: number) {
        // Grid snap is good for inner waypoints, but it can make endpoint relocalisation impossible:
        // the dragged point gets stuck between port positions, so it never enters the port hit radius.
        // Endpoints are snapped on commit() via findNearestPort(), so keep them free while dragging.
        setActive(prev => {
            if (!prev) return prev;

            const isEndpoint = prev.index === 0 || prev.index === prev.basePoints.length - 1;
            if (grid.enabled && !isEndpoint) {
                const step = Math.max(1, grid.size / 2);
                const sx = Math.round(x / step) * step;
                const sy = Math.round(y / step) * step;
                return { ...prev, draft: { x: sx, y: sy } };
            }

            return { ...prev, draft: { x, y } };
        });
    }

    function commit() {
        if (!active || disabled) return;

        const r0 = relations.find(r => r.id === active.relationId);
        if (!r0) {
            setActive(null);
            return;
        }

        const next = active.basePoints.map((p, i) => (i === active.index ? active.draft : p));
        const isEndpointCandidate = active.index === 0 || active.index === next.length - 1;

        const innerAfter = next.slice(1, Math.max(1, next.length - 1));

        if (isEndpointCandidate) {
            const hit = 22;
            const port = findNearestPort(viewsById, active.draft, hit);

            if (port) {
                // endpoint = 0 => from ; endpoint = last => to
                if (active.index === 0) {
                    if (port.id !== r0.toId) {
                        setRelations(prev =>
                            prev.map(r => {
                                if (r.id !== r0.id) return r;
                                return {
                                    ...r,
                                    fromId: port.id,
                                    fromPort: port.side,
                                    fromPortLocked: true,
                                    controlPoints: undefined, // endpoint moved => reroute clean
                                };
                            })
                        );
                        setActive(null);
                        return;
                    }
                } else {
                    if (port.id !== r0.fromId) {
                        setRelations(prev =>
                            prev.map(r => {
                                if (r.id !== r0.id) return r;
                                return {
                                    ...r,
                                    toId: port.id,
                                    toPort: port.side,
                                    toPortLocked: true,
                                    controlPoints: undefined, // endpoint moved => reroute clean
                                };
                            })
                        );
                        setActive(null);
                        return;
                    }
                }
            }
        }

        setRelations(prev =>
            prev.map(r => {
                if (r.id !== active.relationId) return r;
                // on stocke uniquement les points internes (sans endpoints)
                const pruned = innerAfter;
                return { ...r, controlPoints: pruned.length > 0 ? pruned : undefined };
            })
        );

        setActive(null);
    }

    const override = useMemo(() => {
        if (!active) return null;
        const next = active.basePoints.map((p, i) => (i === active.index ? active.draft : p));
        return { relationId: active.relationId, points: next };
    }, [active]);

    function getEffectiveControlPoints(r: UmlRelation): RelationPoint[] {
        const ends = computeEndpoints(r, viewsById);
        if (!ends) return [];

        if (override && override.relationId === r.id) return override.points;

        const inner = r.controlPoints && r.controlPoints.length > 0
            ? r.controlPoints
            : computeAutoControlsForRelation(r, viewsById, { gap: 24 });

        return [ends.a, ...inner, ends.b];
    }

    return {
        isActive: !!active,
        relationId: active?.relationId ?? null,

        start,
        cancel,
        updateToWorld,
        commit,

        getEffectiveControlPoints,
    };
}
