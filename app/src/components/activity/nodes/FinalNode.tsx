import React from "react";

export default function FinalNode(p: {
    x: number; y: number; w: number; h: number;
    selected: boolean;
    onMouseDown: (e: React.MouseEvent) => void;
    onDoubleClick: () => void;
}) {
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const r1 = Math.min(p.w, p.h) / 2 - 2;
    const r2 = r1 - 6;

    return (
        <g onMouseDown={p.onMouseDown} onDoubleClick={p.onDoubleClick} style={{ cursor: "move" }}>
            <circle cx={cx} cy={cy} r={r1} fill="transparent" stroke={p.selected ? "#ff355d" : "rgba(255,255,255,0.18)"} strokeWidth={2} />
            <circle cx={cx} cy={cy} r={r2} fill="#0b0c10" />
        </g>
    );
}
