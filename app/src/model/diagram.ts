import type { UmlClass } from "./uml";
import type { NodeView } from "./view";
import type { ViewsById } from "./views";
import type { UmlRelation } from "./relation";
import { normalizeCardinality, normalizeRelationKind } from "./relation";

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

export function makeSnapshot(
    classes: UmlClass[],
    viewsById: ViewsById,
    relations: UmlRelation[] = []
): DiagramSnapshotV2 {
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
    if (o.relations !== undefined && !Array.isArray(o.relations)) return false;
    return true;
}

function normalizeClasses(classes: UmlClass[]): UmlClass[] {
    return (classes ?? [])
        .map((c) => {
            if (!c || typeof c !== "object") return null;
            const o = c as any;
            if (typeof o.id !== "string") return null;
            const name = typeof o.name === "string" ? o.name : "ClassName";

            const stereotype = typeof o.stereotype === "string" ? o.stereotype : "";
            const rawKind = typeof o.kind === "string" ? o.kind : "class";
            const kind: UmlClass["kind"] = rawKind === "abstract" || rawKind === "interface" ? rawKind : "class";

            const attributes = Array.isArray(o.attributes) ? o.attributes.filter((x: any) => typeof x === "string") : [];
            const methods = Array.isArray(o.methods) ? o.methods.filter((x: any) => typeof x === "string") : [];

            return { id: o.id, name, stereotype, kind, attributes, methods } as UmlClass;
        })
        .filter(Boolean) as UmlClass[];
}

function normalizeViews(classes: UmlClass[], viewsById: ViewsById): ViewsById {
    const ids = new Set<string>(classes.map((c) => c.id));

    const nextViews: ViewsById = {};
    for (const id of ids) {
        const v = (viewsById as any)?.[id];

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
            nextViews[id] = { id, x: 0, y: 0, width: 220, height: 140, sizeMode };
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
                ? o.controlPoints
                    .map((p: any) => {
                        if (!p || typeof p !== "object") return null;
                        if (typeof p.x !== "number" || typeof p.y !== "number") return null;
                        return { x: p.x, y: p.y };
                    })
                    .filter(Boolean)
                : undefined;

            const routingMode =
                o.routingMode === "manual" ? "manual" : o.routingMode === "auto" ? "auto" : undefined;

            const fromOrdered = typeof o.fromOrdered === "boolean" ? o.fromOrdered : undefined;
            const toOrdered = typeof o.toOrdered === "boolean" ? o.toOrdered : undefined;

            return {
                ...o,
                kind,
                controlPoints: cps,
                routingMode,
                fromCardinality: normalizeCardinality(o.fromCardinality),
                toCardinality: normalizeCardinality(o.toCardinality),
                fromOrdered,
                toOrdered,
            } as UmlRelation;
        })
        .filter(Boolean) as UmlRelation[];
}

export function normalizeSnapshot(s: DiagramSnapshot): DiagramSnapshotV2 {
    if (isSnapshotV2(s)) {
        const classes = normalizeClasses(s.classes);
        return {
            version: 2,
            classes,
            viewsById: normalizeViews(classes, s.viewsById),
            relations: normalizeRelations(classes, s.relations ?? []),
        };
    }

    // V1 -> V2
    const classes = normalizeClasses(s.classes);
    return {
        version: 2,
        classes,
        viewsById: normalizeViews(classes, s.viewsById),
        relations: [],
    };
}
