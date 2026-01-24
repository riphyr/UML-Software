export type RelationKind =
    | "assoc"
    | "inherit"
    | "realize"
    | "depend"
    | "agg"
    | "comp"
    // legacy (anciens diagrammes)
    | "herit";

export type PortSide = "N" | "E" | "S" | "W";

export type RelationPoint = { x: number; y: number };

export type RelationRoutingMode = "auto" | "manual";

export type UmlRelation = {
    id: string;
    fromId: string;
    toId: string;

    // NOTE: "herit" accepté pour compat, normalisé en "inherit" au load.
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
    routingMode?: RelationRoutingMode;
};

export type RelationMarker =
    | { type: "none" }
    | { type: "triangle-hollow"; pad: number; len: number; width: number }
    | { type: "arrow-open"; pad: number; len: number; width: number }
    | { type: "diamond-hollow"; pad: number; len: number; width: number }
    | { type: "diamond-filled"; pad: number; len: number; width: number };

export type RelationRenderSpec = {
    dashed: boolean;
    marker: RelationMarker;
};

export function normalizeRelationKind(k: unknown): Exclude<RelationKind, "herit"> {
    const s = typeof k === "string" ? k : "";
    if (s === "herit") return "inherit";
    if (s === "inherit") return "inherit";
    if (s === "assoc") return "assoc";
    if (s === "realize") return "realize";
    if (s === "depend") return "depend";
    if (s === "agg") return "agg";
    if (s === "comp") return "comp";
    return "assoc";
}

export function getRelationRenderSpec(kind: RelationKind): RelationRenderSpec {
    const k = kind === "herit" ? "inherit" : kind;

    // tailles visuelles (px)
    const TRI_LEN = 16;
    const TRI_W = 14;

    const ARR_LEN = 14;
    const ARR_W = 12;

    const DIA_LEN = 18;
    const DIA_W = 14;

    switch (k) {
        case "inherit":
            return {
                dashed: false,
                marker: { type: "triangle-hollow", pad: TRI_LEN, len: TRI_LEN, width: TRI_W },
            };
        case "realize":
            return {
                dashed: true,
                marker: { type: "triangle-hollow", pad: TRI_LEN, len: TRI_LEN, width: TRI_W },
            };
        case "depend":
            return {
                dashed: true,
                marker: { type: "arrow-open", pad: ARR_LEN, len: ARR_LEN, width: ARR_W },
            };
        case "agg":
            return {
                dashed: false,
                marker: { type: "diamond-hollow", pad: DIA_LEN, len: DIA_LEN, width: DIA_W },
            };
        case "comp":
            return {
                dashed: false,
                marker: { type: "diamond-filled", pad: DIA_LEN, len: DIA_LEN, width: DIA_W },
            };
        case "assoc":
        default:
            return { dashed: false, marker: { type: "none" } };
    }
}
