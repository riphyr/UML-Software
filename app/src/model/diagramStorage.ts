import { isSnapshotV1, isSnapshotV2, normalizeSnapshot, type DiagramSnapshot, type DiagramSnapshotV2 } from "./diagram";

const KEY_V2 = "uml-software:diagram:v2";
const KEY_V1 = "uml-software:diagram:v1";

export function saveDiagram(snapshot: DiagramSnapshot) {
    const norm = normalizeSnapshot(snapshot);
    localStorage.setItem(KEY_V2, JSON.stringify(norm));
}

function parse(raw: string): unknown | null {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function loadDiagram(): DiagramSnapshotV2 | null {
    // 1) essaie v2
    const raw2 = localStorage.getItem(KEY_V2);
    if (raw2) {
        const parsed2 = parse(raw2);
        if (parsed2 && isSnapshotV2(parsed2)) return normalizeSnapshot(parsed2);
    }

    // 2) fallback v1 (compat)
    const raw1 = localStorage.getItem(KEY_V1);
    if (raw1) {
        const parsed1 = parse(raw1);
        if (parsed1 && isSnapshotV1(parsed1)) return normalizeSnapshot(parsed1);
    }

    return null;
}
