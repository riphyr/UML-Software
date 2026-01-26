import React from "react";

export default function ActionNode(p: {
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
                rx={12}
                ry={12}
                fill="#1b2636"
                stroke={p.selected ? "#ff355d" : "rgba(255,255,255,0.18)"}
                strokeWidth={2}
            />
            <text
                x={p.x + p.w / 2}
                y={p.y + p.h / 2 + 5}
                textAnchor="middle"
                fontSize={13}
                fill="rgba(255,255,255,0.9)"
                style={{ userSelect: "none" }}
            >
                {p.name || "Action"}
            </text>
        </g>
    );
}
