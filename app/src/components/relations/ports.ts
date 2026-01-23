// ports.ts
import type { PortSide, UmlRelation, RelationPoint } from "../../model/relation";
import type { NodeView } from "../../model/view";
import type { ViewsById } from "../../model/views";

export type Side = PortSide;
export type Endpoint = "from" | "to";

export type PortRef = {
    nodeId: string;
    side: Side;
    index: number; // 0..count-1
    count: number; // >= 1
};

export type PortLayout = {
    // key = `${relationId}:${end}`
    endpoints: Record<string, PortRef>;
};

export const DEFAULT_PORT_OFFSET = 14;
export const DEFAULT_PORT_MARGIN = 18;

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

export function resolveEndpointSide(r: UmlRelation, end: Endpoint, viewsById: ViewsById): Side | null {
    const fromV = viewsById[r.fromId];
    const toV = viewsById[r.toId];
    if (!fromV || !toV) return null;

    if (end === "from") {
        const autoFrom = chooseSide(fromV, center(toV));
        return r.fromPortLocked && r.fromPort ? r.fromPort : autoFrom;
    }

    const autoTo = chooseSide(toV, center(fromV));
    return r.toPortLocked && r.toPort ? r.toPort : autoTo;
}

function sideNormal(side: Side): RelationPoint {
    if (side === "N") return { x: 0, y: -1 };
    if (side === "S") return { x: 0, y: 1 };
    if (side === "W") return { x: -1, y: 0 };
    return { x: 1, y: 0 };
}

function sidePointDistributed(
    v: NodeView,
    side: Side,
    index: number,
    count: number,
    margin: number
): RelationPoint {
    const cx = v.x + v.width / 2;
    const cy = v.y + v.height / 2;

    if (count <= 1) {
        if (side === "N") return { x: cx, y: v.y };
        if (side === "S") return { x: cx, y: v.y + v.height };
        if (side === "W") return { x: v.x, y: cy };
        return { x: v.x + v.width, y: cy };
    }

    const t = (index + 1) / (count + 1);

    if (side === "N") return { x: v.x + margin + (v.width - 2 * margin) * t, y: v.y };
    if (side === "S") return { x: v.x + margin + (v.width - 2 * margin) * t, y: v.y + v.height };
    if (side === "W") return { x: v.x, y: v.y + margin + (v.height - 2 * margin) * t };
    return { x: v.x + v.width, y: v.y + margin + (v.height - 2 * margin) * t };
}

export function portPointFromRef(
    v: NodeView,
    ref: { side: Side; index: number; count: number },
    offset = DEFAULT_PORT_OFFSET,
    margin = DEFAULT_PORT_MARGIN
): RelationPoint {
    const m = sidePointDistributed(v, ref.side, ref.index, ref.count, margin);
    const n = sideNormal(ref.side);
    return { x: m.x + n.x * offset, y: m.y + n.y * offset };
}

type GroupItem = {
    relationId: string;
    end: Endpoint;
    sortKey: number;
};

function axisSortKey(side: Side, other: RelationPoint): number {
    return side === "E" || side === "W" ? other.y : other.x;
}

function groupKey(nodeId: string, side: Side) {
    return `${nodeId}:${side}`;
}

function endpointKey(relationId: string, end: Endpoint) {
    return `${relationId}:${end}`;
}

export function buildPortLayout(relations: UmlRelation[], viewsById: ViewsById): PortLayout {
    const groups = new Map<string, GroupItem[]>();

    function push(nodeId: string, side: Side, relationId: string, end: Endpoint, other: RelationPoint) {
        const k = groupKey(nodeId, side);
        const arr = groups.get(k) ?? [];
        arr.push({ relationId, end, sortKey: axisSortKey(side, other) });
        groups.set(k, arr);
    }

    for (const r of relations) {
        const fromV = viewsById[r.fromId];
        const toV = viewsById[r.toId];
        if (!fromV || !toV) continue;

        const fromSide = resolveEndpointSide(r, "from", viewsById);
        const toSide = resolveEndpointSide(r, "to", viewsById);
        if (!fromSide || !toSide) continue;

        push(r.fromId, fromSide, r.id, "from", center(toV));
        push(r.toId, toSide, r.id, "to", center(fromV));
    }

    const endpoints: Record<string, PortRef> = {};

    for (const [k, items] of groups.entries()) {
        // ordre géométrique + tie-break strict
        items.sort((a, b) => (a.sortKey - b.sortKey) || (endpointKey(a.relationId, a.end) < endpointKey(b.relationId, b.end) ? -1 : 1));

        const [nodeId, side] = k.split(":") as [string, Side];
        const count = items.length;

        for (let i = 0; i < items.length; i++) {
            endpoints[endpointKey(items[i].relationId, items[i].end)] = { nodeId, side, index: i, count };
        }
    }

    return { endpoints };
}

export function getPortRef(layout: PortLayout, relationId: string, end: Endpoint): PortRef | null {
    return layout.endpoints[endpointKey(relationId, end)] ?? null;
}

export function getEndpointPortPoint(
    layout: PortLayout,
    relationId: string,
    end: Endpoint,
    viewsById: ViewsById,
    offset = DEFAULT_PORT_OFFSET,
    margin = DEFAULT_PORT_MARGIN
): { point: RelationPoint; side: Side } | null {
    const ref = getPortRef(layout, relationId, end);
    if (!ref) return null;
    const v = viewsById[ref.nodeId];
    if (!v) return null;
    return { point: portPointFromRef(v, ref, offset, margin), side: ref.side };
}
