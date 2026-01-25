import type { UmlClass } from "../../../model/uml";
import type { RelationKind, UmlRelation, Cardinality } from "../../../model/relation";

export type InspectorActions = {
    // class
    applyClassEdits: (
        id: string,
        next: {
            name: string;
            stereotype: string;
            kind: "class" | "abstract" | "interface";
            attributes: string[];
            methods: string[];
        }
    ) => void;
    duplicateSelected: () => void;
    deleteSelected: () => void;

    // relation
    setRelationKindOnSelected: (kind: RelationKind) => void;
    setRelationLabelOnSelected: (label: string) => void;

    // swap from/to (inverse la direction visuelle / sémantique)
    swapRelationDirectionOnSelected: () => void;

    // waypoints (controlPoints) count
    setRelationWaypointCountOnSelected: (count: number) => void;

    // cardinality (sans ordered)
    setRelationCardinalityOnSelected: (args: { fromCardinality: Cardinality; toCardinality: Cardinality }) => void;
};

export type InspectorProps = {
    selectedClass: UmlClass | null;
    selectedRelation: UmlRelation | null;

    // multi selection (for MultiPanel)
    selectedClasses: UmlClass[];
    selectedRelations: UmlRelation[];
    actions: InspectorActions;
};
