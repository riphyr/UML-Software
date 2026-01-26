import React from "react";

export default function InitialNode(p: {
    x: number; y: number; w: number; h: number;
    selected: boolean;
    onMouseDown: (e: React.MouseEvent) => void;
    onDoubleClick: () => void;
}) {
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const r = Math.min(p.w, p.h) / 2 - 2;

    return (
        <g onMouseDown={p.onMouseDown} onDoubleClick={p.onDoubleClick} style={{ cursor: "move" }}>
            <circle cx={cx} cy={cy} r={r} fill="#0b0c10" stroke={p.selected ? "#ff355d" : "rgba(255,255,255,0.18)"} strokeWidth={2} />
        </g>
    );
}
