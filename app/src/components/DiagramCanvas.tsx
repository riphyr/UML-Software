import { useRef, useState } from "react";

import ClassNode from "./nodes/ClassNode";
import InlineEditors from "./canvas/InlineEditors";
import RelationLayer from "./relations/RelationLayer";
import Grid from "./canvas/Grid";
import Axes from "./canvas/Axes";
import ContextMenu from "./contextmenu/ContextMenu";

import Toolbar from "./ui/toolbar/Toolbar";
import Inspector from "./ui/inspector/Inspector";

import { NODE_ATTR_START_Y, getAttrsCount, getMethodsStartY } from "./nodes/layout";
import { screenToWorld } from "../utils/coords";
import { makeSnapshot, normalizeSnapshot, type DiagramSnapshotV2 } from "../model/diagram";
import { applyAutoSizeIfNeeded } from "./nodes/autoSize";
import { updateView } from "../model/views";

import { useCamera } from "./canvas/useCamera";
import { useNodeManipulation } from "./canvas/useNodeManipulation";
import { useInlineEdit } from "./canvas/useInlineEdit";
import { useRelationCreation } from "./relations/useRelationCreation";
import { useRelationReconnect } from "./relations/useRelationReconnect";
import { useRelationRouting } from "./relations/useRelationRouting";
import { useUndoRedo } from "./canvas/useUndoRedo";
import { useContextMenu } from "./contextmenu/useContextMenu";
import { useDiagramPersistence } from "./canvas/useDiagramPersistence";

import { useDiagramState } from "./canvas/useDiagramState";
import { useDiagramActions } from "./canvas/useDiagramActions";
import { useDiagramInput } from "./canvas/useDiagramInput";

import { buildPortLayout, getEndpointPortPoint } from "./relations/ports";

