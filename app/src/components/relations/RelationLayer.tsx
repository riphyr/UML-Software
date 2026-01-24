import { useMemo } from "react";
import type { PortSide, RelationPoint, UmlRelation } from "../../model/relation";
import { getRelationRenderSpec } from "../../model/relation";
import type { ViewsById } from "../../model/views";
import type { NodeView } from "../../model/view";
import { buildPortLayout, getEndpointPortPoint } from "./ports";
import { makeControlPointsWithCount } from "./routingUtils";
import { vAdd, vMul, vNorm, vPerp, vSub, type Pt } from "../../utils/geom";

type Props = {
    relations: UmlRelation[];
    viewsById: ViewsById;

    selectedRelationIds?: string[];
    selectedRelationId: string | null;
    onSelectRelation: (id: string, e?: React.MouseEvent) => void;

    onStartReconnect: (args: { id: string; end: "from" | "to" }) => void;

    routing?:
        | { isActive: false }
        | {
        isActive: true;
        relationId: string;
        kind: "waypoint" | "from" | "to";
        i: number;
        draft: RelationPoint;
        basePoints: RelationPoint[];
        desiredInnerCount: number;
    };

    getControls?: (id: string) => RelationPoint[] | undefined;

    onStartWaypointDrag?: (args: { relationId: string; i: number; e: React.MouseEvent }) => void;
    onStartEndpointDrag?: (args: { relationId: string; end: "from" | "to"; e: React.MouseEvent }) => void;
};

type Side = PortSide;

const PORT_OFFSET = 14;
const LABEL_OFFSET = 10;

// Hitboxes
const RELATION_HIT_STROKE = 12;
const WAYPOINT_HIT_R = 10;
const WAYPOINT_VIS_R = 5;
const ENDPOINT_HIT_R = 12;

// Visible handles (quand sélectionné)
const ENDPOINT_VIS_R = 5;

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
    return { x: v.x + v.width, y: cy }; // E
}

function sideNormal(side: Side): RelationPoint {
    if (side === "N") return { x: 0, y: -1 };
    if (side === "S") return { x: 0, y: 1 };
    if (side === "W") return { x: -1, y: 0 };
    return { x: 1, y: 0 }; // E
}

function portPoint(v: NodeView, side: Side, offset = PORT_OFFSET): RelationPoint {
    const m = sideMidpoint(v, side);
    const n = sideNormal(side);
    return { x: m.x + n.x * offset, y: m.y + n.y * offset };
}

function dist2(a: RelationPoint, b: RelationPoint) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

function toPt(p: RelationPoint): Pt {
    return { x: p.x, y: p.y };
}

function markerAdjustedEnd(pts: RelationPoint[], pad: number): RelationPoint {
    const n = pts.length;
    const b = toPt(pts[n - 1]);
    const prev = toPt(pts[n - 2]);

    const u = vNorm(vSub(b, prev));
    const endAdj = vAdd(b, vMul(u, -pad));
    return { x: endAdj.x, y: endAdj.y };
}

function renderMarker(kind: UmlRelation["kind"], pts: RelationPoint[]) {
    if (pts.length < 2) return null;

    const spec = getRelationRenderSpec(kind);
    const m = spec.marker;
    if (m.type === "none") return null;

    const n = pts.length;
    const b = toPt(pts[n - 1]);
    const prev = toPt(pts[n - 2]);
    const u = vNorm(vSub(b, prev));
    const p = vPerp(u);

    const len = m.len;
    const w = m.width;

    if (m.type === "triangle-hollow") {
        const base = vAdd(b, vMul(u, -len));
        const p1 = vAdd(base, vMul(p, w / 2));
        const p2 = vAdd(base, vMul(p, -w / 2));
        const points = `${b.x},${b.y} ${p1.x},${p1.y} ${p2.x},${p2.y}`;
        return <polygon points={points} fill="none" stroke="currentColor" strokeWidth={2} />;
    }

    if (m.type === "arrow-open") {
        const base = vAdd(b, vMul(u, -len));
        const p1 = vAdd(base, vMul(p, w / 2));
        const p2 = vAdd(base, vMul(p, -w / 2));
        return (
            <g>
                <line x1={b.x} y1={b.y} x2={p1.x} y2={p1.y} stroke="currentColor" strokeWidth={2} />
                <line x1={b.x} y1={b.y} x2={p2.x} y2={p2.y} stroke="currentColor" strokeWidth={2} />
            </g>
        );
    }

    if (m.type === "diamond-hollow" || m.type === "diamond-filled") {
        const near = b;
        const far = vAdd(b, vMul(u, -len));
        const mid = vAdd(b, vMul(u, -len / 2));
        const p1 = vAdd(mid, vMul(p, w / 2));
        const p2 = vAdd(mid, vMul(p, -w / 2));
        const points = `${near.x},${near.y} ${p1.x},${p1.y} ${far.x},${far.y} ${p2.x},${p2.y}`;
        const fill = m.type === "diamond-filled" ? "currentColor" : "none";
        return <polygon points={points} fill={fill} stroke="currentColor" strokeWidth={2} />;
    }

    return null;
}

