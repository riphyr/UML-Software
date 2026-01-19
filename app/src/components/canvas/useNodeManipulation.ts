import { useRef, useState, type MouseEvent } from "react";
import { screenToWorld, type Camera } from "../../utils/coords";
import type { NodeView } from "../../model/view";
import type { ViewsById } from "../../model/views";
import { updateView } from "../../model/views";

export type ResizeHandle = "nw" | "ne" | "sw" | "se";

export function useNodeManipulation(params: {
    svgRef: React.RefObject<SVGSVGElement | null>;
    camera: Camera;
    getViewById: (id: string) => NodeView | undefined;
    setViewsById: React.Dispatch<React.SetStateAction<ViewsById>>;
    disabled: boolean;
}) {
    const { svgRef, camera, getViewById, setViewsById, disabled } = params;

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

        if (resizing) {
            const dx = world.x - resizeStart.current.x;
            const dy = world.y - resizeStart.current.y;

            let nx = resizeStart.current.vx;
            let ny = resizeStart.current.vy;
            let nw = resizeStart.current.w;
            let nh = resizeStart.current.h;

            if (resizing.includes("e")) nw += dx;
            if (resizing.includes("s")) nh += dy;
            if (resizing.includes("w")) {
                nw -= dx;
                nx += dx;
            }
            if (resizing.includes("n")) {
                nh -= dy;
                ny += dy;
            }

            nw = Math.max(120, nw);
            nh = Math.max(60, nh);

            didChangeRef.current = true;
            setViewsById(prev => updateView(prev, id, { x: nx, y: ny, width: nw, height: nh }));
            return true;
        }

        if (draggingNode) {
            const nx = world.x - dragOffset.current.x;
            const ny = world.y - dragOffset.current.y;

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