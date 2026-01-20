import { useMemo } from "react";
import type { PortSide, RelationPoint, UmlRelation } from "../../model/relation";
import type { ViewsById } from "../../model/views";
import type { NodeView } from "../../model/view";

type Props = {
    relations: UmlRelation[];
    viewsById: ViewsById;

    selectedRelationId: string | null;
    onSelectRelation: (id: string) => void;

    onStartReconnect: (args: { id: string; end: "from" | "to" }) => void;

    // Waypoints (drag)
    routing?: {
        isActive: boolean;
        relationId: string | null;
        start: (relationId: string, index: number) => void;
        // if provided, returns the "effective" points currently used for display
        // (ex: includes auto-route points, or temporary points while dragging)
        getEffectiveControlPoints?: (r: UmlRelation) => RelationPoint[];
    };

    onContextMenuRelation: (args: { id: string; clientX: number; clientY: number }) => void;
};

type Side = PortSide;

const PORT_OFFSET = 10;

function markerEnd(kind: UmlRelation["kind"]) {
    if (kind === "herit") return "url(#uml-arrow-triangle)";
    return "url(#uml-arrow-open)";
}

function markerStart(kind: UmlRelation["kind"]) {
    if (kind === "agg") return "url(#uml-diamond-open)";
    if (kind === "comp") return "url(#uml-diamond-filled)";
    return undefined;
}

function center(v: NodeView): RelationPoint {
    return { x: v.x + v.width / 2, y: v.y + v.height / 2 };
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

function chooseSide(from: NodeView, toPoint: RelationPoint): Side {
    const c = center(from);
    const dx = toPoint.x - c.x;
    const dy = toPoint.y - c.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "E" : "W";
    return dy >= 0 ? "S" : "N";
}

function portPoint(v: NodeView, side: Side, offset = PORT_OFFSET): RelationPoint {
    const m = sideMidpoint(v, side);
    const n = sideNormal(side);
    return { x: m.x + n.x * offset, y: m.y + n.y * offset };
}

function isSamePoint(a: RelationPoint, b: RelationPoint) {
    return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}

function pushPoint(out: RelationPoint[], p: RelationPoint) {
    const last = out[out.length - 1];
    if (!last || !isSamePoint(last, p)) out.push(p);
}

function autoOrthoRoute(a: RelationPoint, aSide: Side, b: RelationPoint, bSide: Side, gap: number): RelationPoint[] {
    const na = sideNormal(aSide);
    const nb = sideNormal(bSide);

    const exit = { x: a.x + na.x * gap, y: a.y + na.y * gap };
    const entry = { x: b.x + nb.x * gap, y: b.y + nb.y * gap };

    const pts: RelationPoint[] = [];
    pushPoint(pts, exit);

    const dx = entry.x - exit.x;
    const dy = entry.y - exit.y;

    if (Math.abs(dx) >= 0.001 && Math.abs(dy) >= 0.001) {
        const preferHFirst = Math.abs(dx) >= Math.abs(dy);
        const mid = preferHFirst ? { x: entry.x, y: exit.y } : { x: exit.x, y: entry.y };
        pushPoint(pts, mid);
    }

    pushPoint(pts, entry);
    return pts;
}

function buildPathPoints(
    r: UmlRelation,
    viewsById: ViewsById
): { a: RelationPoint; b: RelationPoint; points: RelationPoint[]; fromSide: Side; toSide: Side } | null {
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

    const a = portPoint(from, fromSide);
    const b = portPoint(to, toSide);

    const controls: RelationPoint[] =
        r.controlPoints && r.controlPoints.length > 0
            ? r.controlPoints
            : autoOrthoRoute(a, fromSide, b, toSide, 24);

    const points: RelationPoint[] = [a, ...controls, b];
    return { a, b, points, fromSide, toSide };
}

function pointsToPath(points: RelationPoint[]) {
    if (points.length === 0) return "";
    const [p0, ...rest] = points;
    return [`M ${p0.x} ${p0.y}`, ...rest.map((p) => `L ${p.x} ${p.y}`)].join(" ");
}

function dist2(p1: RelationPoint, p2: RelationPoint) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return dx * dx + dy * dy;
}

