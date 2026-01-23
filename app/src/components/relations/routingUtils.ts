import type { NodeView } from "../../model/view";
import type { UmlRelation, RelationPoint } from "../../model/relation";
import { buildPortLayout, getEndpointPortPoint } from "./ports";
import type { PortLayout } from "./ports";

type Side = "N" | "E" | "S" | "W";
type Pt = { x: number; y: number };

const PORT_OFFSET = 14;
const AUTO_GAP = 24;

function center(v: NodeView): Pt {
    return { x: v.x + v.width / 2, y: v.y + v.height / 2 };
}

function chooseSide(from: NodeView, toPoint: Pt): Side {
    const c = center(from);
    const dx = toPoint.x - c.x;
    const dy = toPoint.y - c.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "E" : "W";
    return dy >= 0 ? "S" : "N";
}

function sideMidpoint(v: NodeView, side: Side): Pt {
    const cx = v.x + v.width / 2;
    const cy = v.y + v.height / 2;
    if (side === "N") return { x: cx, y: v.y };
    if (side === "S") return { x: cx, y: v.y + v.height };
    if (side === "W") return { x: v.x, y: cy };
    return { x: v.x + v.width, y: cy };
}

function sideNormal(side: Side): Pt {
    if (side === "N") return { x: 0, y: -1 };
    if (side === "S") return { x: 0, y: 1 };
    if (side === "W") return { x: -1, y: 0 };
    return { x: 1, y: 0 };
}

function portPoint(v: NodeView, side: Side, offset = PORT_OFFSET): Pt {
    const m = sideMidpoint(v, side);
    const n = sideNormal(side);
    return { x: m.x + n.x * offset, y: m.y + n.y * offset };
}

// Force le segment endpoint->p à être orthogonal et cohérent avec la face.
function enforcePerpendicular(p: Pt, ref: Pt, side: Side): Pt {
    if (side === "E" || side === "W") return { x: p.x, y: ref.y };
    return { x: ref.x, y: p.y };
}

function isSamePoint(a: Pt, b: Pt) {
    return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}

/**
 * Retourne des CONTROL POINTS (waypoints) STRICTEMENT orthogonaux.
 * - pas de diagonales
 * - inclut toujours aExit et bExit -> garantit que les 1ers/derniers segments restent orthogonaux
 * - minCount=2 mais peut monter à 3 si nécessaire pour rester orthogonal
 * - si minCount est plus grand, insère des points sur les segments (toujours orthogonal)
 */
function buildAutoControlPoints(a: Pt, aSide: Side, b: Pt, bSide: Side, minCount: number, gap: number): Pt[] {
    const an = sideNormal(aSide);
    const bn = sideNormal(bSide);

    // points "exit" (à l'extérieur du node) alignés au port
    const aExit = enforcePerpendicular({ x: a.x + an.x * gap, y: a.y + an.y * gap }, a, aSide);
    const bExit = enforcePerpendicular({ x: b.x + bn.x * gap, y: b.y + bn.y * gap }, b, bSide);

    // base cps (2 ou 3) pour connecter aExit -> bExit orthogonalement
    const base: Pt[] = [];
    base.push(aExit);

    if (aExit.x === bExit.x || aExit.y === bExit.y) {
        base.push(bExit);
    } else {
        const aHoriz = aSide === "E" || aSide === "W";
        const bHoriz = bSide === "E" || bSide === "W";

        let corner: Pt;
        if (aHoriz && bHoriz) corner = { x: aExit.x, y: bExit.y };
        else if (!aHoriz && !bHoriz) corner = { x: bExit.x, y: aExit.y };
        else {
            // perpendiculaires
            corner = aHoriz ? { x: bExit.x, y: aExit.y } : { x: aExit.x, y: bExit.y };
        }

        base.push(corner);
        base.push(bExit);
    }

    // remove consecutive duplicates
    const cps: Pt[] = [];
    for (const p of base) {
        const last = cps[cps.length - 1];
        if (!last || !isSamePoint(last, p)) cps.push(p);
    }

    // min requis: au moins 2, mais si la base en nécessite 3 (sinon diagonale), on force 3
    const target = Math.max(2, minCount, cps.length);

    // On subdivise les segments pour atteindre target, sans casser l'orthogonalité.
    // On travaille sur la polyline complète [a, ...cps, b] pour pouvoir subdiviser les segments extrêmes aussi.
    const cpsDyn: Pt[] = [...cps];

    function fullPoints() {
        return [a, ...cpsDyn, b];
    }

    function manhattan(p0: Pt, p1: Pt) {
        return Math.abs(p1.x - p0.x) + Math.abs(p1.y - p0.y);
    }

    function insertMidOnSegment(segIndex: number) {
        const pts = fullPoints();
        const p0 = pts[segIndex];
        const p1 = pts[segIndex + 1];

        // devrait toujours être orthogonal
        if (p0.x !== p1.x && p0.y !== p1.y) return;

        const mid: Pt =
            p0.x === p1.x
                ? { x: p0.x, y: Math.round((p0.y + p1.y) / 2) }
                : { x: Math.round((p0.x + p1.x) / 2), y: p0.y };

        // full = [a] + cpsDyn + [b]
        if (segIndex === 0) {
            cpsDyn.splice(0, 0, mid);
            return;
        }
        if (segIndex >= pts.length - 2) {
            cpsDyn.splice(cpsDyn.length, 0, mid);
            return;
        }

        // segment entre cpsDyn[segIndex-1] et cpsDyn[segIndex]
        cpsDyn.splice(segIndex, 0, mid);
    }

    while (cpsDyn.length < target) {
        const pts = fullPoints();
        let bestI = 0;
        let bestL = -1;

        for (let i = 0; i + 1 < pts.length; i++) {
            const l = manhattan(pts[i], pts[i + 1]);
            if (l > bestL) {
                bestL = l;
                bestI = i;
            }
        }

        insertMidOnSegment(bestI);
    }

    // snap pixels
    for (const p of cpsDyn) {
        p.x = Math.round(p.x);
        p.y = Math.round(p.y);
    }

    return cpsDyn;
}

