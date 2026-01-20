export type RelationKind = "assoc" | "herit" | "agg" | "comp";

export type RelationPoint = { x: number; y: number };

export type UmlRelation = {
    id: string;
    fromId: string;
    toId: string;
    kind: RelationKind;
    label?: string;

    // Points de contrôle (coordonnées monde). Les extrémités (anchors) ne sont pas stockées ici.
    // Si undefined ou [], on applique un routage automatique (polyline simple).
    controlPoints?: RelationPoint[];
};
