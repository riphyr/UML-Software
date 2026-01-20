import { useMemo } from "react";
import type { UmlRelation, RelationPoint } from "../../model/relation";
import type { ViewsById } from "../../model/views";
import type { NodeView } from "../../model/view";

type Side = "N" | "E" | "S" | "W";

type Props = {
    relations: UmlRelation[];
    viewsById: ViewsById;

    selectedRelationId: string | null;
    onSelectRelation: (id: string) => void;

    // Reconnect (étape 4)
    onStartReconnect: (args: { id: string; end: "from" | "to" }) => void;

    // Routage (étape 5)
    getEffectiveControlPoints: (r: UmlRelation) => RelationPoint[];
    onStartDragControlPoint: (args: { id: string; index: number }) => void;

    onContextMenuRelation: (args: { id: string; clientX: number; clientY: number }) => void;
};

function center(v: NodeView): RelationPoint {
    return { x: v.x + v.width / 2, y: v.y + v.height / 2 };
}

function chooseSide(from: NodeView, toPoint: RelationPoint): Side {
    const c = center(from);
    const dx = toPoint.x - c.x;
    const dy = toPoint.y - c.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "E" : "W";
    return dy >= 0 ? "S" : "N";
}

function sideMidpoint(v: NodeView, side: Side): RelationPoint {
    const cx = v.x + v.width / 2;
    const cy = v.y + v.height / 2;
    if (side === "N") return { x: cx, y: v.y };
    if (side === "S") return { x: cx, y: v.y + v.height };
    if (side === "W") return { x: v.x, y: cy };
    return { x: v.x + v.width, y: cy };
}

function autoControlPoints(a: RelationPoint, b: RelationPoint): RelationPoint[] {
    const sameX = Math.abs(a.x - b.x) < 0.001;
    const sameY = Math.abs(a.y - b.y) < 0.001;
    if (sameX || sameY) return [];
    const midX = (a.x + b.x) / 2;
    return [
        { x: midX, y: a.y },
        { x: midX, y: b.y },
    ];
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
        onStartReconnect,
        getEffectiveControlPoints,
        onStartDragControlPoint,
        onContextMenuRelation,
    } = p;

    const routed = useMemo(() => {
        return relations
            .map(r => {
                const from = viewsById[r.fromId];
                const to = viewsById[r.toId];
                if (!from || !to) return null;

                // points de contrôle effectifs (réels ou auto + override du drag)
                let cps = getEffectiveControlPoints(r);

                // anchors N/E/S/W : on choisit le côté en regardant le "prochain point" du chemin
                const fromTarget = cps.length > 0 ? cps[0] : center(to);
                const toTarget = cps.length > 0 ? cps[cps.length - 1] : center(from);

                const a = sideMidpoint(from, chooseSide(from, fromTarget));
                const b = sideMidpoint(to, chooseSide(to, toTarget));

                // si aucun control point, on génère un auto local (basé sur anchors fixes)
                if (!r.controlPoints || r.controlPoints.length === 0) {
                    const auto = autoControlPoints(a, b);
                    // si le hook renvoie aussi auto, cps sera déjà égal à auto — mais on reste robuste
                    if (cps.length === 0 && auto.length > 0) cps = auto;
                }

                const points: RelationPoint[] = [a, ...cps, b];

                // label au milieu (approx : milieu de la polyline par index)
                const midIdx = Math.floor(points.length / 2);
                const m = points[midIdx];

                return { r, a, b, cps, points, m };
            })
            .filter(Boolean) as {
            r: UmlRelation;
            a: RelationPoint;
            b: RelationPoint;
            cps: RelationPoint[];
            points: RelationPoint[];
            m: RelationPoint;
        }[];
    }, [relations, viewsById, getEffectiveControlPoints]);

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

            {routed.map(({ r, a, b, cps, points, m }) => {
                const selected = r.id === selectedRelationId;
                const stroke = selected ? "#6aa9ff" : "#cfd6e6";
                const sw = selected ? 2.5 : 1.5;

                const HANDLE_R = 4;
                const HANDLE_HIT_R = 10;

                const CONTROL_R = 4;
                const CONTROL_HIT_R = 10;

                const pointsAttr = points.map(p => `${p.x},${p.y}`).join(" ");

                return (
                    <g key={r.id}>
                        {/* hitbox polyline (sélection fiable) */}
                        <polyline
                            points={pointsAttr}
                            fill="none"
                            stroke="transparent"
                            strokeWidth={14}
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

                        {/* polyline visible */}
                        <polyline
                            points={pointsAttr}
                            fill="none"
                            stroke={stroke}
                            strokeWidth={sw}
                            markerEnd={markerEnd(r.kind)}
                            markerStart={markerStart(r.kind)}
                            pointerEvents="none"
                        />

                        {/* handles reconnexion (extrémités) */}
                        {selected && (
                            <g>
                                <circle
                                    cx={a.x}
                                    cy={a.y}
                                    r={HANDLE_HIT_R}
                                    fill="transparent"
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        onSelectRelation(r.id);
                                        onStartReconnect({ id: r.id, end: "from" });
                                    }}
                                    style={{ cursor: "crosshair" }}
                                />
                                <circle cx={a.x} cy={a.y} r={HANDLE_R} fill={stroke} pointerEvents="none" />

                                <circle
                                    cx={b.x}
                                    cy={b.y}
                                    r={HANDLE_HIT_R}
                                    fill="transparent"
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        onSelectRelation(r.id);
                                        onStartReconnect({ id: r.id, end: "to" });
                                    }}
                                    style={{ cursor: "crosshair" }}
                                />
                                <circle cx={b.x} cy={b.y} r={HANDLE_R} fill={stroke} pointerEvents="none" />
                            </g>
                        )}

                        {/* points de contrôle (drag) */}
                        {selected && cps.length > 0 && (
                            <g>
                                {cps.map((p, idx) => (
                                    <g key={idx}>
                                        <circle
                                            cx={p.x}
                                            cy={p.y}
                                            r={CONTROL_HIT_R}
                                            fill="transparent"
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                onSelectRelation(r.id);
                                                onStartDragControlPoint({ id: r.id, index: idx });
                                            }}
                                            style={{ cursor: "move" }}
                                        />
                                        <circle cx={p.x} cy={p.y} r={CONTROL_R} fill={stroke} pointerEvents="none" />
                                    </g>
                                ))}
                            </g>
                        )}

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
