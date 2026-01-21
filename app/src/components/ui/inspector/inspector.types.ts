import type { UmlClass } from "../../../model/uml";
import type { UmlRelation, RelationKind } from "../../../model/relation";

export type InspectorActions = {
    // class
    applyClassEdits: (id: string, next: { name: string; attributes: string[]; methods: string[] }) => void;
    duplicateSelected: () => void;
    deleteSelected: () => void;

    // relation
    setRelationKindOnSelected: (kind: RelationKind) => void;
    setRelationLabelOnSelected: (label: string) => void;
};

export type InspectorProps = {
    selectedClass: UmlClass | null;
    selectedRelation: UmlRelation | null;

    // multi selection (for MultiPanel)
    selectedClasses: UmlClass[];
    selectedRelations: UmlRelation[];
    actions: InspectorActions;
};
