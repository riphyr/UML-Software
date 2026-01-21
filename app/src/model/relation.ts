export type RelationKind = "assoc" | "herit" | "agg" | "comp";

export type PortSide = "N" | "E" | "S" | "W";

export type RelationPoint = { x: number; y: number };

export type RelationRoutingMode = "auto" | "manual";

export type UmlRelation = {
    id: string;
    fromId: string;
    toId: string;
    kind: RelationKind;
    label?: string;

    fromPort?: PortSide;
    toPort?: PortSide;

    fromPortLocked?: boolean;
    toPortLocked?: boolean;

    // points de contrôle (coudes)
    controlPoints?: RelationPoint[];

    // Routage
    // - "auto"   : pas de controlPoints => route orthogonal auto
    // - "manual" : controlPoints fournis par l'utilisateur (peut être vide)
    // NOTE: optionnel pour compat avec les snapshots plus anciens.
    routingMode?: "auto" | "manual";
};
