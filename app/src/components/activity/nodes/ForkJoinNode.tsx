import React from "react";

export default function ForkJoinNode(p: {
    x: number; y: number; w: number; h: number;
    name: string; selected: boolean;
    kind: "fork" | "join";
    onMouseDown: (e: React.MouseEvent) => void;
    onDoubleClick: () => void;
}) {
    return (
        <g onMouseDown={p.onMouseDown} onDoubleClick={p.onDoubleClick} style={{ cursor: "move" }}>
            <rect
                x={p.x}
                y={p.y}
                width={p.w}
                height={p.h}
                rx={3}
                ry={3}
                fill="#0b0c10"
                stroke={p.selected ? "#ff355d" : "rgba(255,255,255,0.18)"}
                strokeWidth={2}
            />
        </g>
    );
}