function computeEndpoints(
    r: UmlRelation,
    viewsById: Record<string, NodeView>,
    layout?: PortLayout
): { a: Pt; b: Pt; aSide: Side; bSide: Side } | null {
    const fromV = viewsById[r.fromId];
    const toV = viewsById[r.toId];
    if (!fromV || !toV) return null;

    const autoFrom: Side = chooseSide(fromV, center(toV));
    const autoTo: Side = chooseSide(toV, center(fromV));

    const aSide: Side = r.fromPortLocked && r.fromPort ? (r.fromPort as Side) : autoFrom;
    const bSide: Side = r.toPortLocked && r.toPort ? (r.toPort as Side) : autoTo;

    // fallback midpoint (ancien comportement)
    let a = portPoint(fromV, aSide);
    let b = portPoint(toV, bSide);

    // ports distribués
    if (layout) {
        const ap = getEndpointPortPoint(layout, r.id, "from", viewsById, PORT_OFFSET);
        const bp = getEndpointPortPoint(layout, r.id, "to", viewsById, PORT_OFFSET);
        if (ap) a = ap.point;
        if (bp) b = bp.point;
    }

    return { a, b, aSide, bSide };
}

export function computeEffectiveFullPolyline(
    r: UmlRelation,
    viewsById: Record<string, NodeView>,
    allRelations?: UmlRelation[]
): RelationPoint[] {
    const layout = allRelations ? buildPortLayout(allRelations, viewsById) : undefined;
    const ends = computeEndpoints(r, viewsById, layout);
    if (!ends) return [];

    const hasUser = !!(r.controlPoints && r.controlPoints.length > 0);
    if (r.routingMode === "manual" || hasUser) {
        return [ends.a, ...(r.controlPoints ?? []), ends.b];
    }

    // auto: minimum 2 (peut monter à 3 si nécessaire pour rester orthogonal)
    const inner = buildAutoControlPoints(ends.a, ends.aSide, ends.b, ends.bSide, 2, AUTO_GAP);
    return [ends.a, ...inner, ends.b];
}

export function makeControlPointsWithCount(
    r: UmlRelation,
    viewsById: Record<string, NodeView>,
    count: number,
    allRelations?: UmlRelation[]
): RelationPoint[] {
    const layout = allRelations ? buildPortLayout(allRelations, viewsById) : undefined;
    const ends = computeEndpoints(r, viewsById, layout);
    if (!ends) return [];

    const n = Math.max(2, Math.floor(count));
    return buildAutoControlPoints(ends.a, ends.aSide, ends.b, ends.bSide, n, AUTO_GAP);
}
