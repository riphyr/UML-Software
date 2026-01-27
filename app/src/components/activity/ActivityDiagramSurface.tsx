import { useMemo, useRef } from "react";

import type { ActivityNode } from "../../model/activity/activity";

import ActivityToolbar from "./ActivityToolbar";
import ActivityInspector from "./ActivityInspector";

import ActivityGrid from "./canvas/ActivityGrid";
import ActivityAxes from "./canvas/ActivityAxes";
import { useActivityCamera } from "./canvas/useActivityCamera";
import { useActivityState } from "./canvas/useActivityState";
import { useActivityUndoRedo } from "./canvas/useActivityUndoRedo";
import { useActivityActions } from "./canvas/useActivityActions";
import { useActivityLinkCreation } from "./canvas/useActivityLinkCreation";
import { useActivityInput } from "./canvas/useActivityInput";

import ActivityNodeView from "./nodes/ActivityNode";
import ActivityFlowLayer from "./flows/ActivityFlowLayer";

import { normalizeActivitySnapshot } from "../../model/activity/activitySnapshot";

import { uid } from "./utils/id";
import { snap } from "./utils/geom";

import {
    ACTION_H,
    ACTION_W,
    DECISION_SIZE,
    FINAL_R,
    FORK_H,
    FORK_W,
    INITIAL_R,
    OBJECT_H,
    OBJECT_W,
} from "./nodes/layout";

function defaultSize(kind: ActivityNode["kind"]) {
    if (kind === "action") return { w: ACTION_W, h: ACTION_H };
    if (kind === "object") return { w: OBJECT_W, h: OBJECT_H };
    if (kind === "decision" || kind === "merge") return { w: DECISION_SIZE, h: DECISION_SIZE };
    if (kind === "fork" || kind === "join") return { w: FORK_W, h: FORK_H };
    if (kind === "initial") return { w: INITIAL_R * 2 + 6, h: INITIAL_R * 2 + 6 };
    if (kind === "final") return { w: FINAL_R * 2 + 6, h: FINAL_R * 2 + 6 };
    return { w: 120, h: 50 };
}

