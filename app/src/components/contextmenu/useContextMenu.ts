import { useMemo, useState } from "react";
import type { ContextAction, ContextTarget } from "./types";
import type { UmlClass } from "../../model/uml";

export function useContextMenu(params: {
    classes: UmlClass[];
    onAction: (a: ContextAction) => void;
}) {
    const { classes, onAction } = params;

    const [open, setOpen] = useState(false);
    const [x, setX] = useState(0); // screen px
    const [y, setY] = useState(0); // screen px
    const [target, setTarget] = useState<ContextTarget | null>(null);

    function show(at: { x: number; y: number }, t: ContextTarget) {
        setX(at.x);
        setY(at.y);
        setTarget(t);
        setOpen(true);
    }

    function close() {
        setOpen(false);
        setTarget(null);
    }

    const items = useMemo(() => {
        if (!target) return [];

        if (target.kind === "background") {
            return [
                {
                    label: "Créer une classe",
                    onClick: () => onAction({ type: "create_class", worldX: target.worldX, worldY: target.worldY }),
                },
            ];
        }

        const exists = classes.some((c) => c.id === target.id);

        return [
            {
                label: "Renommer",
                disabled: !exists,
                onClick: () => onAction({ type: "rename_class", id: target.id }),
            },
            {
                label: "Supprimer",
                disabled: !exists,
                onClick: () => onAction({ type: "delete_class", id: target.id }),
            },
        ];
    }, [target, classes, onAction]);

    return {
        open,
        x,
        y,
        items,
        show,
        close,
    };
}
