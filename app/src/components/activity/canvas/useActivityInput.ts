import type { RefObject } from "react";
import type { ActivityMode } from "./useActivityState";
import type { ActivityNode, ActivityViewsById } from "../../../model/activity/activity";
import { screenToWorld } from "../utils/coords";
import { snap } from "../utils/geom";
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

    link: {
        active: boolean;
        fromId: string | null;
        setToWorld: (p: { x: number; y: number } | null) => void;
        start: (fromId: string) => void;
        cancel: () => void;
    };

    commitFlow: (args: { fromId: string; toId: string }) => void;

    createNodeAt: (world: { x: number; y: number }) => void;

    deleteSelected: () => void;
}) {
    const drag = { active: false, id: "", ox: 0, oy: 0 };

    function worldFromEvent(e: React.MouseEvent) {
        const rect = p.svgRef.current!.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        return screenToWorld(sx, sy, p.camera);
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
    }

    function onBackgroundMouseDown(e: React.MouseEvent) {
        if (!p.svgRef.current) return;

        const world = worldFromEvent(e);

        // création (1 clic puis retour select)
        if (p.mode === "addNode" || p.mode === "addObject") {
            p.undoPush();
            p.createNodeAt(world);
            p.setMode("select");
            return;
        }

        // clic fond en link => annule et repasse select
        if (p.mode === "link") {
            if (p.link.active) p.link.cancel();
            p.setMode("select");
        }

        // sélectionner un flow si hit
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

        // link: 2 clics => crée puis retour select
        if (p.mode === "link") {
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
            p.setMode("select");
            return;
        }

        // selection multi (Shift)
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
    };
}
