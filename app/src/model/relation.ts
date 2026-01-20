export type RelationKind = "assoc" | "herit" | "agg" | "comp";

export type PortSide = "N" | "E" | "S" | "W";

export type RelationPoint = { x: number; y: number };

export type UmlRelation = {
    id: string;
    fromId: string;
    toId: string;
    kind: RelationKind;
    label?: string;

    // ports fixes (N/E/S/W) optionnels
    fromPort?: PortSide;
    toPort?: PortSide;

    // Verrouillage explicite des ports.
    // - true  : port choisi manuellement (via + ou relocalisation) => ne bouge pas.
    // - false/undefined : port auto => recalcule selon la geometrie.
    fromPortLocked?: boolean;
    toPortLocked?: boolean;

    // points de contrôle (coudes)
    controlPoints?: RelationPoint[];
};