export default function DiagramCanvas() {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);

    const state = useDiagramState();

    const persistence = useDiagramPersistence({
        classes: state.classes,
        setClasses: state.setClasses,
        viewsById: state.viewsById,
        setViewsById: state.setViewsById,
        relations: state.relations,
        setRelations: state.setRelations,
        clearSelection: state.clearSelection,
    });

    const cameraApi = useCamera(svgRef);

    const editApi = useInlineEdit({
        selectedId: state.selectedId,
        classes: state.classes,
        setClasses: state.setClasses,
    });

    const relApi = useRelationCreation({
        viewsById: state.viewsById,
        relations: state.relations,
        setRelations: state.setRelations,
        disabled: editApi.editingName || editApi.isEditingLine,
    });

    const relReconnectApi: ReturnType<typeof useRelationReconnect> = useRelationReconnect({
        viewsById: state.viewsById,
        relations: state.relations,
        setRelations: state.setRelations,
        disabled: editApi.editingName || editApi.isEditingLine || state.mode === "link",
    });

    const relRoutingApi: ReturnType<typeof useRelationRouting> = useRelationRouting({
        viewsById: state.viewsById,
        relations: state.relations,
        setRelations: state.setRelations,
        disabled: editApi.editingName || editApi.isEditingLine || state.mode === "link" || relReconnectApi.isActive,
        grid: { enabled: state.grid.enabled, size: state.grid.size },
    });

    const nodeManip = useNodeManipulation({
        svgRef,
        camera: cameraApi.camera,
        getViewById: (id: string) => state.viewsById[id],
        getSelectedNodeIds: () => state.selectedIds,
        setViewsById: state.setViewsById,
        disabled:
            editApi.editingName ||
            editApi.isEditingLine ||
            state.mode === "link" ||
            relReconnectApi.isActive ||
            relRoutingApi.routing.isActive,
        grid: { enabled: state.grid.enabled, size: state.grid.size },
    });

    const [mouseWorld, setMouseWorld] = useState<{ x: number; y: number } | null>(null);

    function focusRoot() {
        rootRef.current?.focus();
    }

    function getLocalScreenPointFromMouseEvent(e: any) {
        const rect = svgRef.current!.getBoundingClientRect();
        return { sx: e.clientX - rect.left, sy: e.clientY - rect.top };
    }

    // --- Undo/Redo : applySnapshot sans dépendre de useDiagramActions
    function applySnapshot(s: DiagramSnapshotV2) {
        const snap = normalizeSnapshot(s);
        state.setClasses(snap.classes);
        state.setViewsById(snap.viewsById);
        state.setRelations(snap.relations);
        state.clearSelection();
    }

    const undoApi = useUndoRedo({
        getSnapshot: () => makeSnapshot(state.classes, state.viewsById, state.relations),
        applySnapshot,
    });

    const ctxMenu = useContextMenu({
        classes: state.classes,
        relations: state.relations,
        onAction: () => {},
    });

    const actions = useDiagramActions({
        state,
        undo: { pushSnapshot: () => undoApi.pushSnapshot() },
        edit: editApi,
        rel: { mode: relApi.mode, setKind: relApi.setKind, cancel: relApi.cancel },
        ctxMenu: { close: () => ctxMenu.close() },
        persistence,
        grid: state.grid,
    });

    // brancher le vrai handler
    const ctxMenuOnActionRef = useRef(actions.onContextAction);
    ctxMenuOnActionRef.current = actions.onContextAction;
    (ctxMenu as any).onAction = (payload: any) => ctxMenuOnActionRef.current(payload);

    const input = useDiagramInput({
        svgRef,
        focusRoot,
        getLocalScreenPointFromMouseEvent,
        state,
        cameraApi,
        nodeManip,
        relApi: {
            ...relApi,
            setActive: (relApi as any).setActive,
        } as any,
        relReconnectApi: relReconnectApi as any,
        relRoutingApi: {
            isActive: relRoutingApi.routing.isActive,
            relationId: relRoutingApi.routing.isActive ? relRoutingApi.routing.relationId : undefined,

            updateToWorld: (x: number, y: number) => {
                if (!relRoutingApi.routing.isActive) return;
                relRoutingApi.setDraft({ x, y });
            },

            commit: relRoutingApi.commit,
            cancel: relRoutingApi.cancel,
        } as any,
        editApi,
        undoApi,
        ctxMenu,
        makeSnapshot: () => makeSnapshot(state.classes, state.viewsById, state.relations),
        actions: {
            deleteSelected: actions.deleteSelected,
            setRelationKindOnSelected: actions.setRelationKindOnSelected,
            editSelectedRelationLabel: actions.editSelectedRelationLabel,
            createClassAt: actions.createClassAtWorld,
        },
    });

    const attrsCount = state.selectedClass ? getAttrsCount(state.selectedClass.attributes.length) : 0;
    const methodsStartY = getMethodsStartY(attrsCount);

    const selectedRelation = state.selectedRelationId
        ? state.relations.find((r) => r.id === state.selectedRelationId) ?? null
        : null;

    function getClassNameById(id: string) {
        return state.classes.find((c) => c.id === id)?.name ?? id;
    }

    const selectedClasses = state.selectedIds
        .map((id) => state.classes.find((c) => c.id === id) ?? null)
        .filter((x): x is NonNullable<typeof x> => !!x);

    const selectedRelations = state.selectedRelationIds
        .map((id) => state.relations.find((r) => r.id === id) ?? null)
        .filter((x): x is NonNullable<typeof x> => !!x);

    return (
        <div
            ref={rootRef}
            tabIndex={0}
            onKeyDown={input.onKeyDown}
            onContextMenuCapture={(e) => e.preventDefault()}
            style={{ width: "100%", height: "100%", outline: "none", position: "relative" }}
        >
            <Toolbar
                mode={state.mode}
                setMode={(m) => {
                    state.setMode(m);
                    state.setMultiSelectArmed(m === "multiSelect");
                }}
                grid={state.grid}
                toggleGrid={() => state.setGrid((g) => ({ ...g, enabled: !g.enabled }))}
                setGridSize={(n) => state.setGrid((g) => ({ ...g, size: Math.max(10, Math.round(n)) }))}
                undo={() => undoApi.undo()}
                redo={() => undoApi.redo()}
                save={() => persistence.saveLocal()}
                load={() => persistence.loadLocal()}
                exportFile={() => {
                    void persistence.exportFile();
                }}
                importFile={() => {
                    void persistence.importFile();
                }}
            />

            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                style={{
                    display: "block",
                    cursor: cameraApi.isPanning
                        ? "grabbing"
                        : relReconnectApi.isActive
                            ? "crosshair"
                            : relRoutingApi.routing.isActive
                                ? "move"
                                : state.mode === "link"
                                    ? "crosshair"
                                    : state.mode === "multiSelect"
                                        ? "default"
                                        : state.mode === "addClass"
                                            ? "copy"
                                            : "default",
                    userSelect: "none",
                }}
                onMouseMove={(e) => {
                    input.onMouseMove(e);

                    if (!svgRef.current) return;
                    const rect = svgRef.current.getBoundingClientRect();
                    const sx = e.clientX - rect.left;
                    const sy = e.clientY - rect.top;
                    const w = screenToWorld(sx, sy, cameraApi.camera);
                    setMouseWorld(w);
                }}
                onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // si une relation est déjà sélectionnée, on ouvre son menu
                    const id = state.selectedRelationId;
                    if (!id) return;

                    const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                    const sx = e.clientX - rect.left;
                    const sy = e.clientY - rect.top;
                    const world = screenToWorld(sx, sy, cameraApi.camera);

                    ctxMenu.show(
                        { x: e.clientX, y: e.clientY },
                        { kind: "relation", id, worldX: world.x, worldY: world.y }
                    );
                }}
                onMouseUp={input.onMouseUp}
                onMouseLeave={input.onMouseUp}
                onWheel={(e) => {
                    if (ctxMenu.open) {
                        e.preventDefault();
                        return;
                    }
                    cameraApi.onWheel(e);
                }}
            >
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="transparent"
                    onMouseDown={input.onBackgroundMouseDown}
                    onContextMenu={input.onBackgroundContextMenu}
                />

                <g transform={`translate(${cameraApi.camera.x}, ${cameraApi.camera.y}) scale(${cameraApi.camera.scale})`}>
                    <Grid
                        width={2000}
                        height={2000}
                        scale={cameraApi.camera.scale}
                        enabled={state.grid.enabled}
                        base={state.grid.size}
                    />
                    <Axes />

                    <RelationLayer
                        relations={state.relations}
                        viewsById={state.viewsById}
                        selectedRelationId={state.selectedRelationId}
                        selectedRelationIds={state.selectedRelationIds}
                        onSelectRelation={(id, e) => {
                            ctxMenu.close();

                            if (e?.shiftKey) {
                                state.setSelectedRelationIds((prev: string[]) => {
                                    const has = prev.includes(id);
                                    if (has) return prev.filter((x) => x !== id);
                                    return [id, ...prev];
                                });
                                return;
                            }

                            state.setSelectedRelationId(id);
                        }}
                        onStartReconnect={(args: { id: string; end: "from" | "to" }) => {
                            const { id, end } = args;

                            state.setSelectedRelationId(id);
                            state.setSelectedIds([]);
                            ctxMenu.close();
                            relReconnectApi.start(id, end);
                        }}
                        routing={relRoutingApi.routing.isActive ? relRoutingApi.routing : undefined}
                        getControls={(id) => {
                            if (!relRoutingApi.routing.isActive) return undefined;
                            if (relRoutingApi.routing.relationId !== id) return undefined;

                            // pendant un drag de waypoint, on renvoie les controlPoints "draft" (inner only)
                            if (relRoutingApi.routing.kind !== "waypoint") return undefined;

                            const r0 = state.relations.find((r) => r.id === id);
                            if (!r0) return undefined;

                            const cps = [...(r0.controlPoints ?? [])];
                            const i = relRoutingApi.routing.i;
                            if (i >= 0 && i < cps.length) cps[i] = relRoutingApi.routing.draft;
                            return cps;
                        }}
                        onStartWaypointDrag={({ relationId, i, e }) => {
                            e.stopPropagation();

                            const r0 = state.relations.find((r) => r.id === relationId);
                            const cps = r0?.controlPoints ?? [];
                            const draft = cps[i];
                            if (!draft) return;

                            relRoutingApi.startWaypointDrag({ relationId, i, draft });
                        }}
                        onStartEndpointDrag={({ relationId, end, e }) => {
                            e.stopPropagation();

                            // draft initial = endpoint actuel (distribué si possible)
                            const r0 = state.relations.find((r) => r.id === relationId);
                            if (!r0) return;

                            const layout = buildPortLayout(state.relations, state.viewsById);
                            const ep = getEndpointPortPoint(layout, relationId, end, state.viewsById, 14);

                            // fallback si jamais
                            const fromV = state.viewsById[r0.fromId];
                            const toV = state.viewsById[r0.toId];
                            if (!fromV || !toV) return;

                            const cFrom = { x: fromV.x + fromV.width / 2, y: fromV.y + fromV.height / 2 };
                            const cTo = { x: toV.x + toV.width / 2, y: toV.y + toV.height / 2 };

                            const chooseSide = (from: any, toPoint: any) => {
                                const c = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
                                const dx = toPoint.x - c.x;
                                const dy = toPoint.y - c.y;
                                return Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? "E" : "W") : (dy >= 0 ? "S" : "N");
                            };

                            const sideMid = (v: any, side: any) => {
                                const cx = v.x + v.width / 2;
                                const cy = v.y + v.height / 2;
                                if (side === "N") return { x: cx, y: v.y };
                                if (side === "S") return { x: cx, y: v.y + v.height };
                                if (side === "W") return { x: v.x, y: cy };
                                return { x: v.x + v.width, y: cy };
                            };
                            const nrm = (side: any) => {
                                if (side === "N") return { x: 0, y: -1 };
                                if (side === "S") return { x: 0, y: 1 };
                                if (side === "W") return { x: -1, y: 0 };
                                return { x: 1, y: 0 };
                            };
                            const portPoint = (v: any, side: any, offset = 14) => {
                                const m = sideMid(v, side);
                                const n = nrm(side);
                                return { x: m.x + n.x * offset, y: m.y + n.y * offset };
                            };

                            const fromSide = r0.fromPortLocked && r0.fromPort ? r0.fromPort : chooseSide(fromV, cTo);
                            const toSide = r0.toPortLocked && r0.toPort ? r0.toPort : chooseSide(toV, cFrom);

                            const fallbackDraft =
                                end === "from" ? portPoint(fromV, fromSide) : portPoint(toV, toSide);

                            const draft = ep?.point ?? fallbackDraft;

                            relRoutingApi.startEndpointDrag({ relationId, end, draft });
                        }}
                    />

                    {(input as any).boxRect && (
                        <rect
                            x={(input as any).boxRect.x}
                            y={(input as any).boxRect.y}
                            width={(input as any).boxRect.w}
                            height={(input as any).boxRect.h}
                            fill="rgba(106,169,255,0.15)"
                            stroke="#6aa9ff"
                            strokeWidth={1}
                            strokeDasharray="6 4"
                            pointerEvents="none"
                        />
                    )}

                    {relApi.previewLine && (
                        <line
                            x1={relApi.previewLine.a.x}
                            y1={relApi.previewLine.a.y}
                            x2={relApi.previewLine.b.x}
                            y2={relApi.previewLine.b.y}
                            stroke="#6aa9ff"
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            pointerEvents="none"
                        />
                    )}

                    {relReconnectApi.previewLine && (
                        <line
                            x1={relReconnectApi.previewLine.a.x}
                            y1={relReconnectApi.previewLine.a.y}
                            x2={relReconnectApi.previewLine.b.x}
                            y2={relReconnectApi.previewLine.b.y}
                            stroke="#6aa9ff"
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            pointerEvents="none"
                        />
                    )}

                    {state.classes.map((c) => {
                        const v = state.viewsById[c.id];
                        if (!v) return null;

                        const isSelected = state.selectedIds.includes(c.id);

                        const displayName = isSelected && editApi.editingName ? editApi.nameBuffer : c.name;
                        const displayAttributes =
                            isSelected && editApi.editingAttrIndex !== null
                                ? c.attributes.map((a, idx) =>
                                    idx === editApi.editingAttrIndex ? editApi.editBuffer : a
                                )
                                : c.attributes;
                        const displayMethods =
                            isSelected && editApi.editingMethodIndex !== null
                                ? c.methods.map((m, idx) => (idx === editApi.editingMethodIndex ? editApi.editBuffer : m))
                                : c.methods;

                        return (
                            <ClassNode
                                key={c.id}
                                x={v.x}
                                y={v.y}
                                width={v.width}
                                height={v.height}
                                name={displayName}
                                attributes={displayAttributes}
                                methods={displayMethods}
                                selected={isSelected}
                                editing={isSelected && editApi.editingName}
                                mouseWorld={mouseWorld}
                                showPorts={
                                    state.mode === "link" ||
                                    relReconnectApi.isActive ||
                                    relRoutingApi.routing.isActive ||
                                    (state.mode === "select" && !state.selectedRelationId)
                                }
                                onPortHover={(side) => {
                                    if ((relApi as any).mode) (relApi as any).hoverToPort?.(c.id, side ?? undefined);
                                    if (relReconnectApi.isActive)
                                        (relReconnectApi as any).hoverToPort?.(c.id, side ?? undefined);
                                }}
                                onPortMouseDown={(side, e) => {
                                    e.stopPropagation();
                                    focusRoot();

                                    // Select + clic sur un "+" => bascule Link + démarre depuis CE port
                                    if (
                                        state.mode === "select" &&
                                        !state.selectedRelationId &&
                                        !relReconnectApi.isActive &&
                                        !relRoutingApi.routing.isActive
                                    ) {
                                        ctxMenu.close();
                                        state.setSelectedId(c.id);
                                        state.setSelectedRelationIds([]); // IMPORTANT: clear relations sans casser les nodes

                                        state.setMode("link");
                                        (relApi as any).setActive?.(true);
                                        (relApi as any).startFromPort?.(c.id, side);
                                        return;
                                    }

                                    if (state.mode === "link") {
                                        if (!(relApi as any).hasFrom) {
                                            (relApi as any).startFromPort?.(c.id, side);
                                            return;
                                        }
                                        undoApi.pushSnapshot();
                                        (relApi as any).commitToPort?.(c.id, side);
                                        return;
                                    }

                                    // Reconnect : commit au clic
                                    if (relReconnectApi.isActive) {
                                        undoApi.pushSnapshot();
                                        (relReconnectApi as any).commitToPort?.(c.id, side);
                                    }
                                }}
                                onHoverStart={() => {
                                    if ((relApi as any).mode) relApi.hoverTo(c.id);
                                    if (relReconnectApi.isActive) relReconnectApi.hoverTo(c.id);
                                }}
                                onHoverEnd={() => {
                                    if ((relApi as any).mode) relApi.clearHover();
                                    if (relReconnectApi.isActive) relReconnectApi.clearHover();
                                }}
                                onMouseDown={(e) => input.onNodeMouseDown(c.id, e)}
                                onResizeStart={(handle, e) => input.onResizeStart(c.id, handle, e)}
                                onSelect={(e) => input.onNodeSelectOnly(c.id, e)}
                                onDoubleClickName={() => {
                                    if (state.mode === "link") return;
                                    if (relReconnectApi.isActive) return;
                                    state.setSelectedId(c.id);
                                    state.setSelectedRelationIds([]);
                                    requestAnimationFrame(() => editApi.startEditName());
                                }}
                                onDoubleClickAttribute={(i) => {
                                    if (state.mode === "link") return;
                                    if (relReconnectApi.isActive) return;
                                    state.setSelectedId(c.id);
                                    state.setSelectedRelationIds([]);
                                    requestAnimationFrame(() => editApi.startEditAttribute(i));
                                }}
                                onDoubleClickMethod={(i) => {
                                    if (state.mode === "link") return;
                                    if (relReconnectApi.isActive) return;
                                    state.setSelectedId(c.id);
                                    state.setSelectedRelationIds([]);
                                    requestAnimationFrame(() => editApi.startEditMethod(i));
                                }}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    focusRoot();

                                    cameraApi.allowPan(false);

                                    const rect = svgRef.current!.getBoundingClientRect();
                                    const sx = e.clientX - rect.left;
                                    const sy = e.clientY - rect.top;
                                    const world = screenToWorld(sx, sy, cameraApi.camera);

                                    state.setSelectedId(c.id);
                                    state.setSelectedRelationIds([]);

                                    ctxMenu.show(
                                        { x: e.clientX, y: e.clientY },
                                        { kind: "class", id: c.id, worldX: world.x, worldY: world.y }
                                    );
                                }}
                                sizeMode={v.sizeMode ?? "auto"}
                                disableLockToggle={state.mode === "link"}
                                onToggleSizeMode={() => {
                                    if (state.mode === "link") return;
                                    actions.toggleClassSizeMode(c.id);
                                }}
                            />
                        );
                    })}

                    {state.selectedView && state.selectedClass && (
                        <InlineEditors
                            x={state.selectedView.x}
                            y={state.selectedView.y}
                            width={state.selectedView.width}
                            editingAttrIndex={editApi.editingAttrIndex}
                            editingMethodIndex={editApi.editingMethodIndex}
                            editingName={editApi.editingName}
                            nameValue={editApi.nameBuffer}
                            onNameChange={editApi.setNameBuffer}
                            attrStartY={NODE_ATTR_START_Y}
                            methodsStartY={methodsStartY}
                            editBuffer={editApi.editBuffer}
                            setEditBuffer={editApi.setEditBuffer}
                            commitLine={() => {
                                if (!editApi.isEditingLine || !state.selectedClass) return;

                                undoApi.pushSnapshot();

                                const c = state.selectedClass;

                                editApi.commitLineEdit();

                                const nextClass = {
                                    ...c,
                                    name: editApi.editingName ? editApi.nameBuffer : c.name,
                                    attributes:
                                        editApi.editingAttrIndex !== null
                                            ? c.attributes.map((a, i) =>
                                                i === editApi.editingAttrIndex ? editApi.editBuffer : a
                                            )
                                            : c.attributes,
                                    methods:
                                        editApi.editingMethodIndex !== null
                                            ? c.methods.map((m, i) =>
                                                i === editApi.editingMethodIndex ? editApi.editBuffer : m
                                            )
                                            : c.methods,
                                };

                                state.setViewsById((prev) => {
                                    const patch = applyAutoSizeIfNeeded({
                                        view: prev[c.id],
                                        nextClass,
                                        grid: state.grid,
                                    });
                                    return patch ? updateView(prev, c.id, patch) : prev;
                                });
                            }}
                            commitName={() => {
                                if (!editApi.editingName || !state.selectedClass) return;

                                undoApi.pushSnapshot();

                                const c = state.selectedClass;
                                const nextName = editApi.nameBuffer;

                                editApi.commitNameEdit();

                                const nextClass = { ...c, name: nextName };

                                state.setViewsById((prev) => {
                                    const patch = applyAutoSizeIfNeeded({
                                        view: prev[c.id],
                                        nextClass,
                                        grid: state.grid,
                                    });
                                    return patch ? updateView(prev, c.id, patch) : prev;
                                });
                            }}
                            cancelLine={editApi.cancelLineEdit}
                            cancelName={editApi.cancelNameEdit}
                        />
                    )}
                </g>
            </svg>

            <div
                style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    width: 340,
                    maxHeight: "calc(100% - 24px)",
                    overflow: "auto",
                    zIndex: 10,
                }}
            >
                <Inspector
                    selectedClass={state.selectedClass}
                    selectedClasses={selectedClasses}
                    selectedRelations={selectedRelations}
                    selectedRelation={selectedRelation}
                    getClassNameById={getClassNameById}
                    actions={{
                        applyClassEdits: actions.applyClassEdits,
                        setRelationKindOnSelected: actions.setRelationKindOnSelected,
                        setRelationLabelOnSelected: actions.setRelationLabelOnSelected,
                        setRelationWaypointCountOnSelected: actions.setRelationWaypointCountOnSelected,
                        deleteSelected: actions.deleteSelected,
                        duplicateSelected: actions.duplicateSelected,
                    }}
                />
            </div>

            <ContextMenu open={ctxMenu.open} x={ctxMenu.x} y={ctxMenu.y} items={ctxMenu.items} onClose={ctxMenu.close} />
        </div>
    );
}
