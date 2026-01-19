import { useRef } from "react";
import type { MouseEvent } from "react";

import ClassNode from "./nodes/ClassNode";
import InlineEditors from "./canvas/InlineEditors";
import RelationLayer from "./relations/RelationLayer";
import Grid from "./canvas/Grid";
import Axes from "./canvas/Axes";

import { NODE_ATTR_START_Y, getAttrsCount, getMethodsStartY } from "./nodes/layout";
import { screenToWorld } from "../utils/coords";
import { makeSnapshot, type DiagramSnapshotV2 } from "../model/diagram";

import ContextMenu from "./contextmenu/ContextMenu";

import { useCamera } from "./canvas/useCamera";
import { useNodeManipulation } from "./canvas/useNodeManipulation";
import { useInlineEdit } from "./canvas/useInlineEdit";
import { useRelationCreation } from "./relations/useRelationCreation";
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

    const nodeManip = useNodeManipulation({
        svgRef,
        camera: cameraApi.camera,
        getViewById: (id: string) => state.viewsById[id],
        setViewsById: state.setViewsById,
        disabled: (editApi.editingName || editApi.isEditingLine) || relApi.mode,
    });

    function focusRoot() {
        rootRef.current?.focus();
    }

    function getLocalScreenPointFromMouseEvent(e: MouseEvent) {
        const rect = svgRef.current!.getBoundingClientRect();
        return { sx: e.clientX - rect.left, sy: e.clientY - rect.top };
    }

    const ctxMenu = useContextMenu({
        classes: state.classes,
        relations: state.relations,
        onAction: (a) => actions.onContextAction(a),
    });

    function applySnapshot(s: DiagramSnapshotV2) {
        state.setClasses(s.classes);
        state.setViewsById(s.viewsById);
        state.setRelations(s.relations);

        state.setSelectedId(null);
        state.setSelectedRelationId(null);

        ctxMenu.close();
        relApi.cancel();
        editApi.cancelLineEdit();
        editApi.cancelNameEdit();
    }

    const undoApi = useUndoRedo({
        getSnapshot: () => makeSnapshot(state.classes, state.viewsById, state.relations),
        applySnapshot,
    });

    const actions = useDiagramActions({
        state,
        undo: { pushSnapshot: undoApi.pushSnapshot },
        edit: editApi,
        rel: { mode: relApi.mode, setKind: relApi.setKind, cancel: relApi.cancel },
        ctxMenu,
        persistence,
    });

    const input = useDiagramInput({
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
        makeSnapshot: () => makeSnapshot(state.classes, state.viewsById, state.relations),
        actions: {
            deleteSelected: actions.deleteSelected,
            setRelationKindOnSelected: actions.setRelationKindOnSelected,
            editSelectedRelationLabel: actions.editSelectedRelationLabel,
        },
    });

    const attrsCount = state.selectedClass ? getAttrsCount(state.selectedClass.attributes.length) : 0;
    const methodsStartY = getMethodsStartY(attrsCount);

    return (
        <div
            ref={rootRef}
            tabIndex={0}
            onKeyDown={input.onKeyDown}
            onContextMenuCapture={(e) => e.preventDefault()}
            style={{ width: "100%", height: "100%", outline: "none" }}
        >
            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                style={{
                    display: "block",
                    cursor: cameraApi.isPanning ? "grabbing" : (relApi.mode ? "crosshair" : "default"),
                    userSelect: "none",
                }}
                onMouseMove={input.onMouseMove}
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
                    <Grid width={2000} height={2000} scale={cameraApi.camera.scale} />
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
                                onMouseDown={e => input.onNodeMouseDown(c.id, e)}
                                onResizeStart={(handle, e) => input.onResizeStart(c.id, handle, e)}
                                onDoubleClickName={() => {
                                    if (relApi.mode) return;
                                    state.setSelectedId(c.id);
                                    state.setSelectedRelationId(null);
                                    requestAnimationFrame(() => editApi.startEditName());
                                }}
                                onSelect={e => input.onNodeSelectOnly(c.id, e)}
                                onDoubleClickAttribute={i => {
                                    if (relApi.mode) return;
                                    state.setSelectedId(c.id);
                                    state.setSelectedRelationId(null);
                                    requestAnimationFrame(() => editApi.startEditAttribute(i));
                                }}
                                onDoubleClickMethod={i => {
                                    if (relApi.mode) return;
                                    state.setSelectedId(c.id);
                                    state.setSelectedRelationId(null);
                                    requestAnimationFrame(() => editApi.startEditMethod(i));
                                }}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    focusRoot();

                                    cameraApi.allowPan(false);

                                    const { sx, sy } = getLocalScreenPointFromMouseEvent(e);
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
