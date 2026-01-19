import type { UmlClass } from "./uml";
import type { NodeView } from "./view";
import type { ViewsById } from "./views";
import type { UmlRelation } from "./relation";

export type DiagramSnapshotV1 = {
    version: 1;
    classes: UmlClass[];
    viewsById: ViewsById;
};

export type DiagramSnapshotV2 = {
    version: 2;
    classes: UmlClass[];
    viewsById: ViewsById;
    relations: UmlRelation[];
};

export type DiagramSnapshot = DiagramSnapshotV1 | DiagramSnapshotV2;

// ✅ rétro-compatible : les anciens appels makeSnapshot(classes, viewsById) continuent de compiler
export function makeSnapshot(classes: UmlClass[], viewsById: ViewsById, relations: UmlRelation[] = []): DiagramSnapshotV2 {
    return { version: 2, classes, viewsById, relations };
}

export function isSnapshotV1(x: unknown): x is DiagramSnapshotV1 {
    if (!x || typeof x !== "object") return false;
    const o = x as any;
    if (o.version !== 1) return false;
    if (!Array.isArray(o.classes)) return false;
    if (!o.viewsById || typeof o.viewsById !== "object") return false;
    return true;
}

export function isSnapshotV2(x: unknown): x is DiagramSnapshotV2 {
    if (!x || typeof x !== "object") return false;
    const o = x as any;
    if (o.version !== 2) return false;
    if (!Array.isArray(o.classes)) return false;
    if (!o.viewsById || typeof o.viewsById !== "object") return false;
    if (!Array.isArray(o.relations)) return false;
    return true;
}

function normalizeViews(classes: UmlClass[], viewsById: ViewsById): ViewsById {
    const ids = new Set<string>(classes.map(c => c.id));

    const nextViews: ViewsById = {};
    for (const id of ids) {
        const v = (viewsById as any)[id] as NodeView | undefined;
        if (
            v &&
            typeof v.x === "number" &&
            typeof v.y === "number" &&
            typeof v.width === "number" &&
            typeof v.height === "number"
        ) {
            nextViews[id] = v;
        } else {
            nextViews[id] = { id, x: 100, y: 100, width: 260, height: 150 };
        }
    }
    return nextViews;
}

function normalizeRelations(classes: UmlClass[], relations: UmlRelation[]): UmlRelation[] {
    const ids = new Set<string>(classes.map(c => c.id));
    return (relations ?? []).filter(r => {
        if (!r || typeof r !== "object") return false;
        if (typeof r.id !== "string") return false;
        if (typeof r.fromId !== "string" || typeof r.toId !== "string") return false;
        if (!ids.has(r.fromId) || !ids.has(r.toId)) return false;
        if (r.fromId === r.toId) return false;
        return true;
    });
}

export function normalizeSnapshot(s: DiagramSnapshot): DiagramSnapshotV2 {
    if (isSnapshotV1(s)) {
        const views = normalizeViews(s.classes ?? [], s.viewsById ?? {});
        return {
            version: 2,
            classes: s.classes ?? [],
            viewsById: views,
            relations: [],
        };
    }

    if (isSnapshotV2(s)) {
        const classes = s.classes ?? [];
        const views = normalizeViews(classes, s.viewsById ?? {});
        const relations = normalizeRelations(classes, s.relations ?? []);
        return {
            version: 2,
            classes,
            viewsById: views,
            relations,
        };
    }

    // si un jour on tombe sur un truc corrompu : état vide mais valide
    return {
        version: 2,
        classes: [],
        viewsById: {},
        relations: [],
    };
}
