import { useMemo, useState } from "react";
import type { RelationKind, UmlRelation } from "../../model/relation";
import type { ViewsById } from "../../model/views";
import type { NodeView } from "../../model/view";

type Preview = {
    fromId: string;
    toWorld: { x: number; y: number };
};

function center(v: NodeView) {
    return { x: v.x + v.width / 2, y: v.y + v.height / 2 };
}

type Side = "N" | "E" | "S" | "W";

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
    const [hoverToId, setHoverToId] = useState<string | null>(null);

    function setActive(next: boolean) {
        if (disabled) return;
        setMode(next);
        if (!next) setPreview(null);
    }

    function toggleMode() {
        setActive(!mode);
    }

    function cancel() {
        setHoverToId(null);
        setActive(false);
    }

    function startFrom(id: string) {
        if (!mode || disabled) return;
        if (!viewsById[id]) return;
        setHoverToId(null);
        setPreview({ fromId: id, toWorld: { x: 0, y: 0 } });
    }

    function updateToWorld(x: number, y: number) {
        if (!mode || !preview) return;
        setPreview({ ...preview, toWorld: { x, y } });
    }

    function hoverTo(id: string | null) {
        if (!mode || !preview) return;
        if (id && !viewsById[id]) return;
        if (id === preview.fromId) id = null;
        setHoverToId(id);
    }

    function clearHover() {
        setHoverToId(null);
    }

    function commitTo(toId: string) {
        if (!mode || disabled) return;
        if (!preview) return;
        if (!viewsById[toId]) return;
        if (toId === preview.fromId) return;

        const id = `rel-${Date.now()}-${Math.random().toString(16).slice(2)}`;

        const r: UmlRelation = {
            id,
            fromId: preview.fromId,
            toId,
            kind,
            label: "",
        };

        setRelations(prev => [...prev, r]);
        setPreview(null);
        setHoverToId(null);
    }

    const previewLine = useMemo(() => {
        if (!mode || !preview) return null;

        const from = viewsById[preview.fromId];
        if (!from) return null;

        const hoverTo = hoverToId ? viewsById[hoverToId] : null;
        const targetPoint = hoverTo ? center(hoverTo) : preview.toWorld;

        const fromSide = chooseSide(from, targetPoint);
        const a = sideMidpoint(from, fromSide);

        let b = preview.toWorld;
        if (hoverTo) {
            const toSide = chooseSide(hoverTo, center(from));
            b = sideMidpoint(hoverTo, toSide);
        }

        return { a, b };
    }, [mode, preview, viewsById, hoverToId]);

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
        updateToWorld,
        commitTo,

        hoverTo,
        clearHover,

        previewLine,
    };
}
