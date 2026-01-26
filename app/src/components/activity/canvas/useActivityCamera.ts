import { useRef, useState } from "react";
import type { Camera } from "../utils/coords";

export function useActivityCamera(svgRef: React.RefObject<SVGSVGElement | null>) {
    const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 });
    const panRef = useRef<{ active: boolean; sx: number; sy: number; cx: number; cy: number }>({
        active: false,
        sx: 0,
        sy: 0,
        cx: 0,
        cy: 0,
    });

    function onWheel(e: React.WheelEvent) {
        e.preventDefault();

        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;

        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;

        const delta = -e.deltaY;
        const factor = delta > 0 ? 1.08 : 1 / 1.08;

        setCamera((c) => {
            const nextScale = Math.max(0.25, Math.min(2.5, c.scale * factor));
            const wx = (sx - c.x) / c.scale;
            const wy = (sy - c.y) / c.scale;
            const nx = sx - wx * nextScale;
            const ny = sy - wy * nextScale;
            return { x: nx, y: ny, scale: nextScale };
        });
    }

    function onMouseDown(e: React.MouseEvent) {
        if (e.button !== 1) return; // middle mouse
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return;
        panRef.current = { active: true, sx: e.clientX, sy: e.clientY, cx: camera.x, cy: camera.y };
    }

    function onMouseMove(e: React.MouseEvent) {
        if (!panRef.current.active) return;
        const dx = e.clientX - panRef.current.sx;
        const dy = e.clientY - panRef.current.sy;
        setCamera((c) => ({ ...c, x: panRef.current.cx + dx, y: panRef.current.cy + dy }));
    }

    function onMouseUp() {
        panRef.current.active = false;
    }

    return { camera, setCamera, onWheel, onMouseDown, onMouseMove, onMouseUp, isPanning: panRef.current.active };
}
