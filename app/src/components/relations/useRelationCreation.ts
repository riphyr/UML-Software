import { useMemo, useState } from "react";
import type { PortSide, RelationKind, UmlRelation } from "../../model/relation";
import type { ViewsById } from "../../model/views";
import type { NodeView } from "../../model/view";
import { makeControlPointsWithCount } from "./routingUtils";

const DEFAULT_INTERNAL_WAYPOINTS = 2;

type Side = PortSide;

type Preview = {
    fromId: string;
    fromPort?: Side;
    toWorld: { x: number; y: number };
};

type HoverTarget =
    | {
    id: string;
    port?: Side;
}
    | null;

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

export function useRelationCreation(p: {
    viewsById: ViewsById;
    relations: UmlRelation[];
    setRelations: React.Dispatch<React.SetStateAction<UmlRelation[]>>;
    disabled: boolean;
}) {
    const { viewsById, setRelations, disabled } = p;

    const [mode, setMode] = useState(false);
    const [kind, setKind] = useState<RelationKind>("assoc");
    const [preview, setPreview] = useState<Preview | null>(null);
    const [hover, setHover] = useState<HoverTarget>(null);

    function setActive(next: boolean) {
        if (disabled) return;
        setMode(next);
        if (!next) {
            setPreview(null);
            setHover(null);
        }
    }

    function toggleMode() {
        setActive(!mode);
    }

    function cancel() {
        setHover(null);
        setActive(false);
    }

    function startFrom(id: string) {
        if (disabled) return;
        if (!mode) setMode(true);
        if (!viewsById[id]) return;
        setHover(null);
        setPreview({ fromId: id, toWorld: { x: 0, y: 0 } });
    }

    function startFromPort(id: string, port: Side) {
        if (disabled) return;
        if (!mode) setMode(true);
        if (!viewsById[id]) return;
        setHover(null);
        setPreview({ fromId: id, fromPort: port, toWorld: { x: 0, y: 0 } });
    }

    function updateToWorld(x: number, y: number) {
        if (!mode || !preview) return;
        setPreview({ ...preview, toWorld: { x, y } });
    }

    function hoverTo(id: string | null) {
        if (!mode || !preview) return;
        if (id && !viewsById[id]) return;
        if (id === preview.fromId) id = null;

        setHover((prev) => {
            if (!id) return null;
            if (prev && prev.id === id && prev.port) return prev;
            return { id };
        });
    }

    function hoverToPort(id: string | null, port?: Side) {
        if (!mode || !preview) return;

        if (!id) {
            setHover(null);
            return;
        }

        if (!viewsById[id]) return;
        if (id === preview.fromId) {
            setHover(null);
            return;
        }

        setHover({ id, port });
    }

    function clearHover() {
        setHover(null);
    }

    function commitTo(toId: string) {
        if (!mode || disabled) return;
        if (!preview) return;
        if (!viewsById[toId]) return;
        if (toId === preview.fromId) return;

        const fromView = viewsById[preview.fromId];
        const toView = viewsById[toId];
        if (!fromView || !toView) return;

        const toPort = hover && hover.id === toId ? hover.port : undefined;

        const fromSide: Side = preview.fromPort ?? chooseSide(fromView, center(toView));
        const toSide: Side = toPort ?? chooseSide(toView, center(fromView));

        const id = `rel-${Date.now()}-${Math.random().toString(16).slice(2)}`;

        const base: UmlRelation = {
            id,
            fromId: preview.fromId,
            toId,
            kind,
            label: "",
            fromPort: preview.fromPort ? fromSide : undefined,
            toPort: toPort ? toSide : undefined,
            fromPortLocked: !!preview.fromPort,
            toPortLocked: !!toPort,
            routingMode: "manual",
        };

        const withDefault: UmlRelation = {
            ...base,
            controlPoints: makeControlPointsWithCount(base, viewsById, DEFAULT_INTERNAL_WAYPOINTS),
        };

        setRelations((prev) => [...prev, withDefault]);
        setPreview(null);
        setHover(null);
    }

    function commitToPort(toId: string, port: Side) {
        if (!mode || disabled) return;
        if (!preview) return;
        if (!viewsById[toId]) return;
        if (toId === preview.fromId) return;

        const fromView = viewsById[preview.fromId];
        const toView = viewsById[toId];
        if (!fromView || !toView) return;

        const fromSide: Side = preview.fromPort ?? chooseSide(fromView, center(toView));
        const toSide: Side = port;

        const id = `rel-${Date.now()}-${Math.random().toString(16).slice(2)}`;

        const base: UmlRelation = {
            id,
            fromId: preview.fromId,
            toId,
            kind,
            label: "",
            fromPort: preview.fromPort ? fromSide : undefined,
            toPort: toSide,
            fromPortLocked: !!preview.fromPort,
            toPortLocked: true,
            routingMode: "manual",
        };

        const withDefault: UmlRelation = {
            ...base,
            controlPoints: makeControlPointsWithCount(base, viewsById, DEFAULT_INTERNAL_WAYPOINTS),
        };

        setRelations((prev) => [...prev, withDefault]);
        setPreview(null);
        setHover(null);
    }

    const previewLine = useMemo(() => {
        if (!mode || !preview) return null;

        const from = viewsById[preview.fromId];
        if (!from) return null;

        let targetPoint = preview.toWorld;
        let b = preview.toWorld;

        if (hover) {
            const to = viewsById[hover.id];
            if (to) {
                targetPoint = center(to);
                const toSide: Side = hover.port ?? chooseSide(to, center(from));
                b = portPoint(to, toSide);
            }
        }

        const fromSide: Side = preview.fromPort ?? chooseSide(from, targetPoint);
        const a = portPoint(from, fromSide);

        return { a, b };
    }, [mode, preview, hover, viewsById]);

    return {
        mode,
        kind,
        setKind,

        setActive,
        toggleMode,
        cancel,

        hasFrom: !!preview,
        fromId: preview?.fromId ?? null,

        startFrom,
        startFromPort,

        updateToWorld,

        commitTo,
        commitToPort,

        hoverTo,
        hoverToPort,
        clearHover,

        previewLine,
    };
}
