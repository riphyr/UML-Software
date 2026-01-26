import { useMemo, useState } from "react";
import type { ActivityViewsById } from "../../../model/activity/activity";
import { chooseSide, portPoint } from "../nodes/ports";

export function useActivityLinkCreation(p: {
    viewsById: ActivityViewsById;
    kind: "control" | "object";
}) {
    const [active, setActive] = useState(false);
    const [fromId, setFromId] = useState<string | null>(null);
    const [toWorld, setToWorld] = useState<{ x: number; y: number } | null>(null);

    const previewLine = useMemo(() => {
        if (!active || !fromId || !toWorld) return null;
        const fromV = p.viewsById[fromId];
        if (!fromV) return null;

        const side = chooseSide(fromV, toWorld);
        const a = portPoint(fromV, side, 10);
        const b = toWorld;
        return { a, b };
    }, [active, fromId, toWorld, p.viewsById]);

    function start(from: string) {
        setActive(true);
        setFromId(from);
    }

    function cancel() {
        setActive(false);
        setFromId(null);
        setToWorld(null);
    }

    return {
        kind: p.kind,
        active,
        fromId,
        toWorld,
        setToWorld,
        previewLine,
        start,
        cancel,
    };
}
