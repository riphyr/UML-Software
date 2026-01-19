export type RelationKind = "assoc" | "herit" | "agg" | "comp";

export type UmlRelation = {
    id: string;
    fromId: string;
    toId: string;
    kind: RelationKind;
    label?: string;
};
