import type { DiagramSnapshotV2 } from "./diagram";
import { makeSnapshot, normalizeSnapshot } from "./diagram";

export type DiagramType = "class" | "activity" | "state" | "sequence" | "usecase";

export type UmlDocumentV1 = {
    version: 1;
    activeType: DiagramType;
    diagrams: Record<DiagramType, DiagramSnapshotV2>;
};

export type UmlDocument = UmlDocumentV1;

export const ALL_DIAGRAM_TYPES: DiagramType[] = ["class", "activity", "state", "sequence", "usecase"];

export function makeEmptyDocument(activeType: DiagramType = "class"): UmlDocumentV1 {
    const emptySnap = makeSnapshot([], {}, []);
    return {
        version: 1,
        activeType,
        diagrams: {
            class: emptySnap,
            activity: emptySnap,
            state: emptySnap,
            sequence: emptySnap,
            usecase: emptySnap,
        },
    };
}

export function isUmlDocumentV1(x: unknown): x is UmlDocumentV1 {
    if (!x || typeof x !== "object") return false;
    const o = x as any;
    if (o.version !== 1) return false;
    if (typeof o.activeType !== "string") return false;
    if (!o.diagrams || typeof o.diagrams !== "object") return false;
    return true;
}

export function normalizeDocument(doc: UmlDocument): UmlDocumentV1 {
    const base = isUmlDocumentV1(doc) ? doc : makeEmptyDocument("class");

    const diagrams: UmlDocumentV1["diagrams"] = {
        class: normalizeSnapshot((base.diagrams as any)?.class ?? makeSnapshot([], {}, [])),
        activity: normalizeSnapshot((base.diagrams as any)?.activity ?? makeSnapshot([], {}, [])),
        state: normalizeSnapshot((base.diagrams as any)?.state ?? makeSnapshot([], {}, [])),
        sequence: normalizeSnapshot((base.diagrams as any)?.sequence ?? makeSnapshot([], {}, [])),
        usecase: normalizeSnapshot((base.diagrams as any)?.usecase ?? makeSnapshot([], {}, [])),
    };

    const active = (ALL_DIAGRAM_TYPES as string[]).includes(base.activeType) ? base.activeType : "class";

    return { version: 1, activeType: active as any, diagrams };
}
