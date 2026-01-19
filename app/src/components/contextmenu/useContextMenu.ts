import { useMemo, useState } from "react";
import type { ContextAction, ContextTarget } from "./types";
import type { UmlClass } from "../../model/uml";
import type { UmlRelation } from "../../model/relation";

export function useContextMenu(params: {
    classes: UmlClass[];
    relations: UmlRelation[];
    onAction: (a: ContextAction) => void;
}) {
    const { classes, relations, onAction } = params;

    const [open, setOpen] = useState(false);
    const [x, setX] = useState(0);
    const [y, setY] = useState(0);
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
                { label: "—", disabled: true, onClick: () => {} },

                { label: "Exporter… (Ctrl+S)", onClick: () => onAction({ type: "export_diagram" }) },
                { label: "Importer… (Ctrl+O)", onClick: () => onAction({ type: "import_diagram" }) },

                { label: "—", disabled: true, onClick: () => {} },

                { label: "Sauvegarder (local)", onClick: () => onAction({ type: "save_diagram" }) },
                { label: "Charger (local)", onClick: () => onAction({ type: "load_diagram" }) },
            ];
        }

        if (target.kind === "class") {
            const exists = classes.some((c) => c.id === target.id);
            return [
                { label: "Dupliquer", disabled: !exists, onClick: () => onAction({ type: "duplicate_class", id: target.id }) },
                { label: "Renommer", disabled: !exists, onClick: () => onAction({ type: "rename_class", id: target.id }) },
                { label: "Ajouter un attribut", disabled: !exists, onClick: () => onAction({ type: "add_attribute", id: target.id }) },
                { label: "Ajouter une méthode", disabled: !exists, onClick: () => onAction({ type: "add_method", id: target.id }) },
                { label: "Supprimer", disabled: !exists, onClick: () => onAction({ type: "delete_class", id: target.id }) },
            ];
        }

        const exists = relations.some((r) => r.id === target.id);
        return [
            { label: "Label… (L)", disabled: !exists, onClick: () => onAction({ type: "edit_relation_label", id: target.id }) },
            { label: "—", disabled: true, onClick: () => {} },
            { label: "Type : Association (1)", disabled: !exists, onClick: () => onAction({ type: "set_relation_kind", id: target.id, kind: "assoc" }) },
            { label: "Type : Héritage (2)", disabled: !exists, onClick: () => onAction({ type: "set_relation_kind", id: target.id, kind: "herit" }) },
            { label: "Type : Agrégation (3)", disabled: !exists, onClick: () => onAction({ type: "set_relation_kind", id: target.id, kind: "agg" }) },
            { label: "Type : Composition (4)", disabled: !exists, onClick: () => onAction({ type: "set_relation_kind", id: target.id, kind: "comp" }) },
            { label: "—", disabled: true, onClick: () => {} },
            { label: "Supprimer", disabled: !exists, onClick: () => onAction({ type: "delete_relation", id: target.id }) },
        ];
    }, [target, classes, relations, onAction]);

    return { open, x, y, items, show, close };
}