export default function RelationLayer(p: Props) {
    const { relations, viewsById, selectedRelationId, onSelectRelation, onStartReconnect, routing, onContextMenuRelation } =
        p;

    const getControls = routing?.getEffectiveControlPoints;

    const dragKey = useMemo(() => {
        if (!routing?.isActive || !routing.relationId || !getControls) return "";

        const r = relations.find(rr => rr.id === routing.relationId);
        if (!r) return "";

        const pts = getControls(r);
        if (!pts || pts.length === 0) return "";

        // petite "signature" stable mais sensible au mouvement
        let acc = pts.length * 1000003;
        for (let i = 0; i < pts.length; i++) {
            const x = Math.round(pts[i].x);
            const y = Math.round(pts[i].y);
            acc = (acc * 31 + x) | 0;
            acc = (acc * 17 + y) | 0;
        }
        return `${routing.relationId}:${acc}`;
    }, [routing?.isActive, routing?.relationId, getControls, relations]);

    const paths = useMemo(() => {
        return relations
            .map((r) => {
                const built = buildPathPoints(r, viewsById);
                if (!built) return null;

                let { a, b, points } = built;

                // IMPORTANT: pendant un drag waypoint, le path doit utiliser les points effectifs (draft inclus)
                if (routing?.isActive && routing.relationId === r.id && getControls) {
                    const eff = getControls(r);
                    if (eff && eff.length >= 2) {
                        points = eff;
                        a = eff[0];
                        b = eff[eff.length - 1];
                    }
                }

                const midIdx = Math.floor(points.length / 2);
                const m = points[midIdx] ?? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

                return { r, a, b, points, m, d: pointsToPath(points) };
            })
            .filter(Boolean) as {
            r: UmlRelation;
            a: RelationPoint;
            b: RelationPoint;
            points: RelationPoint[];
            m: RelationPoint;
            d: string;
        }[];
    }, [relations, viewsById, dragKey]);

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

            {paths.map(({ r, a, b, d, m }) => {
                const selected = r.id === selectedRelationId;
                const stroke = selected ? "#6aa9ff" : "#cfd6e6";
                const sw = selected ? 2.5 : 1.5;

                const HANDLE_R = 4;
                const HANDLE_HIT_R = 10;

                // Waypoints
                const cps: RelationPoint[] = (getControls ? getControls(r) : null) ?? r.controlPoints ?? [];
                const showWaypoints = selected && cps.length > 0;
                const endpointsAreWaypoints = !!routing && showWaypoints && cps.length >= 2;

                const RECONNECT_R = 9;

                return (
                    <g key={r.id}>
                        <path
                            d={d}
                            fill="none"
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

                        <path
                            d={d}
                            fill="none"
                            stroke={stroke}
                            strokeWidth={sw}
                            markerEnd={markerEnd(r.kind)}
                            markerStart={markerStart(r.kind)}
                            pointerEvents="none"
                        />

                        {showWaypoints && (
                            <g>
                                {cps.map((pt, idx) => {
                                    const hit = 10;
                                    const rad = 4;

                                    const nearFrom = dist2(pt, a) <= RECONNECT_R * RECONNECT_R;
                                    const nearTo = dist2(pt, b) <= RECONNECT_R * RECONNECT_R;

                                    return (
                                        <g key={`${r.id}-cp-${idx}`}>
                                            <circle
                                                cx={pt.x}
                                                cy={pt.y}
                                                r={hit}
                                                fill="transparent"
                                                onMouseDown={(e) => {
                                                    if (!routing) return;
                                                    e.stopPropagation();
                                                    onSelectRelation(r.id);

                                                    // endpoints (idx 0 / last) : drag => relocalisation manuelle d'ancre
                                                    // (useRelationRouting commit() fera le snap sur un port)
                                                    routing.start(r.id, idx);
                                                }}
                                                style={{ cursor: routing ? (nearFrom || nearTo ? "move" : "grab") : "default" }}
                                            />
                                            <circle cx={pt.x} cy={pt.y} r={rad} fill={stroke} pointerEvents="none" />
                                        </g>
                                    );
                                })}
                            </g>
                        )}

                        {selected && !endpointsAreWaypoints && (
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
