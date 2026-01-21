import type { NodeView } from "../../model/view";
import type { UmlRelation, RelationPoint } from "../../model/relation";

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

function isSamePoint(a: Pt, b: Pt) {
    return Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;
}

function pushPoint(out: Pt[], p: Pt) {
    const last = out[out.length - 1];
    if (!last || !isSamePoint(last, p)) out.push(p);
}

function segLen(a: Pt, b: Pt) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); // Manhattan, segments orthogonaux
}

function midpointOnAxis(a: Pt, b: Pt): Pt {
    if (Math.abs(a.x - b.x) < 0.001) {
        return { x: a.x, y: (a.y + b.y) / 2 };
    }
    return { x: (a.x + b.x) / 2, y: a.y };
}

function computeEndpoints(
    r: UmlRelation,
    viewsById: Record<string, NodeView>
): { a: Pt; b: Pt; aSide: Side; bSide: Side } | null {
    const fromV = viewsById[r.fromId];
    const toV = viewsById[r.toId];
    if (!fromV || !toV) return null;

    const autoFrom: Side = chooseSide(fromV, center(toV));
    const autoTo: Side = chooseSide(toV, center(fromV));

    const aSide: Side = r.fromPortLocked && r.fromPort ? (r.fromPort as Side) : autoFrom;
    const bSide: Side = r.toPortLocked && r.toPort ? (r.toPort as Side) : autoTo;

    const a = portPoint(fromV, aSide);
    const b = portPoint(toV, bSide);

    return { a, b, aSide, bSide };
}

function makeExit(a: Pt, aSide: Side, gap: number) {
    const n = sideNormal(aSide);
    return { x: a.x + n.x * gap, y: a.y + n.y * gap };
}

function makeEntry(b: Pt, bSide: Side, gap: number) {
    const n = sideNormal(bSide);
    return { x: b.x + n.x * gap, y: b.y + n.y * gap };
}

// Construit une polyline orthogonale avec exactement `count` points internes.
// Objectif : jamais de diagonales à la création / auto-génération.
function buildOrthoInnerWithCount(a: Pt, aSide: Side, b: Pt, bSide: Side, count: number, gap = AUTO_GAP): Pt[] {
    const n = Math.max(0, Math.floor(count));
    if (n === 0) return [];

    const p1 = makeExit(a, aSide, gap);
    const p2 = makeEntry(b, bSide, gap);

    // Base minimale 2 points internes, toujours orthogonale :
    // a -> p1 (perp) ; p1 -> p2' (axis) ; p2' -> b (perp via p2' aligné sur bSide)
    if (n === 2) {
        // p2' doit respecter l'orientation du port d'arrivée
        let q2: Pt = { ...p2 };

        // essaie d'aligner sur X sans casser la contrainte "dernier segment perp"
        // si bSide est N/S => q2.x fixé à b.x (déjà) ; sinon q2.y fixé à b.y (déjà)
        // On aligne p1->q2 sur un axe en ajustant la coord libre de q2.
        const canAlignX = bSide === "E" || bSide === "W"; // q2.x libre
        const canAlignY = bSide === "N" || bSide === "S"; // q2.y libre

        // cas où p1->p2 est déjà axis-aligned
        if (Math.abs(p1.x - q2.x) < 0.001 || Math.abs(p1.y - q2.y) < 0.001) {
            return [p1, q2];
        }

        // choisir l'alignement qui est possible (on ajuste seulement q2)
        if (canAlignX) {
            q2 = { x: p1.x, y: q2.y }; // segment vertical p1->q2
            return [p1, q2];
        }
        if (canAlignY) {
            q2 = { x: q2.x, y: p1.y }; // segment horizontal p1->q2
            return [p1, q2];
        }

        // bSide ne devrait jamais empêcher (il y a toujours une coord libre),
        // fallback : on force un coude en 3 points (rare)
        const c = { x: p2.x, y: p1.y };
        return [p1, c, p2].slice(0, 2);
    }

    // Base à 3 points internes : exit -> coude -> entry
    const inner: Pt[] = [];
    pushPoint(inner, p1);

    if (Math.abs(p1.x - p2.x) < 0.001 || Math.abs(p1.y - p2.y) < 0.001) {
        // déjà aligné
    } else {
        // coude
        pushPoint(inner, { x: p2.x, y: p1.y });
    }

    pushPoint(inner, p2);

    // Si on veut exactement 1 point interne (pas utilisé chez toi), on prend le coude.
    if (n === 1) {
        const mid = inner.length >= 2 ? inner[1] : p1;
        return [mid];
    }

    // Ajuster à `n` en subdivisant les segments (toujours orthogonal)
    // On travaille sur la polyline complète [a, ...inner, b]
    const pts: Pt[] = [a, ...inner, b];

    while (pts.length - 2 < n) {
        // trouve le segment le plus long
        let bestI = 0;
        let bestL = -1;
        for (let i = 0; i < pts.length - 1; i++) {
            const L = segLen(pts[i], pts[i + 1]);
            if (L > bestL) {
                bestL = L;
                bestI = i;
            }
        }

        // insère un midpoint orthogonal sur ce segment
        const m = midpointOnAxis(pts[bestI], pts[bestI + 1]);
        pts.splice(bestI + 1, 0, m);
    }

    // Si on a trop (peut arriver si inner a déjà 3 et n=2/…): on retire des points sans casser orthogonalité
    while (pts.length - 2 > n) {
        // retire un point interne dont les voisins restent axis-aligned
        let removed = false;
        for (let i = 1; i < pts.length - 1; i++) {
            const prev = pts[i - 1];
            const next = pts[i + 1];
            const axisOk =
                Math.abs(prev.x - next.x) < 0.001 || Math.abs(prev.y - next.y) < 0.001; // supprimer cur ne crée pas de diagonale
            if (axisOk) {
                pts.splice(i, 1);
                removed = true;
                break;
            }
        }
        if (!removed) break;
    }

    return pts.slice(1, pts.length - 1);
}

// Polyline EFFECTIVE (celle qui sert de “forme actuelle”)
export function computeEffectiveFullPolyline(
    r: UmlRelation,
    viewsById: Record<string, NodeView>,
    overrideControlPoints?: RelationPoint[]
): Pt[] {
    const ends = computeEndpoints(r, viewsById);
    if (!ends) return [];

    const { a, b, aSide, bSide } = ends;

    const manual = r.routingMode === "manual";
    const user = (overrideControlPoints ?? r.controlPoints ?? []);
    const hasUser = user.length > 0;

    if (manual) {
        if (!hasUser) {
            // IMPORTANT: en manuel sans CP, on génère une forme strictement orthogonale
            const inner = buildOrthoInnerWithCount(a, aSide, b, bSide, 2, AUTO_GAP);
            return [a, ...inner, b];
        }
        return [a, ...user, b];
    }

    if (hasUser) return [a, ...user, b];

    // auto: on génère une forme orthogonale
    const inner = buildOrthoInnerWithCount(a, aSide, b, bSide, 3, AUTO_GAP);
    return [a, ...inner, b];
}

// ✅ API utilisée par ton inspector “+/-”
// Génère `count` waypoints internes en restant 100% orthogonal.
export function makeControlPointsWithCount(
    r: UmlRelation,
    viewsById: Record<string, NodeView>,
    count: number
): RelationPoint[] {
    const ends = computeEndpoints(r, viewsById);
    if (!ends) return [];

    const n = Math.max(0, Math.floor(count));
    if (n === 0) return [];

    return buildOrthoInnerWithCount(ends.a, ends.aSide, ends.b, ends.bSide, n, AUTO_GAP);
}
