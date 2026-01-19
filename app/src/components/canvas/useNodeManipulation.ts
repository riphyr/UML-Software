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
    setViewsById: React.Dispatch<React.SetStateAction<ViewsById>>;
    disabled: boolean;
    grid?: GridSnap;
}) {
    const { svgRef, camera, getViewById, setViewsById, disabled, grid } = params;

    const [draggingNode, setDraggingNode] = useState(false);
    const [resizing, setResizing] = useState<ResizeHandle | null>(null);

    const activeIdRef = useRef<string | null>(null);
    const didChangeRef = useRef(false);

    const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
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

    function startDrag(id: string, e: MouseEvent) {
        if (disabled) return;

        const view = getViewById(id);
        if (!view) return;

        const { sx, sy } = getLocalScreenPoint(e);
        const world = screenToWorld(sx, sy, camera);

        activeIdRef.current = id;
        didChangeRef.current = false;
        dragOffset.current = {
            x: world.x - view.x,
            y: world.y - view.y,
        };

        setDraggingNode(true);
    }

    function startResize(id: string, handle: ResizeHandle, e: MouseEvent) {
        if (disabled) return;

        const view = getViewById(id);
        if (!view) return;

        const { sx, sy } = getLocalScreenPoint(e);
        const world = screenToWorld(sx, sy, camera);

        activeIdRef.current = id;
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

        const MIN_W = 120;
        const MIN_H = 60;

        if (resizing) {
            const dx = world.x - resizeStart.current.x;
            const dy = world.y - resizeStart.current.y;

            let left = resizeStart.current.vx;
            let top = resizeStart.current.vy;
            let right = resizeStart.current.vx + resizeStart.current.w;
            let bottom = resizeStart.current.vy + resizeStart.current.h;

            if (resizing.includes("e")) right += dx;
            if (resizing.includes("s")) bottom += dy;
            if (resizing.includes("w")) left += dx;
            if (resizing.includes("n")) top += dy;

            // min size avant snap
            if (right - left < MIN_W) {
                if (resizing.includes("w")) left = right - MIN_W;
                else right = left + MIN_W;
            }
            if (bottom - top < MIN_H) {
                if (resizing.includes("n")) top = bottom - MIN_H;
                else bottom = top + MIN_H;
            }

            // snap uniquement sur les bords manipulés
            if (grid?.enabled) {
                if (resizing.includes("w")) left = snap(left, grid);
                if (resizing.includes("e")) right = snap(right, grid);
                if (resizing.includes("n")) top = snap(top, grid);
                if (resizing.includes("s")) bottom = snap(bottom, grid);

                // re-min après snap
                if (right - left < MIN_W) {
                    if (resizing.includes("w")) left = right - MIN_W;
                    else right = left + MIN_W;
                }
                if (bottom - top < MIN_H) {
                    if (resizing.includes("n")) top = bottom - MIN_H;
                    else bottom = top + MIN_H;
                }
            }

            const nx = left;
            const ny = top;
            const nw = right - left;
            const nh = bottom - top;

            didChangeRef.current = true;
            setViewsById(prev => updateView(prev, id, { x: nx, y: ny, width: nw, height: nh }));
            return true;
        }

        if (draggingNode) {
            let nx = world.x - dragOffset.current.x;
            let ny = world.y - dragOffset.current.y;

            nx = snap(nx, grid);
            ny = snap(ny, grid);

            didChangeRef.current = true;
            setViewsById(prev => updateView(prev, id, { x: nx, y: ny }));
            return true;
        }

        return false;
    }

    function stop() {
        setDraggingNode(false);
        setResizing(null);
        activeIdRef.current = null;
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
    };
}
