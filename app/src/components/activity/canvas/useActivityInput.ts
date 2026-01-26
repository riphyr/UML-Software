import type { RefObject } from "react";
import type { ActivityMode } from "./useActivityState";
import type { ActivityNode, ActivityViewsById } from "../../../model/activity/activity";
import { screenToWorld } from "../utils/coords";
import { pointInRect, snap } from "../utils/geom";
import { hitTestFlow } from "../flows/flowHitTest";

export function useActivityInput(p: {
    svgRef: RefObject<SVGSVGElement | null>;
    camera: { x: number; y: number; scale: number };

    mode: ActivityMode;
    setMode: (m: ActivityMode) => void;

    nodes: ActivityNode[];
    setNodes: React.Dispatch<React.SetStateAction<ActivityNode[]>>;

    flows: any[];
    viewsById: ActivityViewsById;
    setViewsById: React.Dispatch<React.SetStateAction<ActivityViewsById>>;

    selectedNodeIds: string[];
    setSelectedNodeIds: React.Dispatch<React.SetStateAction<string[]>>;
    selectedFlowId: string | null;
    setSelectedFlowId: React.Dispatch<React.SetStateAction<string | null>>;

    grid: { enabled: boolean; size: number };

    undoPush: () => void;

    // link tool
    link: {
        active: boolean;
        fromId: string | null;
        setToWorld: (p: { x: number; y: number } | null) => void;
        start: (fromId: string) => void;
        cancel: () => void;
    };
    commitFlow: (args: { fromId: string; toId: string }) => void;

    // creation nodes
    createNodeAt: (world: { x: number; y: number }) => void;

    // delete
    deleteSelected: () => void;
}) {
    const drag = { active: false, id: "", ox: 0, oy: 0 };

    function worldFromEvent(e: React.MouseEvent) {
        const rect = p.svgRef.current!.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        return screenToWorld(sx, sy, p.camera);
    }

    function hitNode(world: { x: number; y: number }) {
        // topmost: last in array wins => iterate reverse
        for (let i = p.nodes.length - 1; i >= 0; i--) {
            const n = p.nodes[i];
            const v = p.viewsById[n.id];
            if (!v) continue;
            if (pointInRect(world.x, world.y, { x: v.x, y: v.y, w: v.w, h: v.h })) return n.id;
        }
        return null;
    }

    function onKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Escape") {
            if (p.link.active) p.link.cancel();
            p.setMode("select");
            return;
        }
        if (e.key === "Delete" || e.key === "Backspace") {
            p.undoPush();
            p.deleteSelected();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
            // undo géré par la toolbar dans cette V1
        }
    }

    function onBackgroundMouseDown(e: React.MouseEvent) {
        if (!p.svgRef.current) return;

        const world = worldFromEvent(e);

        // mode création node
        if (p.mode.startsWith("add")) {
            p.undoPush();
            p.createNodeAt(world);
            return;
        }

        // sélection: tenter flow si rien sur node
        const flowId = hitTestFlow({
            flows: p.flows as any,
            viewsById: p.viewsById,
            world,
            thresholdWorld: 8 / p.camera.scale,
        });

        if (flowId) {
            p.setSelectedFlowId(flowId);
            p.setSelectedNodeIds([]);
            return;
        }

        p.setSelectedFlowId(null);
        p.setSelectedNodeIds([]);
    }

    function onMouseMove(e: React.MouseEvent) {
        if (!p.svgRef.current) return;
        const world = worldFromEvent(e);

        if (p.link.active) {
            p.link.setToWorld(world);
            return;
        }

        if (drag.active) {
            const id = drag.id;
            p.setViewsById((prev) => {
                const v = prev[id];
                if (!v) return prev;

                let nx = world.x - drag.ox;
                let ny = world.y - drag.oy;

                if (p.grid.enabled) {
                    nx = snap(nx, p.grid.size);
                    ny = snap(ny, p.grid.size);
                }

                return { ...prev, [id]: { ...v, x: nx, y: ny } };
            });
        }
    }

    function onMouseUp() {
        (drag as any).active = false;
        (drag as any).id = "";
        p.link.setToWorld(null);
    }

    function onNodeMouseDown(id: string, e: React.MouseEvent) {
        e.stopPropagation();
        if (!p.svgRef.current) return;

        // link mode: click node selects from/to
        if (p.mode === "linkControl" || p.mode === "linkObject") {
            if (!p.link.active) {
                p.link.start(id);
                p.setSelectedNodeIds([id]);
                p.setSelectedFlowId(null);
                return;
            }
            const fromId = p.link.fromId;
            if (!fromId) return;
            if (fromId === id) return;

            p.undoPush();
            p.commitFlow({ fromId, toId: id });
            p.link.cancel();
            return;
        }

        // selection
        if (e.shiftKey) {
            p.setSelectedFlowId(null);
            p.setSelectedNodeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
        } else {
            p.setSelectedFlowId(null);
            p.setSelectedNodeIds([id]);
        }

        // drag
        const world = worldFromEvent(e);
        const v = p.viewsById[id];
        if (!v) return;
        (drag as any).active = true;
        (drag as any).id = id;
        (drag as any).ox = world.x - v.x;
        (drag as any).oy = world.y - v.y;
    }

    function onDoubleClickNode(id: string) {
        // rien de spécial en V1 (édition via inspector)
        p.setSelectedNodeIds([id]);
        p.setSelectedFlowId(null);
    }

    return {
        onKeyDown,
        onBackgroundMouseDown,
        onMouseMove,
        onMouseUp,
        onNodeMouseDown,
        onDoubleClickNode,
        hitNode, // utile si tu veux étendre
    };
}
