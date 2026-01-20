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
        setSelectedId: state.setSelectedId,
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

    const relReconnectApi = useRelationReconnect({
        viewsById: state.viewsById,
        relations: state.relations,
        setRelations: state.setRelations,
        disabled: editApi.editingName || editApi.isEditingLine || state.mode === "link",
    });

    const relRoutingApi = useRelationRouting({
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
        setViewsById: state.setViewsById,
        disabled:
            (editApi.editingName || editApi.isEditingLine) ||
            state.mode === "link" ||
            relReconnectApi.isActive ||
            relRoutingApi.isActive,
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
        state.setSelectedId(null);
        state.setSelectedRelationId(null);
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
        relRoutingApi,
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

    const selectedRelation =
        state.selectedRelationId ? state.relations.find(r => r.id === state.selectedRelationId) ?? null : null;

    function getClassNameById(id: string) {
        return state.classes.find(c => c.id === id)?.name ?? id;
    }

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
                setMode={(m) => state.setMode(m)}
                grid={state.grid}
                toggleGrid={() => state.setGrid(g => ({ ...g, enabled: !g.enabled }))}
                setGridSize={(n) => state.setGrid(g => ({ ...g, size: Math.max(10, Math.round(n)) }))}
                undo={() => undoApi.undo()}
                redo={() => undoApi.redo()}
                save={() => persistence.saveLocal()}
                load={() => persistence.loadLocal()}
                exportFile={() => { void persistence.exportFile(); }}
                importFile={() => { void persistence.importFile(); }}
            />

            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                style={{
                    display: "block",
                    cursor:
                        cameraApi.isPanning ? "grabbing"
                            : relReconnectApi.isActive ? "crosshair"
                                : relRoutingApi.isActive ? "move"
                                    : state.mode === "link" ? "crosshair"
                                        : state.mode === "pan" ? "grab"
                                            : state.mode === "addClass" ? "copy"
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
                onMouseUp={input.onMouseUp}
                onMouseLeave={input.onMouseUp}
                onWheel={(e) => {
                    if (ctxMenu.open) { e.preventDefault(); return; }
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
                        onSelectRelation={(id) => {
                            state.setSelectedRelationId(id);
                            state.setSelectedId(null);
                            ctxMenu.close();
                        }}
                        onStartReconnect={({ id, end }) => {
                            state.setSelectedRelationId(id);
                            state.setSelectedId(null);
                            ctxMenu.close();
                            relReconnectApi.start(id, end);
                        }}
                        onContextMenuRelation={({ id, clientX, clientY }) => {
                            if (!svgRef.current) return;

                            const rect = svgRef.current.getBoundingClientRect();
                            const sx = clientX - rect.left;
                            const sy = clientY - rect.top;
                            const world = screenToWorld(sx, sy, cameraApi.camera);

                            state.setSelectedRelationId(id);
                            state.setSelectedId(null);

                            ctxMenu.show(
                                { x: clientX, y: clientY },
                                { kind: "relation", id, worldX: world.x, worldY: world.y }
                            );
                        }}
                        routing={{
                            isActive: relRoutingApi.isActive,
                            relationId: relRoutingApi.relationId,
                            start: relRoutingApi.start,
                            getEffectiveControlPoints: relRoutingApi.getEffectiveControlPoints,
                        }}
                    />

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

                    {state.classes.map(c => {
                        const v = state.viewsById[c.id];
                        if (!v) return null;

                        const isSelected = state.selectedId === c.id;

                        const displayName = isSelected && editApi.editingName ? editApi.nameBuffer : c.name;
                        const displayAttributes =
                            isSelected && editApi.editingAttrIndex !== null
                                ? c.attributes.map((a, idx) => (idx === editApi.editingAttrIndex ? editApi.editBuffer : a))
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
                                    relRoutingApi.isActive ||
                                    (state.mode === "select" && !state.selectedRelationId)
                                }
                                onPortHover={(side) => {
                                    // IMPORTANT : le hover port doit piloter la preview (link ET reconnect)
                                    if ((relApi as any).mode) (relApi as any).hoverToPort?.(c.id, side ?? undefined);
                                    if (relReconnectApi.isActive) (relReconnectApi as any).hoverToPort?.(c.id, side ?? undefined);
                                }}
                                onPortMouseDown={(side, e) => {
                                    e.stopPropagation();
                                    focusRoot();

                                    // Select + clic sur un "+" => bascule Link + démarre depuis CE port
                                    if (
                                        state.mode === "select" &&
                                        !state.selectedRelationId &&
                                        !relReconnectApi.isActive &&
                                        !relRoutingApi.isActive
                                    ) {
                                        ctxMenu.close();
                                        state.setSelectedId(c.id);
                                        state.setSelectedRelationId(null);

                                        state.setMode("link");
                                        (relApi as any).setActive?.(true);
                                        // startFromPort est now tolerant (active le mode si besoin)
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

                                    // Reconnect : commit au clic (utile si tu veux cliquer explicitement)
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
                                onMouseDown={e => input.onNodeMouseDown(c.id, e)}
                                onResizeStart={(handle, e) => input.onResizeStart(c.id, handle, e)}
                                onSelect={e => input.onNodeSelectOnly(c.id, e)}
                                onDoubleClickName={() => {
                                    if (state.mode === "link") return;
                                    if (relReconnectApi.isActive) return;
                                    state.setSelectedId(c.id);
                                    state.setSelectedRelationId(null);
                                    requestAnimationFrame(() => editApi.startEditName());
                                }}
                                onDoubleClickAttribute={i => {
                                    if (state.mode === "link") return;
                                    if (relReconnectApi.isActive) return;
                                    state.setSelectedId(c.id);
                                    state.setSelectedRelationId(null);
                                    requestAnimationFrame(() => editApi.startEditAttribute(i));
                                }}
                                onDoubleClickMethod={i => {
                                    if (state.mode === "link") return;
                                    if (relReconnectApi.isActive) return;
                                    state.setSelectedId(c.id);
                                    state.setSelectedRelationId(null);
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
                                    state.setSelectedRelationId(null);

                                    ctxMenu.show(
                                        { x: e.clientX, y: e.clientY },
                                        { kind: "class", id: c.id, worldX: world.x, worldY: world.y }
                                    );
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
                                if (!editApi.isEditingLine) return;
                                undoApi.pushSnapshot();
                                editApi.commitLineEdit();
                            }}
                            commitName={() => {
                                if (!editApi.editingName) return;
                                undoApi.pushSnapshot();
                                editApi.commitNameEdit();
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
                    selectedRelation={selectedRelation}
                    getClassNameById={getClassNameById}
                    actions={{
                        setClassName: actions.setClassName,
                        setClassAttributes: actions.setClassAttributes,
                        setClassMethods: actions.setClassMethods,
                        setRelationKindOnSelected: actions.setRelationKindOnSelected,
                        setRelationLabelOnSelected: actions.setRelationLabelOnSelected,
                        deleteSelected: actions.deleteSelected,
                        duplicateSelected: actions.duplicateSelected,
                    }}
                />
            </div>

            <ContextMenu
                open={ctxMenu.open}
                x={ctxMenu.x}
                y={ctxMenu.y}
                items={ctxMenu.items}
                onClose={ctxMenu.close}
            />
        </div>
    );
}
