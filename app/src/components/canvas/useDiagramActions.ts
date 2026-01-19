import type { UmlClass } from "../../model/uml";
import type { NodeView } from "../../model/view";
import type { UmlRelation } from "../../model/relation";
import { addView, removeView } from "../../model/views";

import type { ContextAction } from "../contextmenu/types";

import type { DiagramSnapshotV2 } from "../../model/diagram";
import { makeSnapshot } from "../../model/diagram";

import type { DiagramStateApi } from "./useDiagramState";

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

const DEFAULT_NODE_W = 260;
const DEFAULT_NODE_H = 150;

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
}) {
    const { state, undo, edit, rel, ctxMenu, persistence } = args;
    const {
        classes,
        setClasses,
        viewsById,
        setViewsById,
        relations,
        setRelations,
        selectedId,
        setSelectedId,
        selectedRelationId,
        setSelectedRelationId,
    } = state;

    function getClassById(id: string) {
        return classes.find(c => c.id === id) ?? null;
    }

    function createClassAtWorld(worldX: number, worldY: number) {
        const id = newId();

        const newClass: UmlClass = {
            id,
            name: "NewClass",
            attributes: [],
            methods: [],
        };

        const newView: NodeView = {
            id,
            x: worldX,
            y: worldY,
            width: DEFAULT_NODE_W,
            height: DEFAULT_NODE_H,
        };

        setClasses(cs => [...cs, newClass]);
        setViewsById(prev => addView(prev, newView));

        setSelectedId(id);
        setSelectedRelationId(null);

        edit.cancelNameEdit();
        edit.cancelLineEdit();
    }

    function deleteSelectedClass(id: string) {
        edit.commitLineEdit();
        edit.commitNameEdit();

        setClasses(cs => cs.filter(c => c.id !== id));
        setViewsById(prev => removeView(prev, id));

        // purge relations liées
        setRelations(prev => prev.filter(r => r.fromId !== id && r.toId !== id));

        setSelectedId(prev => (prev === id ? null : prev));
        setSelectedRelationId(null);
    }

    function deleteSelected() {
        if (selectedRelationId) {
            setRelations(prev => prev.filter(r => r.id !== selectedRelationId));
            setSelectedRelationId(null);
            return;
        }
        if (!selectedId) return;
        deleteSelectedClass(selectedId);
    }

    function setRelationKindOnSelected(kind: UmlRelation["kind"]) {
        if (!selectedRelationId) return;
        setRelations(prev => prev.map(r => (r.id === selectedRelationId ? { ...r, kind } : r)));
    }

    function editSelectedRelationLabel() {
        if (!selectedRelationId) return;

        const r = relations.find(x => x.id === selectedRelationId);
        if (!r) return;

        const next = window.prompt("Relation label:", r.label ?? "");
        if (next === null) return;

        setRelations(prev => prev.map(x => (x.id === selectedRelationId ? { ...x, label: next } : x)));
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

            setClasses(cs =>
                cs.map(cc => (cc.id === a.id ? { ...cc, attributes: [...cc.attributes, "+ attr: Type"] } : cc))
            );

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

            setClasses(cs =>
                cs.map(cc => (cc.id === a.id ? { ...cc, methods: [...cc.methods, "+ method(): Return"] } : cc))
            );

            requestAnimationFrame(() => edit.startEditMethod(newIndex));
            return;
        }
        if (a.type === "duplicate_class") {
            undo.pushSnapshot();
            const src = classes.find(c => c.id === a.id);
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

            setClasses(prev => [...prev, copy]);
            setViewsById(prev => ({ ...prev, [id]: viewCopy }));
            setSelectedId(id);
            setSelectedRelationId(null);
            return;
        }

        if (a.type === "save_diagram") { persistence.saveLocal(); return; }
        if (a.type === "load_diagram") { persistence.loadLocal(); return; }
        if (a.type === "export_diagram") { void persistence.exportFile(); return; }
        if (a.type === "import_diagram") { void persistence.importFile(); return; }

        if (a.type === "delete_relation") {
            undo.pushSnapshot();
            setRelations(prev => prev.filter(r => r.id !== a.id));
            setSelectedRelationId(prev => (prev === a.id ? null : prev));
            return;
        }
        if (a.type === "set_relation_kind") {
            undo.pushSnapshot();
            setRelations(prev => prev.map(r => (r.id === a.id ? { ...r, kind: a.kind } : r)));
            return;
        }
        if (a.type === "edit_relation_label") {
            undo.pushSnapshot();
            const r = relations.find(x => x.id === a.id);
            if (!r) return;

            const next = window.prompt("Relation label:", r.label ?? "");
            if (next === null) return;

            setRelations(prev => prev.map(x => (x.id === a.id ? { ...x, label: next } : x)));
            return;
        }
    }

    function applySnapshot(s: DiagramSnapshotV2) {
        state.setClasses(s.classes);
        state.setViewsById(s.viewsById);
        state.setRelations(s.relations);

        state.setSelectedId(null);
        state.setSelectedRelationId(null);

        ctxMenu.close();
        rel.cancel();
        edit.cancelLineEdit();
        edit.cancelNameEdit();
    }

    return {
        onContextAction,
        deleteSelected,
        setRelationKindOnSelected,
        editSelectedRelationLabel,
        applySnapshot,
        makeCurrentSnapshot: () => makeSnapshot(state.classes, state.viewsById, state.relations),
    };
}
