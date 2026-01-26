import React from "react";

export default function ObjectNode(p: {
    x: number; y: number; w: number; h: number;
    name: string; selected: boolean;
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
                rx={6}
                ry={6}
                fill="#13202d"
                stroke={p.selected ? "#ff355d" : "rgba(255,255,255,0.18)"}
                strokeWidth={2}
            />
            <text x={p.x + 10} y={p.y + p.h / 2 + 5} fontSize={13} fill="rgba(255,255,255,0.9)">
                {p.name || "Object"}
            </text>
        </g>
    );
}
