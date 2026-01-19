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

    function toggleMode() {
        if (disabled) return;
        setMode(v => !v);
        setPreview(null);
    }

    function cancel() {
        setMode(false);
        setPreview(null);
    }

    function startFrom(id: string) {
        if (!mode || disabled) return;
        if (!viewsById[id]) return;
        setPreview({ fromId: id, toWorld: { x: 0, y: 0 } });
    }

    function updateToWorld(x: number, y: number) {
        if (!mode || !preview) return;
        setPreview({ ...preview, toWorld: { x, y } });
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
    }

    const previewLine = useMemo(() => {
        if (!mode || !preview) return null;
        const from = viewsById[preview.fromId];
        if (!from) return null;
        const a = anchorFromToPoint(from, preview.toWorld);
        const b = preview.toWorld;
        return { a, b };
    }, [mode, preview, viewsById]);

    return {
        mode,
        kind,
        setKind,

        toggleMode,
        cancel,

        hasFrom: !!preview,
        fromId: preview?.fromId ?? null,

        startFrom,
        updateToWorld,
        commitTo,

        previewLine,
    };
}
