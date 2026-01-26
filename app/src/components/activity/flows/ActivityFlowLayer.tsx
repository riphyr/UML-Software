import type { ActivityFlow, ActivityViewsById } from "../../../model/activity/activity";
import { routeOrthogonal } from "./routing";

function polyToD(pts: { x: number; y: number }[]) {
    if (pts.length === 0) return "";
    return `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
}

function arrowHead(p: { x: number; y: number }, q: { x: number; y: number }, size: number) {
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / len;
    const uy = dy / len;

    const px = -uy;
    const py = ux;

    const tip = q;
    const b1 = { x: q.x - ux * size + px * (size * 0.6), y: q.y - uy * size + py * (size * 0.6) };
    const b2 = { x: q.x - ux * size - px * (size * 0.6), y: q.y - uy * size - py * (size * 0.6) };

    return `${tip.x},${tip.y} ${b1.x},${b1.y} ${b2.x},${b2.y}`;
}

export default function ActivityFlowLayer(p: {
    flows: ActivityFlow[];
    viewsById: ActivityViewsById;
    selectedFlowId: string | null;
    onSelectFlow: (id: string) => void;
    scale: number;
}) {
    return (
        <g>
            {p.flows.map((f) => {
                const a = p.viewsById[f.fromId];
                const b = p.viewsById[f.toId];
                if (!a || !b) return null;

                const poly = routeOrthogonal(a, b);
                const d = polyToD(poly.points);

                const sel = p.selectedFlowId === f.id;
                const stroke = sel ? "#ff355d" : "rgba(255,255,255,0.55)";
                const sw = 2.25 / p.scale;

                const last = poly.points[poly.points.length - 1];
                const prev = poly.points[poly.points.length - 2] ?? last;
                const head = arrowHead(prev, last, 10 / p.scale);

                // label au milieu du segment central
                const mid = poly.points[Math.floor(poly.points.length / 2)];
                const label = (f.guard ? f.guard + " " : "") + (f.label ?? "");

                return (
                    <g
                        key={f.id}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            p.onSelectFlow(f.id);
                        }}
                        style={{ cursor: "pointer" }}
                    >
                        <path d={d} fill="none" stroke={stroke} strokeWidth={sw} />
                        <polygon points={head} fill={stroke} />
                        {label.trim() !== "" && (
                            <text
                                x={mid.x + 6}
                                y={mid.y - 6}
                                fontSize={12 / p.scale}
                                fill="rgba(255,255,255,0.85)"
                                style={{ userSelect: "none" }}
                            >
                                {label}
                            </text>
                        )}
                    </g>
                );
            })}
        </g>
    );
}
