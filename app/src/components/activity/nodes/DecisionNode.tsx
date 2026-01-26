import React from "react";

export default function DecisionNode(p: {
    x: number; y: number; w: number; h: number;
    name: string; selected: boolean;
    kind: "decision" | "merge";
    onMouseDown: (e: React.MouseEvent) => void;
    onDoubleClick: () => void;
}) {
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const pts = `${cx},${p.y} ${p.x + p.w},${cy} ${cx},${p.y + p.h} ${p.x},${cy}`;

    return (
        <g onMouseDown={p.onMouseDown} onDoubleClick={p.onDoubleClick} style={{ cursor: "move" }}>
            <polygon
                points={pts}
                fill="#1b2636"
                stroke={p.selected ? "#ff355d" : "rgba(255,255,255,0.18)"}
                strokeWidth={2}
            />
            <text x={cx} y={cy + 5} textAnchor="middle" fontSize={12} fill="rgba(255,255,255,0.85)">
                {p.name || (p.kind === "decision" ? "Decision" : "Merge")}
            </text>
        </g>
    );
}
