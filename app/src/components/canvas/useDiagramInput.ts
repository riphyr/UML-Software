import { useRef, type KeyboardEvent, type MouseEvent } from "react";

import type { DiagramSnapshotV2 } from "../../model/diagram";
import type { UmlRelation } from "../../model/relation";

import { screenToWorld } from "../../utils/coords";

import type { DiagramStateApi } from "./useDiagramState";

export type ResizeHandle = "nw" | "ne" | "sw" | "se";

type CameraApi = {
    camera: { x: number; y: number; scale: number };
    isPanning: boolean;
    allowPan: (v: boolean) => void;
    beginPan: (e: any) => void;
    panMove: (e: any) => void;
    endPan: () => void;
    onWheel: (e: any) => void;
};

type NodeManipApi = {
    startDrag: (id: string, e: any) => void;
    startResize: (id: string, handle: ResizeHandle, e: any) => void;
    onMouseMove: (e: any) => boolean;
    stop: () => void;
    consumeDidChange: () => boolean;
};

type RelCreationApi = {
    mode: boolean;
    hasFrom: boolean;
    toggleMode: () => void;
    startFrom: (id: string) => void;
    commitTo: (id: string) => void;
    cancel: () => void;
    setKind: (k: UmlRelation["kind"]) => void;
    updateToWorld: (x: number, y: number) => void;
};

type EditApi = {
    editingName: boolean;
    isEditingLine: boolean;
    commitLineEdit: () => void;
    commitNameEdit: () => void;
};

type UndoApi = {
    pushSnapshot: (s?: DiagramSnapshotV2) => void;
    undo: () => void;
    redo: () => void;
};

type CtxMenuApi = {
    open: boolean;
    close: () => void;
    show: (pos: { x: number; y: number }, ctx: any) => void;
};

