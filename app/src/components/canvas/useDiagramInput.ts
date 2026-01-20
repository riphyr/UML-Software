import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";

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

    setActive: (active: boolean) => void;

    toggleMode: () => void;
    startFrom: (id: string) => void;
    commitTo: (id: string) => void;
    cancel: () => void;
    setKind: (k: UmlRelation["kind"]) => void;
    updateToWorld: (x: number, y: number) => void;
};

type RelReconnectApi = {
    isActive: boolean;
    hoverToId: string | null;
    updateToWorld: (x: number, y: number) => void;
    commitTo: (id: string) => void;
    cancel: () => void;
};

type RelRoutingApi = {
    isActive: boolean;
    relationId: string | null;

    start: (relationId: string, index: number) => void;
    cancel: () => void;
    updateToWorld: (x: number, y: number) => void;
    commit: () => void;
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
    relReconnectApi: RelReconnectApi;
    relRoutingApi: RelRoutingApi;
    editApi: EditApi;
    undoApi: UndoApi;
    ctxMenu: CtxMenuApi;

    makeSnapshot: () => DiagramSnapshotV2;

    actions: {
        deleteSelected: () => void;
        setRelationKindOnSelected: (k: UmlRelation["kind"]) => void;
        editSelectedRelationLabel: () => void;

        createClassAt: (worldX: number, worldY: number) => void;
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
        relReconnectApi,
        relRoutingApi,
        editApi,
        undoApi,
        ctxMenu,
        makeSnapshot,
        actions,
    } = args;

    const manipStartSnapshotRef = useRef<DiagramSnapshotV2 | null>(null);
    const routingStartSnapshotRef = useRef<DiagramSnapshotV2 | null>(null);

    useEffect(() => {
        if (state.mode === "link") relApi.setActive(true);
        else relApi.setActive(false);
    }, [state.mode, relApi]);

    function onBackgroundMouseDown(e: MouseEvent<SVGRectElement>) {
        if (e.button !== 0) return;

        ctxMenu.close();
        focusRoot();

        // priorité : drag routing en cours => clic vide annule (sans commit)
        if (relRoutingApi.isActive) {
            e.preventDefault();
            relRoutingApi.cancel();
            routingStartSnapshotRef.current = null;
            return;
        }

        // priorité : reconnexion en cours => clic vide annule
        if (relReconnectApi.isActive) {
            e.preventDefault();
            relReconnectApi.cancel();
            return;
        }

        if (state.mode === "link") {
            e.preventDefault();
            relApi.cancel();
            state.setMode("select");
            return;
        }

        if (state.mode === "addClass") {
            editApi.commitLineEdit();
            editApi.commitNameEdit();

            const { sx, sy } = getLocalScreenPointFromMouseEvent(e);
            const world = screenToWorld(sx, sy, cameraApi.camera);

            undoApi.pushSnapshot();
            actions.createClassAt(world.x, world.y);

            state.setMode("select");
            return;
        }

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

        // drag routing actif => pas de drag node
        if (relRoutingApi.isActive) {
            e.stopPropagation();
            focusRoot();
            cameraApi.allowPan(false);
            return;
        }

        // reconnexion active => pas de drag node
        if (relReconnectApi.isActive) {
            e.stopPropagation();
            focusRoot();
            cameraApi.allowPan(false);
            return;
        }

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

        if (relRoutingApi.isActive) {
            e.stopPropagation();
            focusRoot();
            cameraApi.allowPan(false);
            return;
        }

        if (relReconnectApi.isActive) {
            e.stopPropagation();
            focusRoot();
            cameraApi.allowPan(false);
            return;
        }

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
        if (relReconnectApi.isActive) return;
        if (relRoutingApi.isActive) return;

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

        if (svgRef.current) {
            const rect = svgRef.current.getBoundingClientRect();
            const sx = (e as any).clientX - rect.left;
            const sy = (e as any).clientY - rect.top;
            const w = screenToWorld(sx, sy, cameraApi.camera);

            if (relRoutingApi.isActive) {
                relRoutingApi.updateToWorld(w.x, w.y);
            } else if (relReconnectApi.isActive) {
                relReconnectApi.updateToWorld(w.x, w.y);
            } else if (relApi.mode && relApi.hasFrom) {
                relApi.updateToWorld(w.x, w.y);
            }
        }

        if (!relRoutingApi.isActive && !relReconnectApi.isActive) {
            const usedByNode = nodeManip.onMouseMove(e);
            if (usedByNode) return;
        }

        cameraApi.panMove(e);
    }

    function onMouseUp() {
        cameraApi.endPan();

        // commit routing drag
        if (relRoutingApi.isActive) {
            if (routingStartSnapshotRef.current) {
                undoApi.pushSnapshot(routingStartSnapshotRef.current);
            }
            routingStartSnapshotRef.current = null;
            relRoutingApi.commit();
            nodeManip.stop();
            manipStartSnapshotRef.current = null;
            return;
        }

        // commit/cancel reconnexion
        if (relReconnectApi.isActive) {
            if (relReconnectApi.hoverToId) {
                undoApi.pushSnapshot();
                relReconnectApi.commitTo(relReconnectApi.hoverToId);
            } else {
                relReconnectApi.cancel();
            }
            nodeManip.stop();
            manipStartSnapshotRef.current = null;
            return;
        }

        const changed = nodeManip.consumeDidChange();
        nodeManip.stop();

        if (changed && manipStartSnapshotRef.current) {
            undoApi.pushSnapshot(manipStartSnapshotRef.current);
        }
        manipStartSnapshotRef.current = null;
    }

    function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
        // ESC : priorité routing
        if (e.key === "Escape" && relRoutingApi.isActive) {
            e.preventDefault();
            relRoutingApi.cancel();
            routingStartSnapshotRef.current = null;
            return;
        }

        // ESC : ensuite reconnexion
        if (e.key === "Escape" && relReconnectApi.isActive) {
            e.preventDefault();
            relReconnectApi.cancel();
            return;
        }

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

        if (!editApi.editingName && !editApi.isEditingLine) {
            const k = e.key.toLowerCase();

            if (k === "v") { e.preventDefault(); state.setMode("select"); return; }
            if (k === "h") { e.preventDefault(); state.setMode("pan"); return; }
            if (k === "l") { e.preventDefault(); state.setMode("link"); return; }
            if (k === "c") { e.preventDefault(); state.setMode("addClass"); return; }

            if (k === "g") {
                e.preventDefault();
                state.setGrid(g => ({ ...g, enabled: !g.enabled }));
                return;
            }
        }

        if (e.key === "Escape") {
            if (state.mode === "link") {
                e.preventDefault();
                state.setMode("select");
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

    // IMPORTANT : le démarrage du drag de point de contrôle se fait via DiagramCanvas (callback).
    // Pour l'undo, on capture le snapshot au 1er mouvement effectif.
    // Ici : on capture au moment où le drag démarre, depuis le clic handle (dans DiagramCanvas, juste avant relRoutingApi.start).
    // => on l’expose via une méthode privée simple ci-dessous.
    function beginRoutingDragSnapshotCapture() {
        if (!routingStartSnapshotRef.current) routingStartSnapshotRef.current = makeSnapshot();
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

        // utilisé depuis DiagramCanvas au clic sur un control point
        beginRoutingDragSnapshotCapture,
    };
}
