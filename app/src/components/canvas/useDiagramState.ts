import { useMemo, useState, type Dispatch, type SetStateAction } from "react";

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

    selectedId: string | null;
    setSelectedId: Dispatch<SetStateAction<string | null>>;

    selectedRelationId: string | null;
    setSelectedRelationId: Dispatch<SetStateAction<string | null>>;

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

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedRelationId, setSelectedRelationId] = useState<string | null>(null);

    const [mode, setMode] = useState<EditorMode>("select");
    const [grid, setGrid] = useState<GridState>({ enabled: true, size: 50 });

    const selectedClass = useMemo(
        () => (selectedId ? classes.find(c => c.id === selectedId) ?? null : null),
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
        selectedId,
        setSelectedId,
        selectedRelationId,
        setSelectedRelationId,
        mode,
        setMode,
        grid,
        setGrid,
        selectedClass,
        selectedView,
    };
}
