export type ActivityNodeKind =
    | "action"
    | "decision"
    | "merge"
    | "fork"
    | "join"
    | "initial"
    | "final"
    | "object";

export type ActivityNodeBase = {
    id: string;
    kind: ActivityNodeKind;
    name: string; // label (vide autorisé)
};

export type ActivityNode = ActivityNodeBase;

export type ActivityFlowKind = "control" | "object";

export type ActivityFlow = {
    id: string;
    kind: ActivityFlowKind;
    fromId: string;
    toId: string;
    label: string; // texte libre
    guard: string; // ex: [x>0] (affiché si non vide)
    waypoints: { x: number; y: number }[]; // V1: vide, V2: éditable
};

export type ActivityNodeView = {
    x: number;
    y: number;
    w: number;
    h: number;
};

export type ActivityViewsById = Record<string, ActivityNodeView>;

export type ActivitySnapshotV1 = {
    version: 1;
    nodes: ActivityNode[];
    flows: ActivityFlow[];
    viewsById: ActivityViewsById;
};
