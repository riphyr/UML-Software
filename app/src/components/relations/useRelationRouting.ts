// useRelationRouting.ts
import { useMemo, useState } from "react";

import type { RelationPoint, UmlRelation } from "../../model/relation";
import type { ViewsById } from "../../model/views";
import type { NodeView } from "../../model/view";

type Side = "N" | "E" | "S" | "W";

const PORT_OFFSET = 14;
const AUTO_GAP = 24;
const PORT_HIT = 22;

// Invariant UI / UX:
// - en mode manuel, on ne descend jamais sous MIN_WP controlPoints
// - les points générés automatiquement restent orthogonaux
const MIN_WP = 2;
const MAX_WP = 10;

type Active = {
    relationId: string;
    index: number;

    // points affichés au début du drag (endpoints inclus)
    basePoints: RelationPoint[];

    // endpoints + sides au moment du start
    a: RelationPoint;
    b: RelationPoint;
    fromSide: Side;
    toSide: Side;

    // longueur interne attendue (pour préserver le nombre de waypoints)
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

function isSamePoint(a: RelationPoint, b: RelationPoint) {
    return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}

function pushPoint(out: RelationPoint[], p: RelationPoint) {
    const last = out[out.length - 1];
    if (!last || !isSamePoint(last, p)) out.push(p);
}

// points auto imposés (sortie + coude éventuel + entrée)
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

function computeEndpoints(
    r: UmlRelation,
    viewsById: ViewsById
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

    return { a: portPoint(from, fromSide), b: portPoint(to, toSide), fromSide, toSide };
}

function enforceEndpointPerpendicular(a: RelationPoint, aSide: Side, b: RelationPoint, bSide: Side, inner: RelationPoint[]) {
    if (inner.length === 0) return inner;
    const out = inner.map((p) => ({ ...p }));

    if (aSide === "N" || aSide === "S") out[0].x = a.x;
    else out[0].y = a.y;

    const last = out.length - 1;
    if (bSide === "N" || bSide === "S") out[last].x = b.x;
    else out[last].y = b.y;

    return out;
}

function dist(a: RelationPoint, b: RelationPoint) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
}

