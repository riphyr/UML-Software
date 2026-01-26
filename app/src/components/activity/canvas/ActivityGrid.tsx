import React from "react";

export default function ActivityGrid(p: {
    width: number;
    height: number;
    scale: number;
    enabled: boolean;
    base: number;
}) {
    if (!p.enabled) return null;

    const step = p.base;
    const w = p.width;
    const h = p.height;

    const lines: React.ReactNode[] = [];

    for (let x = 0; x <= w; x += step) {
        lines.push(
            <line
                key={`vx${x}`}
                x1={x}
                y1={0}
                x2={x}
                y2={h}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={1 / p.scale}
            />
        );
    }

    for (let y = 0; y <= h; y += step) {
        lines.push(
            <line
                key={`hy${y}`}
                x1={0}
                y1={y}
                x2={w}
                y2={y}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={1 / p.scale}
            />
        );
    }

    return <g>{lines}</g>;
}
