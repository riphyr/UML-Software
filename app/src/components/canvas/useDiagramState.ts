import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";

import type { UmlClass } from "../../model/uml";
import type { ViewsById } from "../../model/views";
import type { NodeView } from "../../model/view";
import type { UmlRelation } from "../../model/relation";
import type { EditorMode, GridState } from "../../model/ui";

const DEFAULT_NODE_W = 260;
const DEFAULT_NODE_H = 150;

export type DiagramStateApi = {
    classes: UmlClass[];
    setClasses: Dispatch<SetStateAction<UmlClass[]>>;

    viewsById: ViewsById;
    setViewsById: Dispatch<SetStateAction<ViewsById>>;

    relations: UmlRelation[];
    setRelations: Dispatch<SetStateAction<UmlRelation[]>>;

    // --- Selection (multi)
    selectedIds: string[]; // classes
    setSelectedIds: Dispatch<SetStateAction<string[]>>;

    selectedRelationIds: string[];
    setSelectedRelationIds: Dispatch<SetStateAction<string[]>>;

    multiSelectArmed: boolean;
    setMultiSelectArmed: Dispatch<SetStateAction<boolean>>;

    // "primary" selection (compat)
    selectedId: string | null;
    selectedRelationId: string | null;

    // helpers (single-select)
    setSelectedId: (id: string | null) => void;
    setSelectedRelationId: (id: string | null) => void;
    clearSelection: () => void;

    mode: EditorMode;
    setMode: Dispatch<SetStateAction<EditorMode>>;

    grid: GridState;
    setGrid: Dispatch<SetStateAction<GridState>>;

    selectedClass: UmlClass | null;
    selectedView: NodeView | null;
};

export function useDiagramState(): DiagramStateApi {
    const [classes, setClasses] = useState<UmlClass[]>([
        {
            id: "class-1",
            name: "ClassName",
            attributes: ["+ id: int", "- title: string"],
            methods: ["+ save(): void", "+ load(path: string): boolean"],
        },
    ]);

    const [viewsById, setViewsById] = useState<ViewsById>({
        "class-1": { id: "class-1", x: 100, y: 100, width: DEFAULT_NODE_W, height: DEFAULT_NODE_H, sizeMode: "auto" },
    });

    const [relations, setRelations] = useState<UmlRelation[]>([]);

    // multi selection
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectedRelationIds, setSelectedRelationIds] = useState<string[]>([]);

    const [multiSelectArmed, setMultiSelectArmed] = useState(false);

    const selectedId = selectedIds.length > 0 ? selectedIds[0] : null;
    const selectedRelationId = selectedRelationIds.length > 0 ? selectedRelationIds[0] : null;

    function setSelectedIdSingle(id: string | null) {
        setSelectedIds(id ? [id] : []);
        setSelectedRelationIds([]);
    }

    function setSelectedRelationIdSingle(id: string | null) {
        // IMPORTANT: clearing relation selection must NOT clear node selection.
        // Calling setSelectedRelationId(null) is common after selecting a node,
        // and clearing nodes here makes nodes "unselectable".
        if (id === null) {
            setSelectedRelationIds([]);
            return;
        }
        setSelectedRelationIds([id]);
        setSelectedIds([]);
    }

    function clearSelection() {
        setSelectedIds([]);
        setSelectedRelationIds([]);
    }

    const [mode, setMode] = useState<EditorMode>("select");
    const [grid, setGrid] = useState<GridState>({ enabled: true, size: 50 });

    useEffect(() => {
        const total = selectedIds.length + selectedRelationIds.length;

        // auto: select -> multiSelect
        if (mode === "select" && total >= 2) {
            setMultiSelectArmed(false);      // IMPORTANT: auto, pas manuel
            setMode("multiSelect");
            return;
        }

        // auto: multiSelect -> select (seulement si pas manuel)
        if (mode === "multiSelect" && !multiSelectArmed && total <= 1) {
            setMode("select");
        }
    }, [mode, multiSelectArmed, selectedIds.length, selectedRelationIds.length]);

    const selectedClass = useMemo(
        () => (selectedId ? classes.find((c) => c.id === selectedId) ?? null : null),
        [classes, selectedId]
    );

    const selectedView = useMemo(
        () => (selectedId ? viewsById[selectedId] ?? null : null),
        [viewsById, selectedId]
    );

    return {
        classes,
        setClasses,
        viewsById,
        setViewsById,
        relations,
        setRelations,

        selectedIds,
        setSelectedIds,
        selectedRelationIds,
        setSelectedRelationIds,
        multiSelectArmed,
        setMultiSelectArmed,

        selectedId,
        selectedRelationId,
        setSelectedId: setSelectedIdSingle,
        setSelectedRelationId: setSelectedRelationIdSingle,
        clearSelection,

        mode,
        setMode,
        grid,
        setGrid,
        selectedClass,
        selectedView,
    };
}
