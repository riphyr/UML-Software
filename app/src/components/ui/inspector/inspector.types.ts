import type { UmlClass } from "../../../model/uml";
import type { RelationKind, UmlRelation } from "../../../model/relation";

export type InspectorActions = {
    // class
    applyClassEdits: (id: string, next: { name: string; attributes: string[]; methods: string[] }) => void;
    duplicateSelected: () => void;
    deleteSelected: () => void;

    // relation
    setRelationKindOnSelected: (kind: RelationKind) => void;
    setRelationLabelOnSelected: (label: string) => void;

    // swap from/to (inverse la direction visuelle / sémantique)
    swapRelationDirectionOnSelected: () => void;

    // NEW: waypoints (controlPoints) count (0 = straight)
    setRelationWaypointCountOnSelected: (count: number) => void;
};

export type InspectorProps = {
    selectedClass: UmlClass | null;
    selectedRelation: UmlRelation | null;

    // multi selection (for MultiPanel)
    selectedClasses: UmlClass[];
    selectedRelations: UmlRelation[];
    actions: InspectorActions;
};
