import type { ActivitySnapshotV1 } from "./activity";

export function makeEmptyActivitySnapshot(): ActivitySnapshotV1 {
    return { version: 1, nodes: [], flows: [], viewsById: {} };
}

export function normalizeActivitySnapshot(s: ActivitySnapshotV1): ActivitySnapshotV1 {
    return {
        version: 1,
        nodes: Array.isArray(s.nodes) ? s.nodes : [],
        flows: Array.isArray(s.flows) ? s.flows : [],
        viewsById: s.viewsById ?? {},
    };
}
