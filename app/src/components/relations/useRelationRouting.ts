import { useMemo, useState } from "react";

import type { RelationPoint, UmlRelation } from "../../model/relation";
import type { ViewsById } from "../../model/views";
import type { NodeView } from "../../model/view";

type Side = "N" | "E" | "S" | "W";

type Active = {
    relationId: string;
    index: number;
    basePoints: RelationPoint[]; // matérialisés (auto si la relation n'en avait pas)
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
    return { x: v.x + v.width, y: cy }; // E
}

function sideNormal(side: Side): RelationPoint {
    if (side === "N") return { x: 0, y: -1 };
    if (side === "S") return { x: 0, y: 1 };
    if (side === "W") return { x: -1, y: 0 };
    return { x: 1, y: 0 }; // E
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

    // petit segment de sortie/entrée => garanti perpendiculaire au bord
    const exit = { x: a.x + na.x * gap, y: a.y + na.y * gap };
    const entry = { x: b.x + nb.x * gap, y: b.y + nb.y * gap };

    const pts: RelationPoint[] = [];
    pushPoint(pts, exit);

    const dx = entry.x - exit.x;
    const dy = entry.y - exit.y;

    // 0 ou 1 coude entre exit et entry
    if (Math.abs(dx) >= 0.001 && Math.abs(dy) >= 0.001) {
        const preferHFirst = Math.abs(dx) >= Math.abs(dy);
        const mid = preferHFirst
            ? { x: entry.x, y: exit.y } // horizontal puis vertical
            : { x: exit.x, y: entry.y }; // vertical puis horizontal
        pushPoint(pts, mid);
    }

    pushPoint(pts, entry);
    return pts;
}

function computeAutoControlsForRelation(
    r: UmlRelation,
    viewsById: ViewsById,
    opts: { gap: number }
): RelationPoint[] {
    const from = viewsById[r.fromId];
    const to = viewsById[r.toId];
    if (!from || !to) return [];

    const toC = center(to);
    const fromC = center(from);

    const fromSide = chooseSide(from, toC);
    const toSide = chooseSide(to, fromC);

    const a = sideMidpoint(from, fromSide);
    const b = sideMidpoint(to, toSide);

    return autoOrthoRoute(a, fromSide, b, toSide, opts.gap);
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

        const gap = grid.enabled ? Math.max(8, grid.size / 2) : 24;

        const pts =
            (r.controlPoints && r.controlPoints.length > 0)
                ? r.controlPoints
                : computeAutoControlsForRelation(r, viewsById, { gap });

        if (index < 0 || index >= pts.length) return;

        setActive({
            relationId,
            index,
            basePoints: pts,
            draft: { ...pts[index] },
        });
    }

    function updateToWorld(x: number, y: number) {
        if (grid.enabled) {
            // snap plus fin que la grille affichée : demi-case
            const step = Math.max(1, grid.size / 2);
            const sx = Math.round(x / step) * step;
            const sy = Math.round(y / step) * step;
            setActive(prev => (prev ? { ...prev, draft: { x: sx, y: sy } } : prev));
            return;
        }
        setActive(prev => (prev ? { ...prev, draft: { x, y } } : prev));
    }

    function commit() {
        if (!active || disabled) return;

        const next = active.basePoints.map((p, i) => (i === active.index ? active.draft : p));

        setRelations(prev =>
            prev.map(r => {
                if (r.id !== active.relationId) return r;
                return { ...r, controlPoints: next };
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
        if (override && override.relationId === r.id) return override.points;
        if (r.controlPoints && r.controlPoints.length > 0) return r.controlPoints;

        const gap = grid.enabled ? Math.max(8, grid.size / 2) : 24;
        return computeAutoControlsForRelation(r, viewsById, { gap });
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
