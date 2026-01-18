import { useRef, useState, type MouseEvent, type WheelEvent } from "react";
import { clamp, screenToWorld, type Camera } from "../utils/coords";
import ClassNode from "./nodes/ClassNode";

export default function DiagramCanvas() {
    const svgRef = useRef<SVGSVGElement | null>(null);

    const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 });

    const [isDraggingBackground, setIsDraggingBackground] = useState(false);
    const last = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    const [node, setNode] = useState({
        x: 100,
        y: 100,
        width: 240,
        height: 120,
    });

    const [draggingNode, setDraggingNode] = useState(false);
    const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    function getLocalScreenPoint(e: MouseEvent | WheelEvent) {
        const rect = svgRef.current!.getBoundingClientRect();
        return { sx: e.clientX - rect.left, sy: e.clientY - rect.top };
    }

    function onBackgroundMouseDown(e: MouseEvent<SVGRectElement>) {
        if (e.button !== 0) return;
        setIsDraggingBackground(true);
        last.current = { x: e.clientX, y: e.clientY };
    }

    function onNodeMouseDown(e: MouseEvent) {
        e.stopPropagation();

        const { sx, sy } = getLocalScreenPoint(e);
        const world = screenToWorld(sx, sy, camera);

        dragOffset.current = {
            x: world.x - node.x,
            y: world.y - node.y,
        };

        setDraggingNode(true);
    }

    function onMouseMove(e: MouseEvent<SVGSVGElement>) {
        if (draggingNode) {
            const { sx, sy } = getLocalScreenPoint(e);
            const world = screenToWorld(sx, sy, camera);

            setNode(n => ({
                ...n,
                x: world.x - dragOffset.current.x,
                y: world.y - dragOffset.current.y,
            }));
            return;
        }

        if (!isDraggingBackground) return;

        const dx = e.clientX - last.current.x;
        const dy = e.clientY - last.current.y;
        last.current = { x: e.clientX, y: e.clientY };
        setCamera(c => ({ ...c, x: c.x + dx, y: c.y + dy }));
    }

    function onMouseUp() {
        setIsDraggingBackground(false);
        setDraggingNode(false);
    }

    function onWheel(e: WheelEvent<SVGSVGElement>) {
        e.preventDefault();

        const { sx, sy } = getLocalScreenPoint(e);
        const before = screenToWorld(sx, sy, camera);

        const zoomSpeed = 0.001;
        const factor = 1 + (-e.deltaY * zoomSpeed);
        const newScale = clamp(camera.scale * factor, 0.25, 4);

        const newX = sx - before.x * newScale;
        const newY = sy - before.y * newScale;

        setCamera({ x: newX, y: newY, scale: newScale });
    }

    return (
        <div style={{ width: "100%", height: "100%" }}>
            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                style={{ display: "block" }}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onWheel={onWheel}
            >
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="transparent"
                    onMouseDown={onBackgroundMouseDown}
                />

                <g transform={`translate(${camera.x}, ${camera.y}) scale(${camera.scale})`}>
                    <ClassNode
                        x={node.x}
                        y={node.y}
                        width={node.width}
                        height={node.height}
                        onMouseDown={onNodeMouseDown}
                    />
                </g>
            </svg>
        </div>
    );
}