export function useDiagramInput(args: {
    svgRef: React.RefObject<SVGSVGElement | null>;
    focusRoot: () => void;
    getLocalScreenPointFromMouseEvent: (e: any) => { sx: number; sy: number };

    state: DiagramStateApi;
    cameraApi: CameraApi;
    nodeManip: NodeManipApi;
    relApi: RelCreationApi;
    editApi: EditApi;
    undoApi: UndoApi;
    ctxMenu: CtxMenuApi;

    makeSnapshot: () => DiagramSnapshotV2;

    actions: {
        deleteSelected: () => void;
        setRelationKindOnSelected: (k: UmlRelation["kind"]) => void;
        editSelectedRelationLabel: () => void;
    };
}) {
    const {
        svgRef,
        focusRoot,
        getLocalScreenPointFromMouseEvent,
        state,
        cameraApi,
        nodeManip,
        relApi,
        editApi,
        undoApi,
        ctxMenu,
        makeSnapshot,
        actions,
    } = args;

    const manipStartSnapshotRef = useRef<DiagramSnapshotV2 | null>(null);

    function onBackgroundMouseDown(e: MouseEvent<SVGRectElement>) {
        if (e.button !== 0) return;

        ctxMenu.close();
        focusRoot();

        editApi.commitLineEdit();
        editApi.commitNameEdit();

        state.setSelectedId(null);
        state.setSelectedRelationId(null);

        cameraApi.allowPan(true);
        cameraApi.beginPan(e);
    }

    function onBackgroundContextMenu(e: MouseEvent<SVGRectElement>) {
        e.preventDefault();
        focusRoot();

        state.setSelectedId(null);
        state.setSelectedRelationId(null);

        cameraApi.allowPan(false);

        const { sx, sy } = getLocalScreenPointFromMouseEvent(e);
        const world = screenToWorld(sx, sy, cameraApi.camera);

        ctxMenu.show(
            { x: e.clientX, y: e.clientY },
            { kind: "background", worldX: world.x, worldY: world.y }
        );
    }

    function handleNodeClickForRelationMode(id: string, e: any) {
        e.stopPropagation();
        focusRoot();
        cameraApi.allowPan(false);

        state.setSelectedId(id);
        state.setSelectedRelationId(null);

        if (!relApi.hasFrom) {
            relApi.startFrom(id);
        } else {
            undoApi.pushSnapshot();
            relApi.commitTo(id);
        }
    }

    function onNodeMouseDown(id: string, e: any) {
        ctxMenu.close();

        if (relApi.mode) {
            handleNodeClickForRelationMode(id, e);
            return;
        }

        e.stopPropagation();
        focusRoot();

        cameraApi.allowPan(false);

        state.setSelectedId(id);
        state.setSelectedRelationId(null);

        manipStartSnapshotRef.current = makeSnapshot();
        nodeManip.startDrag(id, e);
    }

    function onNodeSelectOnly(id: string, e: any) {
        ctxMenu.close();

        if (relApi.mode) {
            handleNodeClickForRelationMode(id, e);
            return;
        }

        e.stopPropagation();
        focusRoot();

        cameraApi.allowPan(false);

        state.setSelectedId(id);
        state.setSelectedRelationId(null);
    }

    function onResizeStart(id: string, handle: ResizeHandle, e: any) {
        ctxMenu.close();
        if (relApi.mode) return;

        e.stopPropagation();
        focusRoot();

        cameraApi.allowPan(false);

        state.setSelectedId(id);
        state.setSelectedRelationId(null);

        manipStartSnapshotRef.current = makeSnapshot();
        nodeManip.startResize(id, handle, e);
    }

    function onMouseMove(e: any) {
        if (ctxMenu.open) return;

        if (relApi.mode && relApi.hasFrom && svgRef.current) {
            const rect = svgRef.current.getBoundingClientRect();
            const sx = (e as any).clientX - rect.left;
            const sy = (e as any).clientY - rect.top;
            const w = screenToWorld(sx, sy, cameraApi.camera);
            relApi.updateToWorld(w.x, w.y);
        }

        const usedByNode = nodeManip.onMouseMove(e);
        if (usedByNode) return;

        cameraApi.panMove(e);
    }

    function onMouseUp() {
        cameraApi.endPan();

        const changed = nodeManip.consumeDidChange();
        nodeManip.stop();

        if (changed && manipStartSnapshotRef.current) {
            undoApi.pushSnapshot(manipStartSnapshotRef.current);
        }
        manipStartSnapshotRef.current = null;
    }

    function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
        if (e.ctrlKey && !editApi.editingName && !editApi.isEditingLine) {
            const k = e.key.toLowerCase();

            if (k === "z" && e.shiftKey) {
                e.preventDefault();
                undoApi.redo();
                return;
            }
            if (k === "z") {
                e.preventDefault();
                undoApi.undo();
                return;
            }
            if (k === "y") {
                e.preventDefault();
                undoApi.redo();
                return;
            }
        }

        if (e.key === "r" || e.key === "R") {
            if (editApi.editingName || editApi.isEditingLine) return;
            e.preventDefault();
            relApi.toggleMode();
            return;
        }

        if (e.key === "Escape") {
            if (relApi.mode) {
                e.preventDefault();
                relApi.cancel();
                return;
            }
        }

        if (!editApi.editingName && !editApi.isEditingLine) {
            if (e.key === "1") {
                e.preventDefault();
                if (relApi.mode) relApi.setKind("assoc");
                else actions.setRelationKindOnSelected("assoc");
                return;
            }
            if (e.key === "2") {
                e.preventDefault();
                if (relApi.mode) relApi.setKind("herit");
                else actions.setRelationKindOnSelected("herit");
                return;
            }
            if (e.key === "3") {
                e.preventDefault();
                if (relApi.mode) relApi.setKind("agg");
                else actions.setRelationKindOnSelected("agg");
                return;
            }
            if (e.key === "4") {
                e.preventDefault();
                if (relApi.mode) relApi.setKind("comp");
                else actions.setRelationKindOnSelected("comp");
                return;
            }
        }

        if ((e.key === "l" || e.key === "L") && !editApi.editingName && !editApi.isEditingLine) {
            if (state.selectedRelationId) {
                e.preventDefault();
                actions.editSelectedRelationLabel();
                return;
            }
        }

        if (e.key === "Delete") {
            if (editApi.editingName || editApi.isEditingLine) return;
            e.preventDefault();
            actions.deleteSelected();
        }
    }

    return {
        onBackgroundMouseDown,
        onBackgroundContextMenu,
        onNodeMouseDown,
        onNodeSelectOnly,
        onResizeStart,
        onMouseMove,
        onMouseUp,
        onKeyDown,
    };
}
