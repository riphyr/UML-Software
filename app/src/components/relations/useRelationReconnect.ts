import { useMemo, useState } from "react";

import type { UmlRelation } from "../../model/relation";
import type { ViewsById } from "../../model/views";
import type { NodeView } from "../../model/view";

type Active = {
    relationId: string;
    end: "from" | "to";
    fixedId: string; // l'autre extrémité (celle qui ne bouge pas)
    toWorld: { x: number; y: number };
};

function center(v: NodeView) {
    return { x: v.x + v.width / 2, y: v.y + v.height / 2 };
}

function anchorFromToPoint(from: NodeView, toPoint: { x: number; y: number }) {
    const c1 = center(from);
    const c2 = toPoint;

    const dx = c2.x - c1.x;
    const dy = c2.y - c1.y;

    const hw = from.width / 2;
    const hh = from.height / 2;

    const ax = Math.abs(dx) < 1e-6 ? 1e-6 : dx;
    const ay = Math.abs(dy) < 1e-6 ? 1e-6 : dy;

    const tx = hw / Math.abs(ax);
    const ty = hh / Math.abs(ay);
    const t = Math.min(tx, ty);

    return { x: c1.x + dx * t, y: c1.y + dy * t };
}

export function useRelationReconnect(p: {
    viewsById: ViewsById;
    relations: UmlRelation[];
    setRelations: React.Dispatch<React.SetStateAction<UmlRelation[]>>;
    disabled: boolean;
}) {
    const { viewsById, relations, setRelations, disabled } = p;

    const [active, setActive] = useState<Active | null>(null);
    const [hoverToId, setHoverToId] = useState<string | null>(null);

    function cancel() {
        setActive(null);
        setHoverToId(null);
    }

    function start(relationId: string, end: "from" | "to") {
        if (disabled) return;

        const r = relations.find(x => x.id === relationId);
        if (!r) return;

        const movingId = end === "from" ? r.fromId : r.toId;
        const fixedId = end === "from" ? r.toId : r.fromId;

        if (!viewsById[movingId] || !viewsById[fixedId]) return;

        setHoverToId(null);
        setActive({ relationId, end, fixedId, toWorld: { x: 0, y: 0 } });
    }

    function updateToWorld(x: number, y: number) {
        setActive(prev => (prev ? { ...prev, toWorld: { x, y } } : prev));
    }

    function hoverTo(id: string | null) {
        if (!active) return;
        if (id && !viewsById[id]) return;
        if (id === active.fixedId) id = null; // pas de self-loop en reconnect
        setHoverToId(id);
    }

    function clearHover() {
        setHoverToId(null);
    }

    function commitTo(toId: string) {
        if (!active || disabled) return;
        if (!viewsById[toId]) return;
        if (toId === active.fixedId) return;

        setRelations(prev =>
            prev.map(r => {
                if (r.id !== active.relationId) return r;
                if (active.end === "from") return { ...r, fromId: toId };
                return { ...r, toId: toId };
            })
        );
        cancel();
    }

    const previewLine = useMemo(() => {
        if (!active) return null;

        const fixedView = viewsById[active.fixedId];
        if (!fixedView) return null;

        const fixedAnchor = anchorFromToPoint(fixedView, active.toWorld);

        let movingPoint = active.toWorld;

        if (hoverToId) {
            const movingView = viewsById[hoverToId];
            if (movingView) {
                const fixedCenter = center(fixedView);
                movingPoint = anchorFromToPoint(movingView, fixedCenter);
            }
        }

        return { a: fixedAnchor, b: movingPoint };
    }, [active, hoverToId, viewsById]);

    return {
        active,
        isActive: !!active,
        relationId: active?.relationId ?? null,
        end: active?.end ?? null,

        start,
        cancel,
        updateToWorld,
        hoverTo,
        clearHover,
        commitTo, // <-- FIX
        hoverToId,
        previewLine,
    };
}
