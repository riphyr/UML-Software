import { useMemo } from "react";
import type { UmlRelation } from "../../model/relation";
import type { ViewsById } from "../../model/views";
import type { NodeView } from "../../model/view";

type Props = {
    relations: UmlRelation[];
    viewsById: ViewsById;

    selectedRelationId: string | null;
    onSelectRelation: (id: string) => void;

    onContextMenuRelation: (args: { id: string; clientX: number; clientY: number }) => void;
};

function center(v: NodeView) {
    return { x: v.x + v.width / 2, y: v.y + v.height / 2 };
}

// intersection bord rect (from) vers (to)
function computeAnchor(from: NodeView, to: NodeView) {
    const c1 = center(from);
    const c2 = center(to);

    const dx = c2.x - c1.x;
    const dy = c2.y - c1.y;

    const hw = from.width / 2;
    const hh = from.height / 2;

    const ax = Math.abs(dx) < 1e-6 ? 1e-6 : dx;
    const ay = Math.abs(dy) < 1e-6 ? 1e-6 : dy;

    const tx = hw / Math.abs(ax);
    const ty = hh / Math.abs(ay);
    const t = Math.min(tx, ty);

    return { x: c1.x + dx * t, y: c1.y + dy * t };
}

function markerEnd(kind: UmlRelation["kind"]) {
    if (kind === "herit") return "url(#uml-arrow-triangle)";
    return "url(#uml-arrow-open)";
}

function markerStart(kind: UmlRelation["kind"]) {
    if (kind === "agg") return "url(#uml-diamond-open)";
    if (kind === "comp") return "url(#uml-diamond-filled)";
    return undefined;
}

export default function RelationLayer(p: Props) {
    const {
        relations,
        viewsById,
        selectedRelationId,
        onSelectRelation,
        onContextMenuRelation,
    } = p;

    const lines = useMemo(() => {
        return relations
            .map(r => {
                const from = viewsById[r.fromId];
                const to = viewsById[r.toId];
                if (!from || !to) return null;

                const a = computeAnchor(from, to);
                const b = computeAnchor(to, from);

                const mx = (a.x + b.x) / 2;
                const my = (a.y + b.y) / 2;

                return { r, a, b, m: { x: mx, y: my } };
            })
            .filter(Boolean) as { r: UmlRelation; a: any; b: any; m: any }[];
    }, [relations, viewsById]);

    return (
        <g>
            <defs>
                <marker id="uml-arrow-open" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
                    <path d="M0,0 L10,5 L0,10" fill="none" stroke="#cfd6e6" strokeWidth="1.5" />
                </marker>

                <marker id="uml-arrow-triangle" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
                    <path d="M0,0 L12,6 L0,12 Z" fill="none" stroke="#cfd6e6" strokeWidth="1.5" />
                </marker>

                <marker id="uml-diamond-open" markerWidth="14" markerHeight="14" refX="2" refY="7" orient="auto">
                    <path d="M0,7 L6,0 L12,7 L6,14 Z" fill="none" stroke="#cfd6e6" strokeWidth="1.5" />
                </marker>

                <marker id="uml-diamond-filled" markerWidth="14" markerHeight="14" refX="2" refY="7" orient="auto">
                    <path d="M0,7 L6,0 L12,7 L6,14 Z" fill="#cfd6e6" stroke="#cfd6e6" strokeWidth="1.5" />
                </marker>
            </defs>

            {lines.map(({ r, a, b, m }) => {
                const selected = r.id === selectedRelationId;
                const stroke = selected ? "#6aa9ff" : "#cfd6e6";
                const sw = selected ? 2.5 : 1.5;

                return (
                    <g key={r.id}>
                        <line
                            x1={a.x}
                            y1={a.y}
                            x2={b.x}
                            y2={b.y}
                            stroke="transparent"
                            strokeWidth={12}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                onSelectRelation(r.id);
                            }}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onSelectRelation(r.id);
                                onContextMenuRelation({ id: r.id, clientX: e.clientX, clientY: e.clientY });
                            }}
                            style={{ cursor: "pointer" }}
                        />

                        <line
                            x1={a.x}
                            y1={a.y}
                            x2={b.x}
                            y2={b.y}
                            stroke={stroke}
                            strokeWidth={sw}
                            markerEnd={markerEnd(r.kind)}
                            markerStart={markerStart(r.kind)}
                            pointerEvents="none"
                        />

                        {r.label && r.label.trim().length > 0 && (
                            <text
                                x={m.x}
                                y={m.y - 6}
                                textAnchor="middle"
                                fontSize={12}
                                fill={stroke}
                                fontFamily="Inter, system-ui, sans-serif"
                                style={{ userSelect: "none" as const, pointerEvents: "none" }}
                            >
                                {r.label}
                            </text>
                        )}
                    </g>
                );
            })}
        </g>
    );
}
