import { useRef, useState, type MouseEvent } from "react";
import { screenToWorld, type Camera } from "../../utils/coords";
import type { NodeView } from "../../model/view";

export type ResizeHandle = "nw" | "ne" | "sw" | "se";

export function useNodeManipulation(params: {
    svgRef: React.RefObject<SVGSVGElement | null>;
    camera: Camera;
    getViewById: (id: string) => NodeView | undefined;
    setViews: React.Dispatch<React.SetStateAction<NodeView[]>>;
    disabled: boolean;
}) {
    const { svgRef, camera, getViewById, setViews, disabled } = params;

    const [draggingNode, setDraggingNode] = useState(false);
    const [resizing, setResizing] = useState<ResizeHandle | null>(null);

    const activeIdRef = useRef<string | null>(null);

    const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const resizeStart = useRef<{ x: number; y: number; w: number; h: number }>({
        x: 0,
        y: 0,
        w: 0,
        h: 0,
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
        resizeStart.current = {
            x: world.x,
            y: world.y,
            w: view.width,
            h: view.height,
        };

        setResizing(handle);
    }

    // Retourne true si l’event a été consommé (drag/resize)
    function onMouseMove(e: MouseEvent<SVGSVGElement>) {
        const id = activeIdRef.current;
        if (!id) return false;
        if (!draggingNode && !resizing) return false;

        const { sx, sy } = getLocalScreenPoint(e);
        const world = screenToWorld(sx, sy, camera);

        if (resizing) {
            const dx = world.x - resizeStart.current.x;
            const dy = world.y - resizeStart.current.y;

            setViews(vs =>
                vs.map(v => {
                    if (v.id !== id) return v;

                    let x = v.x;
                    let y = v.y;
                    let w = resizeStart.current.w;
                    let h = resizeStart.current.h;

                    if (resizing.includes("e")) w += dx;
                    if (resizing.includes("s")) h += dy;
                    if (resizing.includes("w")) {
                        w -= dx;
                        x += dx;
                    }
                    if (resizing.includes("n")) {
                        h -= dy;
                        y += dy;
                    }

                    return {
                        ...v,
                        x,
                        y,
                        width: Math.max(120, w),
                        height: Math.max(60, h),
                    };
                })
            );

            return true;
        }

        if (draggingNode) {
            setViews(vs =>
                vs.map(v =>
                    v.id === id
                        ? {
                            ...v,
                            x: world.x - dragOffset.current.x,
                            y: world.y - dragOffset.current.y,
                        }
                        : v
                )
            );
            return true;
        }

        return false;
    }

    function stop() {
        setDraggingNode(false);
        setResizing(null);
        activeIdRef.current = null;
    }

    return {
        draggingNode,
        resizing,
        startDrag,
        startResize,
        onMouseMove,
        stop,
    };
}