export default function RelationLayer(p: Props) {
    const {
        relations,
        viewsById,
        selectedRelationId,
        selectedRelationIds,
        onSelectRelation,
        onStartReconnect,
        routing,
        getControls,
        onStartWaypointDrag,
        onStartEndpointDrag,
    } = p;

    const portLayout = useMemo(() => buildPortLayout(relations, viewsById), [relations, viewsById]);

    const dragKey = useMemo(() => {
        if (!routing || !routing.isActive) return "";
        return `${routing.relationId}:${routing.kind}:${routing.i}:${routing.desiredInnerCount}:${routing.draft.x},${routing.draft.y}`;
    }, [routing]);

    const paths = useMemo(() => {
        return relations
            .map((r) => {
                const from = viewsById[r.fromId];
                const to = viewsById[r.toId];
                if (!from || !to) return null;

                const toC = center(to);
                const fromC = center(from);

                const fromSide: Side = r.fromPortLocked
                    ? ((r.fromPort as Side | undefined) ?? chooseSide(from, toC))
                    : chooseSide(from, toC);
                const toSide: Side = r.toPortLocked
                    ? ((r.toPort as Side | undefined) ?? chooseSide(to, fromC))
                    : chooseSide(to, fromC);

                const ap = getEndpointPortPoint(portLayout, r.id, "from", viewsById);
                const bp = getEndpointPortPoint(portLayout, r.id, "to", viewsById);

                let a: RelationPoint = ap?.point ?? portPoint(from, fromSide);
                let b: RelationPoint = bp?.point ?? portPoint(to, toSide);

                const hasUser = !!(r.controlPoints && r.controlPoints.length > 0);
                const mode: "auto" | "manual" = (r.routingMode ?? (hasUser ? "manual" : "auto")) as any;

                const autoInner = makeControlPointsWithCount(r, viewsById as any, 2, relations);

                let inner: RelationPoint[] =
                    mode === "manual" ? (hasUser ? (r.controlPoints ?? []) : autoInner) : autoInner;

                if (routing && routing.isActive && routing.relationId === r.id) {
                    if (routing.kind === "from") {
                        a = routing.draft;
                    } else if (routing.kind === "to") {
                        b = routing.draft;
                    } else if (routing.kind === "waypoint") {
                        const draftInner = getControls?.(r.id);
                        if (draftInner && draftInner.length > 0) inner = draftInner;
                    }
                }

                const pts: RelationPoint[] = [a, ...inner, b];

                let labelPos: RelationPoint | null = null;
                if (r.label && pts.length >= 2) {
                    let bestI = 0;
                    let bestD = -1;
                    for (let i = 0; i + 1 < pts.length; i++) {
                        const d = dist2(pts[i], pts[i + 1]);
                        if (d > bestD) {
                            bestD = d;
                            bestI = i;
                        }
                    }
                    const p0 = pts[bestI];
                    const p1 = pts[bestI + 1];
                    const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
                    labelPos = { x: mid.x, y: mid.y - LABEL_OFFSET };
                }

                const spec = getRelationRenderSpec(r.kind);
                const pad = spec.marker.type === "none" ? 0 : spec.marker.pad;

                let ptsVis = pts;
                if (pad > 0 && pts.length >= 2) {
                    const endAdj = markerAdjustedEnd(pts, pad);
                    ptsVis = [...pts.slice(0, -1), endAdj];
                }

                return { r, pts, ptsVis, labelPos, mode, inner };
            })
            .filter(Boolean) as {
            r: UmlRelation;
            pts: RelationPoint[];
            ptsVis: RelationPoint[];
            labelPos: RelationPoint | null;
            mode: "auto" | "manual";
            inner: RelationPoint[];
        }[];
    }, [relations, viewsById, portLayout, getControls, routing, dragKey]);

    return (
        <g>
            {paths.map(({ r, pts, ptsVis, labelPos, mode, inner }) => {
                const selected = selectedRelationId === r.id || !!selectedRelationIds?.includes(r.id);
                const activeDrag = !!(routing && routing.isActive && routing.relationId === r.id);
                const showHandles = selected || activeDrag;

                const dHit = pts.reduce((acc, p, i) => {
                    const cmd = i === 0 ? "M" : "L";
                    return acc + `${cmd}${p.x},${p.y} `;
                }, "");

                const dVis = ptsVis.reduce((acc, p, i) => {
                    const cmd = i === 0 ? "M" : "L";
                    return acc + `${cmd}${p.x},${p.y} `;
                }, "");

                const spec = getRelationRenderSpec(r.kind);

                return (
                    <g key={r.id} onMouseDown={(e) => onSelectRelation(r.id, e)}>
                        <path
                            d={dHit}
                            fill="none"
                            stroke="transparent"
                            strokeWidth={RELATION_HIT_STROKE}
                            style={{ pointerEvents: "stroke" }}
                            onMouseDown={(e) => onSelectRelation(r.id, e)}
                        />

                        <path
                            d={dVis}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={selected ? 3 : 2}
                            strokeDasharray={spec.dashed ? "6 6" : undefined}
                            style={{ pointerEvents: "none" }}
                        />

                        {renderMarker(r.kind, pts)}

                        {/* endpoints : hitbox toujours, visible seulement si showHandles */}
                        {pts.length >= 2 && (
                            <>
                                <circle
                                    cx={pts[0].x}
                                    cy={pts[0].y}
                                    r={ENDPOINT_HIT_R}
                                    fill="transparent"
                                    style={{ pointerEvents: "all", cursor: "move" }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        onStartEndpointDrag?.({ relationId: r.id, end: "from", e });
                                    }}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        onStartReconnect({ id: r.id, end: "from" });
                                    }}
                                />
                                {showHandles && (
                                    <circle
                                        cx={pts[0].x}
                                        cy={pts[0].y}
                                        r={ENDPOINT_VIS_R}
                                        fill="currentColor"
                                        style={{ pointerEvents: "none" }}
                                    />
                                )}

                                <circle
                                    cx={pts[pts.length - 1].x}
                                    cy={pts[pts.length - 1].y}
                                    r={ENDPOINT_HIT_R}
                                    fill="transparent"
                                    style={{ pointerEvents: "all", cursor: "move" }}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        onStartEndpointDrag?.({ relationId: r.id, end: "to", e });
                                    }}
                                    onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        onStartReconnect({ id: r.id, end: "to" });
                                    }}
                                />
                                {showHandles && (
                                    <circle
                                        cx={pts[pts.length - 1].x}
                                        cy={pts[pts.length - 1].y}
                                        r={ENDPOINT_VIS_R}
                                        fill="currentColor"
                                        style={{ pointerEvents: "none" }}
                                    />
                                )}
                            </>
                        )}

                        {/* waypoints : hitbox toujours, visible seulement si showHandles */}
                        {mode === "manual" &&
                            inner.map((wp, i) => (
                                <g key={i}>
                                    <circle
                                        cx={wp.x}
                                        cy={wp.y}
                                        r={WAYPOINT_HIT_R}
                                        fill="transparent"
                                        style={{ pointerEvents: "all", cursor: "move" }}
                                        onMouseDown={(e) => {
                                            e.stopPropagation();
                                            onStartWaypointDrag?.({ relationId: r.id, i, e });
                                        }}
                                    />
                                    {showHandles && (
                                        <circle
                                            cx={wp.x}
                                            cy={wp.y}
                                            r={WAYPOINT_VIS_R}
                                            fill="currentColor"
                                            style={{ pointerEvents: "none" }}
                                        />
                                    )}
                                </g>
                            ))}

                        {labelPos && (
                            <text
                                x={labelPos.x}
                                y={labelPos.y}
                                textAnchor="middle"
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
