import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";

import type { DiagramSnapshotV2 } from "../../model/diagram";
import type { UmlRelation } from "../../model/relation";

import { screenToWorld } from "../../utils/coords";

import type { DiagramStateApi } from "./useDiagramState";

import { updateView } from "../../model/views";

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

    // ajouté (useNodeManipulation l’implémente déjà chez toi)
    consumeLastDragDelta: () => { dx: number; dy: number } | null;
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

    startFromPort?: (id: string, side: any) => void;
    commitToPort?: (id: string, side: any) => void;
    hoverToPort?: (id: string | null, side?: any) => void;

    hoverTo: (id: string | null) => void;
    clearHover: () => void;
};

type RelReconnectApi = {
    isActive: boolean;
    updateToWorld: (x: number, y: number) => void;
    cancel: () => void;

    commitTo?: (id: string) => void;
    commitToPort?: (id: string, side: any) => void;

    hoverToId?: string | null;
    hover?: { id: string; port?: any } | null;

    hoverTo: (id: string | null) => void;
    clearHover: () => void;
};

type RelRoutingApi = {
    isActive: boolean;
    relationId: string | null;
    updateToWorld: (x: number, y: number) => void;
    commit: () => void;
    cancel: () => void;
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
    relRoutingApi?: RelRoutingApi;

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
        svgRef: _svgRef,
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

    const [boxRect, setBoxRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

    const boxRef = useRef<{
        active: boolean;
        additive: boolean;
        start: { x: number; y: number };
    } | null>(null);

    useEffect(() => {
        if (state.mode === "link") relApi.setActive(true);
        else relApi.setActive(false);
    }, [state.mode, relApi]);

    function selectNode(id: string, additive: boolean) {
        if (!additive) {
            state.setSelectedIds([id]);
            state.setSelectedRelationIds([]);
            return;
        }

        state.setSelectedIds((prev: string[]) => {
            const has = prev.includes(id);
            if (has) return prev.filter((x) => x !== id);
            return [id, ...prev];
        });
    }

    function bboxOfPolyline(points: { x: number; y: number }[]) {
        let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
        for (const p of points) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
        return { minX, minY, maxX, maxY };
    }

    function rectIntersects(
        a: { minX: number; minY: number; maxX: number; maxY: number },
        b: { minX: number; minY: number; maxX: number; maxY: number }
    ) {
        return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
    }

    function centerOfView(v: { x: number; y: number; width: number; height: number }) {
        return { x: v.x + v.width / 2, y: v.y + v.height / 2 };
    }

    function onBackgroundMouseDown(e: MouseEvent<SVGRectElement>) {
        if (e.button !== 0) return;

        ctxMenu.close();
        focusRoot();

        if (relRoutingApi?.isActive) {
            e.preventDefault();
            relRoutingApi.cancel();
            return;
        }

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

            actions.createClassAt(world.x, world.y);
            state.setMode("select");
            return;
        }

        if (state.mode === "multiSelect") {
            editApi.commitLineEdit();
            editApi.commitNameEdit();

            cameraApi.allowPan(false);

            const { sx, sy } = getLocalScreenPointFromMouseEvent(e);
            const start = screenToWorld(sx, sy, cameraApi.camera);

            const additive = !!(e as any).shiftKey;

            boxRef.current = { active: true, additive, start: { x: start.x, y: start.y } };
            setBoxRect({ x: start.x, y: start.y, w: 0, h: 0 });

            if (!additive) {
                state.setSelectedRelationIds([]);
            }

            return;
        }

        editApi.commitLineEdit();
        editApi.commitNameEdit();

        state.clearSelection();

        cameraApi.allowPan(true);
        cameraApi.beginPan(e);
    }

    function onBackgroundContextMenu(e: MouseEvent<SVGRectElement>) {
        e.preventDefault();
        focusRoot();

        state.clearSelection();

        cameraApi.allowPan(false);

        const { sx, sy } = getLocalScreenPointFromMouseEvent(e);
        const world = screenToWorld(sx, sy, cameraApi.camera);

        ctxMenu.show({ x: e.clientX, y: e.clientY }, { kind: "background", worldX: world.x, worldY: world.y });
    }

    function handleNodeClickForRelationMode(id: string, e: any) {
        e.stopPropagation();
        focusRoot();
        cameraApi.allowPan(false);

        selectNode(id, !!e.shiftKey);

        if (!relApi.hasFrom) {
            relApi.startFrom(id);
        } else {
            undoApi.pushSnapshot();
            relApi.commitTo(id);
        }
    }

    function onNodeMouseDown(id: string, e: any) {
        ctxMenu.close();

        if (relRoutingApi?.isActive) {
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

        const additive = !!e.shiftKey;

        if (additive) {
            selectNode(id, true);
        } else {
            const alreadySelected = state.selectedIds.includes(id);
            const isMulti = state.selectedIds.length > 1;

            if (!alreadySelected || !isMulti) {
                selectNode(id, false);
            }
        }

        state.setSelectedRelationIds([]);

        manipStartSnapshotRef.current = makeSnapshot();
        nodeManip.startDrag(id, e);
    }

    function onNodeSelectOnly(id: string, e: any) {
        ctxMenu.close();

        if (relRoutingApi?.isActive) {
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

        selectNode(id, !!e.shiftKey);
        state.setSelectedRelationIds([]);
    }

    function onResizeStart(id: string, handle: ResizeHandle, e: any) {
        ctxMenu.close();
        if (relApi.mode) return;
        if (relReconnectApi.isActive) return;
        if (relRoutingApi?.isActive) return;

        e.stopPropagation();
        focusRoot();

        cameraApi.allowPan(false);

        state.setSelectedId(id);
        state.setSelectedRelationIds([]);

        manipStartSnapshotRef.current = makeSnapshot();
        const cur = state.viewsById[id];
        const mode = cur?.sizeMode ?? "auto";
        if (mode === "auto") {
            state.setViewsById((prev) => updateView(prev, id, { sizeMode: "locked" }));
        }
        nodeManip.startResize(id, handle, e);
    }

    function onMouseMove(e: any) {
        if (boxRef.current?.active) {
            const { sx, sy } = getLocalScreenPointFromMouseEvent(e);
            const cur = screenToWorld(sx, sy, cameraApi.camera);
            const s = boxRef.current.start;

            const x1 = Math.min(s.x, cur.x);
            const y1 = Math.min(s.y, cur.y);
            const x2 = Math.max(s.x, cur.x);
            const y2 = Math.max(s.y, cur.y);

            setBoxRect({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
            return;
        }

        const usedByNode = nodeManip.onMouseMove(e);

        if (usedByNode) {
            const didChange = nodeManip.consumeDidChange();
            if (didChange && manipStartSnapshotRef.current) {
                undoApi.pushSnapshot(manipStartSnapshotRef.current);
                manipStartSnapshotRef.current = null;
            }

            const d = nodeManip.consumeLastDragDelta?.();
            if (d && state.selectedRelationIds.length > 0) {
                const ids = new Set(state.selectedRelationIds);
                state.setRelations((prev) =>
                    prev.map((r) => {
                        if (!ids.has(r.id)) return r;
                        if (!r.controlPoints || r.controlPoints.length === 0) return r;
                        return { ...r, controlPoints: r.controlPoints.map((p) => ({ x: p.x + d.dx, y: p.y + d.dy })) };
                    })
                );
            }

            if (state.selectedIds.length === 1 && state.selectedRelationIds.length === 0 && state.selectedId) {
                const movedId = state.selectedId;
                state.setRelations((prev) =>
                    prev.map((r) => (r.fromId === movedId || r.toId === movedId ? { ...r, controlPoints: undefined } : r))
                );
            }

            return;
        }

        if (!relRoutingApi?.isActive) cameraApi.panMove(e);
    }

    function onMouseUp() {
        if (boxRef.current?.active && boxRect) {
            const additive = boxRef.current.additive;

            const x1 = boxRect.x;
            const y1 = boxRect.y;
            const x2 = boxRect.x + boxRect.w;
            const y2 = boxRect.y + boxRect.h;

            const rect = { minX: x1, minY: y1, maxX: x2, maxY: y2 };

            const hitNodeIds: string[] = [];
            for (const id of Object.keys(state.viewsById)) {
                const v = state.viewsById[id];
                const bb = { minX: v.x, minY: v.y, maxX: v.x + v.width, maxY: v.y + v.height };
                if (rectIntersects(rect, bb)) hitNodeIds.push(id);
            }

            const hitRelationIds: string[] = [];
            for (const r of state.relations) {
                const fromV = state.viewsById[r.fromId];
                const toV = state.viewsById[r.toId];
                if (!fromV || !toV) continue;

                const a = centerOfView(fromV);
                const b = centerOfView(toV);

                const pts = [a, ...(r.controlPoints ?? []), b];
                const bb = bboxOfPolyline(pts);

                if (rectIntersects(rect, bb)) hitRelationIds.push(r.id);
            }

            if (!additive) {
                state.setSelectedIds(hitNodeIds);
                state.setSelectedRelationIds(hitRelationIds);

                if (state.multiSelectArmed) {
                    const total = hitNodeIds.length + hitRelationIds.length;
                    if (total <= 1) {
                        state.setMode("select");
                        state.setMultiSelectArmed(false);
                    }
                }
            } else {
                const nextNodes = Array.from(new Set([...state.selectedIds, ...hitNodeIds]));
                const nextRels = Array.from(new Set([...state.selectedRelationIds, ...hitRelationIds]));

                state.setSelectedIds(nextNodes);
                state.setSelectedRelationIds(nextRels);

                if (state.multiSelectArmed) {
                    const total = nextNodes.length + nextRels.length;
                    if (total <= 1) {
                        state.setMode("select");
                        state.setMultiSelectArmed(false);
                    }
                }
            }

            boxRef.current = null;
            setBoxRect(null);
            return;
        }

        cameraApi.endPan();

        if (relRoutingApi?.isActive) {
            relRoutingApi.commit();
            return;
        }

        if (relReconnectApi.isActive) {
            relReconnectApi.cancel();
            return;
        }

        const didChange = nodeManip.consumeDidChange();
        nodeManip.stop();

        if (didChange && manipStartSnapshotRef.current) {
            undoApi.pushSnapshot(manipStartSnapshotRef.current);
        }
        manipStartSnapshotRef.current = null;
    }

    function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
        const t = e.target as HTMLElement | null;

        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) {
            return;
        }

        if (e.key === "Escape" && relRoutingApi?.isActive) {
            e.preventDefault();
            relRoutingApi.cancel();
            return;
        }

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

            if (k === "v") {
                e.preventDefault();
                state.setMode("select");
                state.setMultiSelectArmed(false);
                return;
            }
            if (k === "m") {
                e.preventDefault();
                state.setMode("multiSelect");
                state.setMultiSelectArmed(true);
                return;
            }
            if (k === "l") {
                e.preventDefault();
                state.setMode("link");
                return;
            }
            if (k === "c") {
                e.preventDefault();
                state.setMode("addClass");
                return;
            }

            if (k === "g") {
                e.preventDefault();
                state.setGrid((g) => ({ ...g, enabled: !g.enabled }));
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

    return {
        onBackgroundMouseDown,
        onBackgroundContextMenu,
        onNodeMouseDown,
        onNodeSelectOnly,
        onResizeStart,
        onMouseMove,
        onMouseUp,
        onKeyDown,
        boxRect,
    };
}