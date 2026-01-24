import type { UmlClass } from "./uml";
import type { NodeView } from "./view";
import type { ViewsById } from "./views";
import type { UmlRelation } from "./relation";
import { normalizeRelationKind } from "./relation";

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

// rétro-compatible : makeSnapshot(classes, viewsById) marche encore
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

    // IMPORTANT: compat — certains v2 historiques/imports peuvent ne pas avoir "relations"
    if (o.relations !== undefined && !Array.isArray(o.relations)) return false;

    return true;
}

function normalizeViews(classes: UmlClass[], viewsById: ViewsById): ViewsById {
    const ids = new Set<string>(classes.map((c) => c.id));

    const nextViews: ViewsById = {};
    for (const id of ids) {
        const v = (viewsById as any)[id] as NodeView | undefined;

        const validBox =
            v &&
            typeof v.x === "number" &&
            typeof v.y === "number" &&
            typeof v.width === "number" &&
            typeof v.height === "number";

        const rawMode = (v as any)?.sizeMode;
        const sizeMode: NodeView["sizeMode"] = rawMode === "locked" ? "locked" : "auto";

        if (validBox) {
            nextViews[id] = { ...v, sizeMode };
        } else {
            nextViews[id] = { id, x: 100, y: 100, width: 260, height: 150, sizeMode: "auto" };
        }
    }
    return nextViews;
}

function normalizeRelations(classes: UmlClass[], relations: UmlRelation[]): UmlRelation[] {
    const ids = new Set<string>(classes.map((c) => c.id));

    return (relations ?? [])
        .map((r) => {
            if (!r || typeof r !== "object") return null;
            const o = r as any;

            if (typeof o.id !== "string") return null;
            if (typeof o.fromId !== "string" || typeof o.toId !== "string") return null;
            if (!ids.has(o.fromId) || !ids.has(o.toId)) return null;
            if (o.fromId === o.toId) return null;

            const kind = normalizeRelationKind(o.kind);

            const cps = Array.isArray(o.controlPoints)
                ? o.controlPoints.filter((p: any) => p && typeof p.x === "number" && typeof p.y === "number")
                : undefined;

            const routingMode =
                o.routingMode === "manual" ? "manual" : o.routingMode === "auto" ? "auto" : undefined;

            const next: UmlRelation = {
                ...o,
                kind,
                controlPoints: cps,
                routingMode,
            };

            return next;
        })
        .filter(Boolean) as UmlRelation[];
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
        const relations = normalizeRelations(classes, (s as any).relations ?? []);
        return {
            version: 2,
            classes,
            viewsById: views,
            relations,
        };
    }

    return {
        version: 2,
        classes: [],
        viewsById: {},
        relations: [],
    };
}
