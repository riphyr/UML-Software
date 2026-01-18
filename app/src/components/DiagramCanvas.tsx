import { useMemo, useRef, useState, type MouseEvent, type KeyboardEvent } from "react";
import ClassNode from "./nodes/ClassNode";
import InlineEditors from "./canvas/InlineEditors";

import type { UmlClass } from "../model/uml";
import type { NodeView } from "../model/view";

import { useCamera } from "./canvas/useCamera";
import { useNodeManipulation, type ResizeHandle } from "./canvas/useNodeManipulation";
import { useInlineEdit } from "./canvas/useInlineEdit";

import { NODE_ATTR_START_Y, getAttrsCount, getMethodsStartY } from "./nodes/layout";

import Grid from "./canvas/Grid";
import Axes from "./canvas/Axes";

import { screenToWorld } from "../utils/coords";

import ContextMenu from "./contextmenu/ContextMenu";
import { useContextMenu } from "./contextmenu/useContextMenu";
import type { ContextAction } from "./contextmenu/types";

const DEFAULT_NODE_W = 260;
const DEFAULT_NODE_H = 150;

export default function DiagramCanvas() {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);

    const [classes, setClasses] = useState<UmlClass[]>([
        {
            id: "class-1",
            name: "ClassName",
            attributes: ["+ id: int", "- title: string"],
            methods: ["+ save(): void", "+ load(path: string): boolean"],
        },
    ]);

    const [views, setViews] = useState<NodeView[]>([
        { id: "class-1", x: 100, y: 100, width: DEFAULT_NODE_W, height: DEFAULT_NODE_H },
    ]);

    const [selectedId, setSelectedId] = useState<string | null>(null);

    const cameraApi = useCamera(svgRef);

    const viewsById = useMemo(() => {
        const map: Record<string, NodeView> = {};
        for (const v of views) map[v.id] = v;
        return map;
    }, [views]);

    const selectedClass = useMemo(
        () => (selectedId ? classes.find(c => c.id === selectedId) ?? null : null),
        [classes, selectedId]
    );

    const selectedView = useMemo(
        () => (selectedId ? viewsById[selectedId] ?? null : null),
        [viewsById, selectedId]
    );

    const editApi = useInlineEdit({
        selectedId,
        classes,
        setClasses,
    });

    const nodeManip = useNodeManipulation({
        svgRef,
        camera: cameraApi.camera,
        getViewById: (id: string) => viewsById[id],
        setViews,
        disabled: editApi.editingName || editApi.isEditingLine,
    });

    const ctxMenu = useContextMenu({
        classes,
        onAction: onContextAction,
    });

    const attrsCount = selectedClass ? getAttrsCount(selectedClass.attributes.length) : 0;
    const methodsStartY = getMethodsStartY(attrsCount);

    function focusRoot() {
        rootRef.current?.focus();
    }

    function getLocalScreenPointFromMouseEvent(e: MouseEvent) {
        const rect = svgRef.current!.getBoundingClientRect();
        return { sx: e.clientX - rect.left, sy: e.clientY - rect.top };
    }

    function newId() {
        // pas besoin de lib : unique dans la session
        return `class-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
        setViews(vs => [...vs, newView]);
        setSelectedId(id);

        editApi.stopEditName();
        editApi.cancelLineEdit();
    }

    function deleteSelected() {
        if (!selectedId) return;

        const id = selectedId;

        editApi.commitLineEdit();
        editApi.stopEditName();

        setClasses(cs => cs.filter(c => c.id !== id));
        setViews(vs => vs.filter(v => v.id !== id));
        setSelectedId(null);
    }

    function onContextAction(a: ContextAction) {
        if (a.type === "create_class") {
            createClassAtWorld(a.worldX, a.worldY);
            return;
        }
        if (a.type === "delete_class") {
            if (selectedId !== a.id) setSelectedId(a.id);
            // supprime by id
            editApi.commitLineEdit();
            editApi.stopEditName();
            setClasses(cs => cs.filter(c => c.id !== a.id));
            setViews(vs => vs.filter(v => v.id !== a.id));
            setSelectedId(prev => (prev === a.id ? null : prev));
            return;
        }
        if (a.type === "rename_class") {
            setSelectedId(a.id);
            editApi.startEditName();
            return;
        }
    }

    function onBackgroundMouseDown(e: MouseEvent<SVGRectElement>) {
        if (e.button !== 0) return;

        ctxMenu.close();

        focusRoot();

        editApi.commitLineEdit();
        editApi.stopEditName();
        setSelectedId(null);

        cameraApi.beginPan(e);
    }

    function onBackgroundContextMenu(e: MouseEvent<SVGRectElement>) {
        e.preventDefault();
        focusRoot();

        const { sx, sy } = getLocalScreenPointFromMouseEvent(e);
        const world = screenToWorld(sx, sy, cameraApi.camera);

        // menu écran = e.clientX / e.clientY
        ctxMenu.show({ x: e.clientX, y: e.clientY }, { kind: "background", worldX: world.x, worldY: world.y });
    }

    function onNodeMouseDown(id: string, e: MouseEvent) {
        ctxMenu.close();

        e.stopPropagation();
        focusRoot();

        setSelectedId(id);
        nodeManip.startDrag(id, e);
    }

    function onResizeStart(id: string, handle: ResizeHandle, e: MouseEvent) {
        e.stopPropagation();
        focusRoot();

        setSelectedId(id);
        nodeManip.startResize(id, handle, e);
    }

    function onMouseMove(e: MouseEvent<SVGSVGElement>) {
        if (ctxMenu.open) return;

        const usedByNode = nodeManip.onMouseMove(e);
        if (usedByNode) return;

        cameraApi.panMove(e);
    }

    function onMouseUp() {
        cameraApi.endPan();
        nodeManip.stop();
    }

    function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
        if (e.key === "Delete") {
            if (editApi.editingName || editApi.isEditingLine) return;
            e.preventDefault();
            deleteSelected();
        }
    }

    return (
        <div
            ref={rootRef}
            tabIndex={0}
            onKeyDown={onKeyDown}
            onContextMenuCapture={(e) => {
                // neutralise le menu natif Tauri partout
                e.preventDefault();
            }}
            style={{ width: "100%", height: "100%", outline: "none" }}
        >
        <svg
                ref={svgRef}
                width="100%"
                height="100%"
                style={{
                    display: "block",
                    cursor: cameraApi.isPanning ? "grabbing" : "default",
                    userSelect: "none",
                }}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
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
                    onMouseDown={onBackgroundMouseDown}
                    onContextMenu={onBackgroundContextMenu}
                />

                <g transform={`translate(${cameraApi.camera.x}, ${cameraApi.camera.y}) scale(${cameraApi.camera.scale})`}>
                    <Grid width={2000} height={2000} scale={cameraApi.camera.scale} />
                    <Axes />

                    {classes.map(c => {
                        const v = viewsById[c.id];
                        if (!v) return null;

                        const isSelected = selectedId === c.id;

                        return (
                            <ClassNode
                                key={c.id}
                                x={v.x}
                                y={v.y}
                                width={v.width}
                                height={v.height}
                                name={c.name}
                                attributes={c.attributes}
                                methods={c.methods}
                                selected={isSelected}
                                editing={isSelected && editApi.editingName}
                                onMouseDown={e => onNodeMouseDown(c.id, e)}
                                onResizeStart={(handle, e) => onResizeStart(c.id, handle, e)}
                                onDoubleClickName={() => {
                                    setSelectedId(c.id);
                                    editApi.startEditName();
                                }}
                                onNameChange={editApi.onNameChange}
                                onDoubleClickAttribute={i => {
                                    setSelectedId(c.id);
                                    editApi.startEditAttribute(i);
                                }}
                                onDoubleClickMethod={i => {
                                    setSelectedId(c.id);
                                    editApi.startEditMethod(i);
                                }}
                                onContextMenu={(e) => {
                                    // ClassNode fait déjà preventDefault/stopPropagation, mais on sécurise.
                                    e.preventDefault();
                                    e.stopPropagation();
                                    focusRoot();

                                    const { sx, sy } = getLocalScreenPointFromMouseEvent(e);
                                    const world = screenToWorld(sx, sy, cameraApi.camera);

                                    setSelectedId(c.id);
                                    ctxMenu.show({ x: e.clientX, y: e.clientY }, { kind: "class", id: c.id, worldX: world.x, worldY: world.y });
                                }}
                            />
                        );
                    })}

                    {selectedView && (
                        <InlineEditors
                            x={selectedView.x}
                            y={selectedView.y}
                            width={selectedView.width}
                            editingAttrIndex={editApi.editingAttrIndex}
                            editingMethodIndex={editApi.editingMethodIndex}
                            attrStartY={NODE_ATTR_START_Y}
                            methodsStartY={methodsStartY}
                            editBuffer={editApi.editBuffer}
                            setEditBuffer={editApi.setEditBuffer}
                            commit={editApi.commitLineEdit}
                            cancel={editApi.cancelLineEdit}
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
