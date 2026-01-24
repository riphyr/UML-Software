export type RelationKind =
    | "assoc"
    | "inherit"
    | "realize"
    | "depend"
    | "agg"
    | "comp"
    // legacy
    | "herit";

export type PortSide = "N" | "E" | "S" | "W";

export type RelationPoint = { x: number; y: number };

export type RelationRoutingMode = "auto" | "manual";

export type Cardinality = "" | "1" | "0..1" | "0..*" | "1..*";

export function normalizeCardinality(x: unknown): Cardinality {
    if (x === "" || x === "1" || x === "0..1" || x === "0..*" || x === "1..*") return x;
    return "";
}

export function normalizeRelationKind(x: unknown): RelationKind {
    const k = typeof x === "string" ? x : "";
    switch (k) {
        case "inherit":
        case "realize":
        case "depend":
        case "agg":
        case "comp":
        case "assoc":
            return k;
        // legacy
        case "herit":
            return "inherit";
        default:
            return "assoc";
    }
}

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

    controlPoints?: RelationPoint[];
    routingMode?: RelationRoutingMode;

    // Cardinalité par extrémité
    fromCardinality?: Cardinality;
    toCardinality?: Cardinality;

    // Indicateur UML "{ordered}" par extrémité
    fromOrdered?: boolean;
    toOrdered?: boolean;
};

const ARROW_LEN = 14;
const ARROW_W = 12;

const TRI_LEN = 16;
const TRI_W = 14;

const DIA_LEN = 16;
const DIA_W = 12;

export function getRelationRenderSpec(kind: RelationKind): {
    dashed: boolean;
    marker:
        | { type: "none" }
        | { type: "arrow-open"; pad: number; len: number; width: number }
        | { type: "triangle-hollow"; pad: number; len: number; width: number }
        | { type: "diamond-hollow"; pad: number; len: number; width: number }
        | { type: "diamond-filled"; pad: number; len: number; width: number };
} {
    switch (kind) {
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
                marker: { type: "arrow-open", pad: ARROW_LEN, len: ARROW_LEN, width: ARROW_W },
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
