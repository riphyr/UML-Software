import { useRef, useState, type MouseEvent, type WheelEvent } from "react";
import { screenToWorld } from "../../utils/coords";

type Camera = { x: number; y: number; scale: number };

function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
}

export function useCamera(svgRef: React.RefObject<SVGSVGElement | null>) {
    const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 });

    const [isPanning, setIsPanning] = useState(false);
    const last = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // pan strict: autorisé uniquement si mousedown démarre sur fond
    const canPanRef = useRef(false);

    function allowPan(v: boolean) {
        canPanRef.current = v;
    }

    function getLocalScreenPoint(e: MouseEvent | WheelEvent) {
        const rect = svgRef.current!.getBoundingClientRect();
        return { sx: e.clientX - rect.left, sy: e.clientY - rect.top };
    }

    function beginPan(e: MouseEvent) {
        if (e.button !== 0) return;
        if (!canPanRef.current) return;

        setIsPanning(true);
        last.current = { x: e.clientX, y: e.clientY };
    }

    function panMove(e: MouseEvent) {
        if (!isPanning) return;

        const dx = e.clientX - last.current.x;
        const dy = e.clientY - last.current.y;
        last.current = { x: e.clientX, y: e.clientY };

        setCamera(c => ({ ...c, x: c.x + dx, y: c.y + dy }));
    }

    function endPan() {
        setIsPanning(false);
        // reset dur : évite les pans “fantômes”
        canPanRef.current = false;
    }

    function onWheel(e: WheelEvent<SVGSVGElement>) {
        e.preventDefault();

        const { sx, sy } = getLocalScreenPoint(e);
        const before = screenToWorld(sx, sy, camera);

        const zoomSpeed = 0.001;
        const factor = 1 + -e.deltaY * zoomSpeed;
        const newScale = clamp(camera.scale * factor, 0.25, 4);

        const newX = sx - before.x * newScale;
        const newY = sy - before.y * newScale;

        setCamera({ x: newX, y: newY, scale: newScale });
    }

    return {
        camera,
        setCamera,
        isPanning,

        allowPan, // <-- nouveau
        getLocalScreenPoint,
        beginPan,
        panMove,
        endPan,
        onWheel,
    };
}