export default function ActivityDiagramSurface() {
    const rootRef = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);

    const s = useActivityState();
    const cam = useActivityCamera(svgRef);

    const undo = useActivityUndoRedo({
        getSnapshot: () => normalizeActivitySnapshot(s.getSnapshot()),
        applySnapshot: (snap) => s.applySnapshot(normalizeActivitySnapshot(snap)),
    });

    const actions = useActivityActions({
        nodes: s.nodes,
        setNodes: s.setNodes,
        flows: s.flows,
        setFlows: s.setFlows,
        selectedNodeIds: s.selectedNodeIds,
        setSelectedNodeIds: s.setSelectedNodeIds,
        selectedFlowId: s.selectedFlowId,
        setSelectedFlowId: s.setSelectedFlowId,
    });

    const linkKind = s.mode === "linkObject" ? "object" : "control";
    const link = useActivityLinkCreation({ viewsById: s.viewsById, kind: linkKind });

    function createNodeAt(world: { x: number; y: number }) {
        const kind =
            s.mode === "addInitial"
                ? "initial"
                : s.mode === "addFinal"
                    ? "final"
                    : s.mode === "addDecision"
                        ? "decision"
                        : s.mode === "addMerge"
                            ? "merge"
                            : s.mode === "addFork"
                                ? "fork"
                                : s.mode === "addJoin"
                                    ? "join"
                                    : s.mode === "addObject"
                                        ? "object"
                                        : "action";

        const id = uid("node");
        const size = defaultSize(kind);

        let x = world.x - size.w / 2;
        let y = world.y - size.h / 2;

        if (s.grid.enabled) {
            x = snap(x, s.grid.size);
            y = snap(y, s.grid.size);
        }

        const node: ActivityNode = { id, kind, name: "" };

        s.setNodes((prev) => [node, ...prev]);
        s.setViewsById((prev) => ({ ...prev, [id]: { x, y, w: size.w, h: size.h } }));
        s.setSelectedNodeIds([id]);
        s.setSelectedFlowId(null);
    }

    const input = useActivityInput({
        svgRef,
        camera: cam.camera,

        mode: s.mode,
        setMode: s.setMode,

        nodes: s.nodes,
        setNodes: s.setNodes,

        flows: s.flows as any,
        viewsById: s.viewsById,
        setViewsById: s.setViewsById,

        selectedNodeIds: s.selectedNodeIds,
        setSelectedNodeIds: s.setSelectedNodeIds,
        selectedFlowId: s.selectedFlowId,
        setSelectedFlowId: s.setSelectedFlowId,

        grid: s.grid,

        undoPush: () => undo.push(),

        link: {
            active: link.active,
            fromId: link.fromId,
            setToWorld: link.setToWorld,
            start: link.start,
            cancel: link.cancel,
        },
        commitFlow: ({ fromId, toId }) => actions.createFlow({ kind: link.kind, fromId, toId }),

        createNodeAt,

        deleteSelected: actions.deleteSelected,
    });

    const selectedNodes = useMemo(() => s.selectedNodes, [s.selectedNodes]);
    const selectedFlow = useMemo(() => s.selectedFlow, [s.selectedFlow]);

    return (
        <div
            ref={rootRef}
            tabIndex={0}
            onKeyDown={input.onKeyDown}
            style={{ width: "100%", height: "100%", position: "relative", outline: "none" }}
        >
            <ActivityToolbar
                mode={s.mode}
                setMode={(m) => { s.setMode(m); if (m !== "linkControl" && m !== "linkObject") link.cancel(); }}
                undo={() => undo.undo()}
                redo={() => undo.redo()}
                grid={s.grid}
                toggleGrid={() => s.setGrid({ ...s.grid, enabled: !s.grid.enabled })}
                setGridSize={(n) => s.setGrid({ ...s.grid, size: Math.max(4, Math.floor(n)) })}
                recenter={() => cam.setCamera({ x: 0, y: 0, scale: 1 })}
            />

            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                style={{
                    display: "block",
                    cursor: cam.isPanning
                        ? "grabbing"
                        : link.active
                            ? "crosshair"
                            : s.mode === "select"
                                ? "grab"
                                : "default",
                    userSelect: "none",
                }}
                onWheel={cam.onWheel}
                onMouseDown={(e) => {
                    // Background pan: left-drag in Select mode.
                    // (Nodes/flows stopPropagation so this handler is only for the background.)
                    if (e.button === 0 && s.mode === "select" && !link.active) {
                        e.preventDefault();
                        cam.beginPan(e);
                        return;
                    }

                    cam.onMouseDown(e); // middle mouse pan
                    if (e.button !== 1) input.onBackgroundMouseDown(e);
                }}
                onMouseMove={(e) => {
                    cam.onMouseMove(e);
                    input.onMouseMove(e);
                }}
                onMouseUp={() => {
                    cam.onMouseUp();
                    input.onMouseUp();
                }}
                onMouseLeave={() => {
                    cam.onMouseUp();
                    input.onMouseUp();
                }}
            >
                <g transform={`translate(${cam.camera.x}, ${cam.camera.y}) scale(${cam.camera.scale})`}>
                    <ActivityGrid scale={cam.camera.scale} enabled={s.grid.enabled} base={s.grid.size} extent={200000} />
                    <ActivityAxes scale={cam.camera.scale} extent={200000} />

                    <ActivityFlowLayer
                        flows={s.flows}
                        viewsById={s.viewsById}
                        selectedFlowId={s.selectedFlowId}
                        onSelectFlow={(id) => {
                            s.setSelectedFlowId(id);
                            s.setSelectedNodeIds([]);
                        }}
                        scale={cam.camera.scale}
                    />

                    {link.previewLine && (
                        <line
                            x1={link.previewLine.a.x}
                            y1={link.previewLine.a.y}
                            x2={link.previewLine.b.x}
                            y2={link.previewLine.b.y}
                            stroke="#ff355d"
                            strokeWidth={2 / cam.camera.scale}
                            strokeDasharray={`${6 / cam.camera.scale} ${4 / cam.camera.scale}`}
                            pointerEvents="none"
                        />
                    )}

                    {s.nodes.map((n) => {
                        const v = s.viewsById[n.id];
                        if (!v) return null;
                        const selected = s.selectedNodeIds.includes(n.id);

                        return (
                            <ActivityNodeView
                                key={n.id}
                                node={n}
                                view={v}
                                selected={selected}
                                onMouseDown={(e) => input.onNodeMouseDown(n.id, e)}
                                onDoubleClick={() => input.onDoubleClickNode(n.id)}
                            />
                        );
                    })}
                </g>
            </svg>

            <div
                style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    width: 420,
                    maxHeight: "calc(100% - 24px)",
                    overflow: "auto",
                    zIndex: 10,
                }}
            >
                <ActivityInspector
                    selectedNodes={selectedNodes}
                    selectedFlow={selectedFlow}
                    setNodeName={(id, name) => {
                        undo.push();
                        actions.setNodeName(id, name);
                    }}
                    setFlowLabel={(id, label) => {
                        undo.push();
                        actions.setFlowLabel(id, label);
                    }}
                    setFlowGuard={(id, guard) => {
                        undo.push();
                        actions.setFlowGuard(id, guard);
                    }}
                    deleteSelected={() => {
                        undo.push();
                        actions.deleteSelected();
                    }}
                />
            </div>
        </div>
    );
}
