import type { UmlClass } from "../../model/uml";
import type { NodeView } from "../../model/view";
import type { Cardinality, UmlRelation } from "../../model/relation";
import { makeControlPointsWithCount } from "../relations/routingUtils";

import type { ContextAction } from "../contextmenu/types";

import type { DiagramSnapshotV2 } from "../../model/diagram";
import { makeSnapshot } from "../../model/diagram";

import type { DiagramStateApi } from "./useDiagramState";

import { addView, removeView, updateView } from "../../model/views";
import type { GridState } from "../../model/ui";
import { applyAutoSizeIfNeeded, computeAutoSize } from "../nodes/autoSize";

type UndoApi = {
    pushSnapshot: (s?: DiagramSnapshotV2) => void;
};

type EditApi = {
    editingName: boolean;
    isEditingLine: boolean;
    editingAttrIndex: number | null;
    editingMethodIndex: number | null;
    editBuffer: string;
    nameBuffer: string;

    startEditName: () => void;
    startEditAttribute: (i: number) => void;
    startEditMethod: (i: number) => void;

    cancelLineEdit: () => void;
    cancelNameEdit: () => void;
    commitLineEdit: () => void;
    commitNameEdit: () => void;

    setNameBuffer: (v: string) => void;
    setEditBuffer: (v: string) => void;
};

type RelationApi = {
    mode: boolean;
    setKind: (k: UmlRelation["kind"]) => void;
    cancel: () => void;
};

type CtxMenuApi = { close: () => void };

type PersistenceApi = {
    saveLocal: () => void;
    loadLocal: () => void;
    exportFile: () => Promise<void>;
    importFile: () => Promise<void>;
};

