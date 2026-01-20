import { useMemo, useState } from "react";

import type { PortSide, UmlRelation } from "../../model/relation";
import type { ViewsById } from "../../model/views";
import type { NodeView } from "../../model/view";

type Side = PortSide;

type Active = {
    relationId: string;
    end: "from" | "to";

    fixedId: string; // l'autre extrémité (celle qui ne bouge pas)
    fixedPort?: Side;

    toWorld: { x: number; y: number };
};

type HoverTarget = {
    id: string;
    port?: Side;
} | null;

const ANCHOR_OFFSET = 10;

function center(v: NodeView) {
    return { x: v.x + v.width / 2, y: v.y + v.height / 2 };
}

function chooseSide(from: NodeView, toPoint: { x: number; y: number }): Side {
    const c = center(from);
    const dx = toPoint.x - c.x;
    const dy = toPoint.y - c.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "E" : "W";
    return dy >= 0 ? "S" : "N";
}

function sideMidpoint(v: NodeView, side: Side) {
    const cx = v.x + v.width / 2;
    const cy = v.y + v.height / 2;
    if (side === "N") return { x: cx, y: v.y };
    if (side === "S") return { x: cx, y: v.y + v.height };
    if (side === "W") return { x: v.x, y: cy };
    return { x: v.x + v.width, y: cy }; // E
}

function sideNormal(side: Side) {
    if (side === "N") return { x: 0, y: -1 };
    if (side === "S") return { x: 0, y: 1 };
    if (side === "W") return { x: -1, y: 0 };
    return { x: 1, y: 0 };
}

function portPoint(v: NodeView, side: Side, offset = ANCHOR_OFFSET) {
    const m = sideMidpoint(v, side);
    const n = sideNormal(side);
    return { x: m.x + n.x * offset, y: m.y + n.y * offset };
}

export function useRelationReconnect(p: {
    viewsById: ViewsById;
    relations: UmlRelation[];
    setRelations: React.Dispatch<React.SetStateAction<UmlRelation[]>>;
    disabled: boolean;
}) {
    const { viewsById, relations, setRelations, disabled } = p;

    const [active, setActive] = useState<Active | null>(null);
    const [hover, setHover] = useState<HoverTarget>(null);

    function cancel() {
        setActive(null);
        setHover(null);
    }

    function start(relationId: string, end: "from" | "to") {
        if (disabled) return;

        const r = relations.find(x => x.id === relationId);
        if (!r) return;

        const movingId = end === "from" ? r.fromId : r.toId;
        const fixedId = end === "from" ? r.toId : r.fromId;

        if (!viewsById[movingId] || !viewsById[fixedId]) return;

        const fixedPort = end === "from" ? r.toPort : r.fromPort;

        setHover(null);
        setActive({ relationId, end, fixedId, fixedPort, toWorld: { x: 0, y: 0 } });
    }

    function updateToWorld(x: number, y: number) {
        setActive(prev => (prev ? { ...prev, toWorld: { x, y } } : prev));
    }

    function hoverTo(id: string | null) {
        if (!active) return;
        if (id && !viewsById[id]) return;
        if (id === active.fixedId) id = null; // pas de self-loop en reconnect
        setHover(id ? { id } : null);
    }

    function hoverToPort(id: string | null, port?: Side) {
        if (!active) return;
        if (id && !viewsById[id]) return;
        if (!id) {
            setHover(null);
            return;
        }
        if (id === active.fixedId) {
            setHover(null);
            return;
        }
        setHover({ id, port });
    }

    function clearHover() {
        setHover(null);
    }

    function commitTo(toId: string) {
        if (!active || disabled) return;
        if (!viewsById[toId]) return;
        if (toId === active.fixedId) return;

        const toPort = (hover && hover.id === toId ? hover.port : undefined);

        setRelations(prev =>
            prev.map(r => {
                if (r.id !== active.relationId) return r;
                if (active.end === "from") return { ...r, fromId: toId, fromPort: toPort };
                return { ...r, toId: toId, toPort: toPort };
            })
        );
        cancel();
    }

    function commitToPort(toId: string, port: Side) {
        if (!active || disabled) return;
        if (!viewsById[toId]) return;
        if (toId === active.fixedId) return;

        setRelations(prev =>
            prev.map(r => {
                if (r.id !== active.relationId) return r;
                if (active.end === "from") return { ...r, fromId: toId, fromPort: port };
                return { ...r, toId: toId, toPort: port };
            })
        );
        cancel();
    }

    const previewLine = useMemo(() => {
        if (!active) return null;

        const fixedView = viewsById[active.fixedId];
        if (!fixedView) return null;

        // fixe : respecte le port si défini, sinon auto
        const fixedSide: Side = active.fixedPort ?? chooseSide(fixedView, active.toWorld);
        const fixedAnchor = portPoint(fixedView, fixedSide);

        let movingPoint = active.toWorld;

        if (hover) {
            const movingView = viewsById[hover.id];
            if (movingView) {
                const movingSide: Side = hover.port ?? chooseSide(movingView, center(fixedView));
                movingPoint = portPoint(movingView, movingSide);
            }
        }

        return { a: fixedAnchor, b: movingPoint };
    }, [active, hover, viewsById]);

    return {
        active,
        isActive: !!active,
        relationId: active?.relationId ?? null,
        end: active?.end ?? null,

        start,
        cancel,
        updateToWorld,

        hoverTo,
        hoverToPort,
        clearHover,

        commitTo,
        commitToPort,

        previewLine,
    };
}
