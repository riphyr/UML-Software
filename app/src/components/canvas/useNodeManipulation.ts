import { useRef, useState, type MouseEvent } from "react";
import { screenToWorld, type Camera } from "../../utils/coords";
import type { NodeView } from "../../model/view";
import type { ViewsById } from "../../model/views";
import { updateView } from "../../model/views";

export type ResizeHandle = "nw" | "ne" | "sw" | "se";

export type GridSnap = {
    enabled: boolean;
    size: number;
};

function snap(v: number, grid: GridSnap | undefined) {
    if (!grid || !grid.enabled) return v;
    return Math.round(v / grid.size) * grid.size;
}

export function useNodeManipulation(params: {
    svgRef: React.RefObject<SVGSVGElement | null>;
    camera: Camera;
    getViewById: (id: string) => NodeView | undefined;
    getSelectedNodeIds: () => string[];
    setViewsById: React.Dispatch<React.SetStateAction<ViewsById>>;
    disabled: boolean;
    grid?: GridSnap;
}) {
    const { svgRef, camera, getViewById, getSelectedNodeIds, setViewsById, disabled, grid } = params;

    const [draggingNode, setDraggingNode] = useState(false);
    const [resizing, setResizing] = useState<ResizeHandle | null>(null);

    const activeIdRef = useRef<string | null>(null);
    const lastManipulatedIdRef = useRef<string | null>(null);
    const didChangeRef = useRef(false);
    const lastDragDeltaRef = useRef<{ dx: number; dy: number } | null>(null);

    const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const dragStart = useRef<{ wx: number; wy: number } | null>(null);
    const dragStartViews = useRef<Record<string, { x: number; y: number }>>({});
    const resizeStart = useRef<{ x: number; y: number; w: number; h: number; vx: number; vy: number }>({
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        vx: 0,
        vy: 0,
    });

    function getLocalScreenPoint(e: MouseEvent) {
        const rect = svgRef.current!.getBoundingClientRect();
        return { sx: e.clientX - rect.left, sy: e.clientY - rect.top };
    }

    function getActiveId() {
        return activeIdRef.current;
    }

    function startDrag(id: string, e: MouseEvent) {
        if (disabled) return;

        const view = getViewById(id);
        if (!view) return;

        const { sx, sy } = getLocalScreenPoint(e);
        const world = screenToWorld(sx, sy, camera);

        // group drag : si l'id cliqué fait partie de la sélection multi => on déplace tout le groupe.
        const selected = getSelectedNodeIds();
        const dragIds = selected.length > 1 && selected.includes(id) ? selected : [id];

        activeIdRef.current = id;
        lastManipulatedIdRef.current = id;
        didChangeRef.current = false;

        dragStart.current = { wx: world.x, wy: world.y };
        const startMap: Record<string, { x: number; y: number }> = {};
        for (const nid of dragIds) {
            const v = getViewById(nid);
            if (v) startMap[nid] = { x: v.x, y: v.y };
        }
        dragStartViews.current = startMap;

        dragOffset.current = { x: world.x - view.x, y: world.y - view.y };

        setDraggingNode(true);
    }

    function startResize(id: string, handle: ResizeHandle, e: MouseEvent) {
        if (disabled) return;

        const view = getViewById(id);
        if (!view) return;

        const { sx, sy } = getLocalScreenPoint(e);
        const world = screenToWorld(sx, sy, camera);

        activeIdRef.current = id;
        lastManipulatedIdRef.current = id;
        didChangeRef.current = false;

        resizeStart.current = {
            x: world.x,
            y: world.y,
            w: view.width,
            h: view.height,
            vx: view.x,
            vy: view.y,
        };

        setResizing(handle);
    }

    function onMouseMove(e: MouseEvent<SVGSVGElement>) {
        const id = activeIdRef.current;
        if (!id) return false;
        if (!draggingNode && !resizing) return false;

        const { sx, sy } = getLocalScreenPoint(e);
        const world = screenToWorld(sx, sy, camera);

        if (resizing) {
            const start = resizeStart.current;

            let dx = world.x - start.x;
            let dy = world.y - start.y;

            let nx = start.vx;
            let ny = start.vy;
            let nw = start.w;
            let nh = start.h;

            if (resizing.includes("e")) nw = Math.max(80, start.w + dx);
            if (resizing.includes("s")) nh = Math.max(60, start.h + dy);
            if (resizing.includes("w")) {
                nw = Math.max(80, start.w - dx);
                nx = start.vx + dx;
            }
            if (resizing.includes("n")) {
                nh = Math.max(60, start.h - dy);
                ny = start.vy + dy;
            }

            nw = snap(nw, grid);
            nh = snap(nh, grid);
            nx = snap(nx, grid);
            ny = snap(ny, grid);

            didChangeRef.current = true;
            setViewsById((prev) => updateView(prev, id, { x: nx, y: ny, width: nw, height: nh, sizeMode: "locked" }));
            return true;
        }

        if (draggingNode) {
            const start = dragStart.current;
            const startViews = dragStartViews.current;

            // fallback single
            if (!start || !startViews[id]) {
                let nx = world.x - dragOffset.current.x;
                let ny = world.y - dragOffset.current.y;
                nx = snap(nx, grid);
                ny = snap(ny, grid);
                didChangeRef.current = true;
                setViewsById((prev) => updateView(prev, id, { x: nx, y: ny }));
                lastDragDeltaRef.current = { dx: nx - (startViews[id]?.x ?? nx), dy: ny - (startViews[id]?.y ?? ny) };
                return true;
            }

            const dx = world.x - start.wx;
            const dy = world.y - start.wy;

            // snap: basé sur le node actif, puis on applique le delta à tout le groupe.
            const activeStart = startViews[id];
            let nx = activeStart.x + dx;
            let ny = activeStart.y + dy;
            nx = snap(nx, grid);
            ny = snap(ny, grid);

            const ddx = nx - activeStart.x;
            const ddy = ny - activeStart.y;
            lastDragDeltaRef.current = { dx: ddx, dy: ddy };

            didChangeRef.current = true;
            setViewsById((prev) => {
                let next = prev;
                for (const [nid, v0] of Object.entries(startViews)) {
                    next = updateView(next, nid, { x: v0.x + ddx, y: v0.y + ddy });
                }
                return next;
            });

            return true;
        }

        return false;
    }

    function stop() {
        setDraggingNode(false);
        setResizing(null);
        activeIdRef.current = null;
        dragStart.current = null;
        dragStartViews.current = {};
        lastDragDeltaRef.current = null;
    }

    function consumeLastDragDelta() {
        const d = lastDragDeltaRef.current;
        lastDragDeltaRef.current = null;
        return d;
    }

    function consumeLastManipulatedId() {
        const id = lastManipulatedIdRef.current;
        lastManipulatedIdRef.current = null;
        return id;
    }

    function consumeDidChange() {
        const v = didChangeRef.current;
        didChangeRef.current = false;
        return v;
    }

    return {
        draggingNode,
        resizing,
        startDrag,
        startResize,
        onMouseMove,
        stop,
        consumeDidChange,
        consumeLastDragDelta,
        consumeLastManipulatedId,
        getActiveId,
    };
}