function newId() {
    return `class-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useDiagramActions(args: {
    state: DiagramStateApi;
    undo: UndoApi;
    edit: EditApi;
    rel: RelationApi;
    ctxMenu: CtxMenuApi;
    persistence: PersistenceApi;
    grid: GridState;
}) {
    const { state, undo, edit, rel, ctxMenu, persistence, grid } = args;

    const {
        classes,
        setClasses,
        viewsById,
        setViewsById,
        relations,
        setRelations,

        // mono (primaire)
        selectedId,
        setSelectedId,
        selectedRelationId,
        setSelectedRelationId,

        // multi (réel)
        selectedIds,
        setSelectedIds,
        selectedRelationIds,
        setSelectedRelationIds,
        clearSelection,
    } = state;

    function getClassById(id: string) {
        return classes.find((c) => c.id === id) ?? null;
    }

    function applyClassEdits(id: string, next: { name: string; attributes: string[]; methods: string[] }) {
        undo.pushSnapshot();

        setClasses((prev: UmlClass[]) =>
            prev.map((c) =>
                c.id === id ? { ...c, name: next.name, attributes: next.attributes, methods: next.methods } : c
            )
        );

        setViewsById((prev) => {
            const patch = applyAutoSizeIfNeeded({
                view: prev[id],
                nextClass: { id, name: next.name, attributes: next.attributes, methods: next.methods },
                grid,
            });

            return patch ? updateView(prev, id, patch) : prev;
        });
    }

    function applyAutoSizeForClassIfNeeded(id: string, nextClass: UmlClass) {
        setViewsById((prev) => {
            const v = prev[id];
            if (!v) return prev;

            const mode = v.sizeMode ?? "auto";
            if (mode !== "auto") return prev;

            const { width, height } = computeAutoSize(nextClass, grid);
            return updateView(prev, id, { width, height });
        });
    }

    function setClassSizeMode(id: string, mode: "auto" | "locked") {
        undo.pushSnapshot();
        setViewsById((prev) => updateView(prev, id, { sizeMode: mode }));
    }

    function toggleClassSizeMode(id: string) {
        const v = viewsById[id];
        const mode = (v?.sizeMode ?? "auto") === "locked" ? "auto" : "locked";
        setClassSizeMode(id, mode);
    }

    function createClassAtWorld(worldX: number, worldY: number) {
        const id = newId();

        const newClass: UmlClass = {
            id,
            name: "NewClass",
            attributes: ["+ attr: Type"],
            methods: ["+ method(): Return"],
        };

        const size = computeAutoSize(newClass, grid);

        const newView: NodeView = {
            id,
            x: worldX,
            y: worldY,
            width: size.width,
            height: size.height,
            sizeMode: "auto",
        };

        setClasses([...classes, newClass]);
        setViewsById((prev) => addView(prev, newView));

        // sélection mono (helper) => aligne aussi multi
        setSelectedId(id);
        setSelectedRelationId(null);

        edit.cancelNameEdit();
        edit.cancelLineEdit();
    }

    function deleteSelectedClass(id: string) {
        edit.commitLineEdit();
        edit.commitNameEdit();

        setClasses(classes.filter((c) => c.id !== id));
        setViewsById((prev) => removeView(prev, id));

        // purge relations liées
        setRelations(relations.filter((r) => r.fromId !== id && r.toId !== id));

        if (selectedId === id) setSelectedId(null);
        setSelectedRelationId(null);
        setSelectedIds((prev: string[]) => prev.filter((x) => x !== id));
        // relations multi: on laisse, elles seront purgées si orphelines (déjà filtrées)
    }

    function deleteSelected() {
        const nodeIds = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
        const relIds =
            selectedRelationIds.length > 0 ? selectedRelationIds : selectedRelationId ? [selectedRelationId] : [];
        if (nodeIds.length === 0 && relIds.length === 0) return;

        undo.pushSnapshot();

        edit.commitLineEdit();
        edit.commitNameEdit();

        const nodeSet = new Set(nodeIds);
        const relSet = new Set(relIds);

        if (nodeIds.length > 0) {
            setClasses((prev: UmlClass[]) => prev.filter((c) => !nodeSet.has(c.id)));
            setViewsById((prev) => {
                let next = prev;
                for (const id of nodeIds) next = removeView(next, id);
                return next;
            });
        }

        setRelations((prev: UmlRelation[]) =>
            prev.filter((r) => {
                if (relSet.has(r.id)) return false;
                if (nodeSet.has(r.fromId) || nodeSet.has(r.toId)) return false;
                return true;
            })
        );

        clearSelection();
    }

    function setRelationKindOnSelected(kind: UmlRelation["kind"]) {
        if (!selectedRelationId) return;
        undo.pushSnapshot();
        setRelations((prev) => prev.map((r) => (r.id === selectedRelationId ? { ...r, kind } : r)));
    }

    function editSelectedRelationLabel() {
        if (!selectedRelationId) return;

        const r = relations.find((x) => x.id === selectedRelationId);
        if (!r) return;

        const next = window.prompt("Relation label:", r.label ?? "");
        if (next === null) return;

        undo.pushSnapshot();
        setRelations((prev) => prev.map((x) => (x.id === selectedRelationId ? { ...x, label: next } : x)));
    }

    function onContextAction(a: ContextAction) {
        if (a.type === "create_class") {
            undo.pushSnapshot();
            createClassAtWorld(a.worldX, a.worldY);
            return;
        }

        if (a.type === "delete_class") {
            undo.pushSnapshot();
            deleteSelectedClass(a.id);
            return;
        }

        if (a.type === "rename_class") {
            undo.pushSnapshot();
            setSelectedId(a.id);
            setSelectedRelationId(null);
            edit.startEditName();
            return;
        }

        if (a.type === "add_attribute") {
            undo.pushSnapshot();

            const c = getClassById(a.id);
            if (!c) return;

            const newIndex = c.attributes.length;

            setSelectedId(a.id);
            setSelectedRelationId(null);

            const nextClass: UmlClass = { ...c, attributes: [...c.attributes, "+ attr: Type"] };
            setClasses(classes.map((cc) => (cc.id === a.id ? nextClass : cc)));
            applyAutoSizeForClassIfNeeded(a.id, nextClass);

            requestAnimationFrame(() => edit.startEditAttribute(newIndex));
            return;
        }

        if (a.type === "add_method") {
            undo.pushSnapshot();

            const c = getClassById(a.id);
            if (!c) return;

            const newIndex = c.methods.length;

            setSelectedId(a.id);
            setSelectedRelationId(null);

            const nextClass: UmlClass = { ...c, methods: [...c.methods, "+ method(): Return"] };
            setClasses(classes.map((cc) => (cc.id === a.id ? nextClass : cc)));
            applyAutoSizeForClassIfNeeded(a.id, nextClass);

            requestAnimationFrame(() => edit.startEditMethod(newIndex));
            return;
        }

        if (a.type === "duplicate_class") {
            undo.pushSnapshot();

            const src = classes.find((c) => c.id === a.id);
            const v = viewsById[a.id];
            if (!src || !v) return;

            const id = crypto.randomUUID();

            const copy: UmlClass = {
                ...src,
                id,
                name: `${src.name}Copy`,
            };

            const viewCopy: NodeView = {
                ...v,
                id,
                x: v.x + 20,
                y: v.y + 20,
            };

            setClasses([...classes, copy]);
            setViewsById((prev) => ({ ...prev, [id]: viewCopy }));
            setSelectedId(id);
            setSelectedRelationId(null);
            return;
        }

        if (a.type === "save_diagram") {
            persistence.saveLocal();
            return;
        }
        if (a.type === "load_diagram") {
            persistence.loadLocal();
            return;
        }
        if (a.type === "export_diagram") {
            void persistence.exportFile();
            return;
        }
        if (a.type === "import_diagram") {
            void persistence.importFile();
            return;
        }

        if (a.type === "delete_relation") {
            undo.pushSnapshot();
            setRelations(relations.filter((r) => r.id !== a.id));

            // helpers mono = pas de callback
            if (selectedRelationId === a.id) setSelectedRelationId(null);

            // multi: purge
            setSelectedRelationIds((prev: string[]) => prev.filter((x) => x !== a.id));
            return;
        }

        if (a.type === "set_relation_kind") {
            undo.pushSnapshot();
            setRelations(relations.map((r) => (r.id === a.id ? { ...r, kind: a.kind } : r)));
            return;
        }

        if (a.type === "edit_relation_label") {
            undo.pushSnapshot();

            const r = relations.find((x) => x.id === a.id);
            if (!r) return;

            const next = window.prompt("Relation label:", r.label ?? "");
            if (next === null) return;

            setRelations(relations.map((x) => (x.id === a.id ? { ...x, label: next } : x)));
            return;
        }
    }

    function applySnapshot(s: DiagramSnapshotV2) {
        state.setClasses(s.classes);
        state.setViewsById(s.viewsById);
        state.setRelations(s.relations);

        state.clearSelection();

        ctxMenu.close();
        rel.cancel();
        edit.cancelLineEdit();
        edit.cancelNameEdit();
    }

    function setClassName(id: string, name: string) {
        const c = getClassById(id);
        if (!c) return;

        undo.pushSnapshot();

        const nextClass: UmlClass = { ...c, name };
        setClasses(classes.map((cc) => (cc.id === id ? nextClass : cc)));

        applyAutoSizeForClassIfNeeded(id, nextClass);
    }

    function setClassAttributes(id: string, attributes: string[]) {
        const c = getClassById(id);
        if (!c) return;

        undo.pushSnapshot();

        const nextClass: UmlClass = { ...c, attributes };
        setClasses(classes.map((cc) => (cc.id === id ? nextClass : cc)));

        applyAutoSizeForClassIfNeeded(id, nextClass);
    }

    function setClassMethods(id: string, methods: string[]) {
        const c = getClassById(id);
        if (!c) return;

        undo.pushSnapshot();

        const nextClass: UmlClass = { ...c, methods };
        setClasses(classes.map((cc) => (cc.id === id ? nextClass : cc)));

        applyAutoSizeForClassIfNeeded(id, nextClass);
    }

    function setRelationLabelOnSelected(label: string) {
        if (!selectedRelationId) return;
        undo.pushSnapshot();
        setRelations((prev) => prev.map((r) => (r.id === selectedRelationId ? { ...r, label } : r)));
    }

    function swapRelationDirectionOnSelected() {
        if (!selectedRelationId) return;

        const r0 = relations.find((r) => r.id === selectedRelationId);
        if (!r0) return;

        undo.pushSnapshot();

        setRelations((prev) =>
            prev.map((r) => {
                if (r.id !== r0.id) return r;

                const cps = r.controlPoints ? [...r.controlPoints].reverse() : r.controlPoints;

                return {
                    ...r,

                    // endpoints
                    fromId: r.toId,
                    toId: r.fromId,

                    // ports
                    fromPort: r.toPort,
                    toPort: r.fromPort,
                    fromPortLocked: r.toPortLocked,
                    toPortLocked: r.fromPortLocked,

                    // cardinalité/ordered (par extrémité)
                    fromCardinality: r.toCardinality,
                    toCardinality: r.fromCardinality,
                    fromOrdered: r.toOrdered,
                    toOrdered: r.fromOrdered,

                    // garder la forme du tracé en manuel
                    controlPoints: cps,
                };
            })
        );
    }

    function setRelationCardinalityOnSelected(args: { fromCardinality: Cardinality; toCardinality: Cardinality }) {
        if (!selectedRelationId) return;

        undo.pushSnapshot();

        setRelations((prev) =>
            prev.map((r) => {
                if (r.id !== selectedRelationId) return r;
                return {
                    ...r,
                    fromCardinality: args.fromCardinality,
                    toCardinality: args.toCardinality,
                };
            })
        );
    }

    function setRelationWaypointCountOnSelected(count: number) {
        if (!selectedRelationId) return;

        const r0 = relations.find((r) => r.id === selectedRelationId);
        if (!r0) return;

        const MIN_WP = 2;
        const MAX_WP = 10;
        const n = Math.max(MIN_WP, Math.min(MAX_WP, Math.floor(count)));

        undo.pushSnapshot();

        // IMPORTANT: passer relations pour que les ports distribués soient pris en compte
        const cps = makeControlPointsWithCount(r0, viewsById, n, relations);

        setRelations((prev) =>
            prev.map((r) => {
                if (r.id !== r0.id) return r;
                return {
                    ...r,
                    routingMode: "manual", // indispensable : sinon RelationLayer masque les waypoints
                    controlPoints: cps, // cps.length >= 2
                };
            })
        );
    }

    function duplicateSelected() {
        if (!selectedId) return;

        undo.pushSnapshot();

        const src = classes.find((c) => c.id === selectedId);
        const v = viewsById[selectedId];
        if (!src || !v) return;

        const id = crypto.randomUUID();
        const copy: UmlClass = { ...src, id, name: `${src.name}Copy` };
        const viewCopy: NodeView = { ...v, id, x: v.x + 20, y: v.y + 20 };

        setClasses([...classes, copy]);
        setViewsById((prev) => ({ ...prev, [id]: viewCopy }));
        setSelectedId(id);
        setSelectedRelationId(null);
    }

    return {
        onContextAction,
        deleteSelected,
        duplicateSelected,

        setClassName,
        setClassAttributes,
        setClassMethods,
        applyClassEdits,

        setRelationKindOnSelected,
        setRelationLabelOnSelected,
        swapRelationDirectionOnSelected,
        setRelationCardinalityOnSelected,
        setRelationWaypointCountOnSelected,

        editSelectedRelationLabel,
        applySnapshot,
        makeCurrentSnapshot: () => makeSnapshot(state.classes, state.viewsById, state.relations),

        createClassAtWorld,

        setClassSizeMode,
        toggleClassSizeMode,
    };
}