function findNearestPort(viewsById: ViewsById, p: RelationPoint, hit: number): { id: string; side: Side } | null {
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

function desiredInnerCountForRelation(r: UmlRelation) {
    const cur = r.controlPoints?.length ?? 0;
    // si la relation est déjà manuelle, on veut préserver le nombre ; sinon on retombe sur MIN.
    const base = cur > 0 ? cur : (r.routingMode === "manual" ? MIN_WP : MIN_WP);
    return clampInt(base, MIN_WP, MAX_WP);
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

        const r = relations.find((x) => x.id === relationId);
        if (!r) return;

        const ends = computeEndpoints(r, viewsById);
        if (!ends) return;

        const desiredInnerCount = desiredInnerCountForRelation(r);

        // Si controlPoints absents, on génère une base orthogonale pour le drag.
        const innerRaw =
            r.controlPoints && r.controlPoints.length > 0
                ? r.controlPoints
                : autoOrthoRoute(ends.a, ends.fromSide, ends.b, ends.toSide, AUTO_GAP);

        const inner = enforceEndpointPerpendicular(ends.a, ends.fromSide, ends.b, ends.toSide, innerRaw);
        const pts = [ends.a, ...inner, ends.b];

        if (index < 0 || index >= pts.length) return;

        setActive({
            relationId,
            index,
            basePoints: pts,
            a: ends.a,
            b: ends.b,
            fromSide: ends.fromSide,
            toSide: ends.toSide,
            desiredInnerCount,
            draft: { ...pts[index] },
        });
    }

    function updateToWorld(x: number, y: number) {
        setActive((prev) => {
            if (!prev) return prev;

            const isEndpoint = prev.index === 0 || prev.index === prev.basePoints.length - 1;

            // Snap grid live uniquement pour les waypoints internes.
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

        const r0 = relations.find((r) => r.id === active.relationId);
        if (!r0) {
            setActive(null);
            return;
        }

        const isEndpoint = active.index === 0 || active.index === active.basePoints.length - 1;

        // Endpoint drag: autorise le changement d'anchor (id + side), sans reset.
        if (isEndpoint) {
            const snapped = findNearestPort(viewsById, active.draft, PORT_HIT);
            if (!snapped) {
                // si pas d'anchor trouvée, on annule le déplacement endpoint (pas de diagonale fantôme)
                setActive(null);
                return;
            }

            // endpoint = 0 => from ; endpoint = last => to
            const movingFrom = active.index === 0;
            const otherId = movingFrom ? r0.toId : r0.fromId;
            if (snapped.id === otherId) {
                // refuse les self-loop via drag endpoint
                setActive(null);
                return;
            }

            const desired = clampInt(active.desiredInnerCount, MIN_WP, MAX_WP);

            setRelations((prev) =>
                prev.map((r) => {
                    if (r.id !== r0.id) return r;
                    const next: UmlRelation = {
                        ...r,
                        routingMode: "manual",
                    };

                    if (movingFrom) {
                        next.fromId = snapped.id;
                        next.fromPort = snapped.side;
                        next.fromPortLocked = true;
                    } else {
                        next.toId = snapped.id;
                        next.toPort = snapped.side;
                        next.toPortLocked = true;
                    }

                    // Régénère une forme orthogonale avec le même nombre de waypoints.
                    const inner = autoOrthoControlsWithCount(next, viewsById, desired);
                    next.controlPoints = inner;
                    return next;
                })
            );

            setActive(null);
            return;
        }

        // Waypoint interne: on remplace juste le point et on conserve la longueur.
        const nextPts = active.basePoints.map((p, i) => (i === active.index ? active.draft : p));
        const innerAfterRaw = nextPts.slice(1, Math.max(1, nextPts.length - 1));

        const endsNow = computeEndpoints(r0, viewsById);
        const innerAfter = endsNow
            ? enforceEndpointPerpendicular(endsNow.a, endsNow.fromSide, endsNow.b, endsNow.toSide, innerAfterRaw)
            : innerAfterRaw;

        // Invariant: manuel => jamais < MIN_WP.
        const desired = clampInt(active.desiredInnerCount, MIN_WP, MAX_WP);
        const fixedInner = ensureCount(innerAfter, r0, viewsById, desired);

        setRelations((prev) =>
            prev.map((r) => {
                if (r.id !== active.relationId) return r;
                return {
                    ...r,
                    routingMode: "manual",
                    controlPoints: fixedInner,
                };
            })
        );

        setActive(null);
    }

    // pendant un endpoint-drag: on veut un preview orthogonal (pas de diagonale)
    const override = useMemo(() => {
        if (!active) return null;

        const isEndpoint = active.index === 0 || active.index === active.basePoints.length - 1;
        if (!isEndpoint) {
            const pts = active.basePoints.map((p, i) => (i === active.index ? active.draft : p));
            return { relationId: active.relationId, points: pts };
        }

        const r0 = relations.find((r) => r.id === active.relationId);
        if (!r0) return null;

        const snapped = findNearestPort(viewsById, active.draft, PORT_HIT);

        // si on ne survole aucune anchor, on ne "tord" pas la polyline en diagonale :
        // on garde la forme originale.
        if (!snapped) {
            return { relationId: active.relationId, points: active.basePoints };
        }

        const movingFrom = active.index === 0;

        const other = movingFrom ? computeEndpoints({ ...r0, fromId: r0.fromId }, viewsById) : computeEndpoints(r0, viewsById);
        if (!other) return { relationId: active.relationId, points: active.basePoints };

        // endpoint "snap preview" sur la vraie position du port.
        const v = viewsById[snapped.id];
        if (!v) return { relationId: active.relationId, points: active.basePoints };
        const ep = portPoint(v, snapped.side);

        const a = movingFrom ? ep : other.a;
        const b = movingFrom ? other.b : ep;
        const aSide = movingFrom ? snapped.side : other.fromSide;
        const bSide = movingFrom ? other.toSide : snapped.side;

        const inner = autoOrthoRoute(a, aSide, b, bSide, AUTO_GAP);
        const pts = [a, ...inner, b];
        return { relationId: active.relationId, points: pts };
    }, [active, relations, viewsById]);

    function getEffectiveControlPoints(r: UmlRelation): RelationPoint[] {
        const ends = computeEndpoints(r, viewsById);
        if (!ends) return [];

        if (override && override.relationId === r.id) return override.points;

        const innerRaw =
            r.controlPoints && r.controlPoints.length > 0
                ? r.controlPoints
                : autoOrthoRoute(ends.a, ends.fromSide, ends.b, ends.toSide, AUTO_GAP);

        const inner = enforceEndpointPerpendicular(ends.a, ends.fromSide, ends.b, ends.toSide, innerRaw);
        return [ends.a, ...inner, ends.b];
    }

    function autoOrthoControlsWithCount(r: UmlRelation, viewsById: ViewsById, count: number): RelationPoint[] {
        const ends = computeEndpoints(r, viewsById);
        if (!ends) return [];
        const base = [ends.a, ...autoOrthoRoute(ends.a, ends.fromSide, ends.b, ends.toSide, AUTO_GAP), ends.b];
        return resampleInternalPoints(base, count);
    }

    function resampleInternalPoints(full: RelationPoint[], internalCount: number): RelationPoint[] {
        if (internalCount <= 0) return [];
        if (full.length < 2) return [];

        const segs: { a: RelationPoint; b: RelationPoint; len: number }[] = [];
        let total = 0;
        for (let i = 0; i < full.length - 1; i++) {
            const a = full[i];
            const b = full[i + 1];
            const len = dist(a, b);
            segs.push({ a, b, len });
            total += len;
        }
        if (total <= 1e-6) return [];

        const out: RelationPoint[] = [];
        for (let k = 1; k <= internalCount; k++) {
            const target = (total * k) / (internalCount + 1);
            let acc = 0;
            for (const s of segs) {
                if (acc + s.len >= target) {
                    const t = s.len <= 1e-6 ? 0 : (target - acc) / s.len;
                    out.push({ x: s.a.x + (s.b.x - s.a.x) * t, y: s.a.y + (s.b.y - s.a.y) * t });
                    break;
                }
                acc += s.len;
            }
        }
        return out;
    }

    function ensureCount(inner: RelationPoint[], r: UmlRelation, viewsById: ViewsById, desired: number): RelationPoint[] {
        const n = clampInt(desired, MIN_WP, MAX_WP);
        if (inner.length === n) return inner;

        // si le tableau est vide / cassé, on régénère une forme orthogonale.
        return autoOrthoControlsWithCount({ ...r, routingMode: "manual", controlPoints: inner }, viewsById, n);
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
