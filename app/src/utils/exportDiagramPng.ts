// utils/exportDiagramPng.ts
import type { ViewsById } from "../model/views";

type Bounds = { x: number; y: number; w: number; h: number };

function computeBoundsFromViews(viewsById: ViewsById): Bounds | null {
    const vs = Object.values(viewsById).filter(Boolean);
    if (vs.length === 0) return null;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const v of vs) {
        minX = Math.min(minX, v.x);
        minY = Math.min(minY, v.y);
        maxX = Math.max(maxX, v.x + v.width);
        maxY = Math.max(maxY, v.y + v.height);
    }

    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function expandBounds(b: Bounds, pad: number): Bounds {
    return { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
}

function neutralizeCameraTransform(clonedSvg: SVGSVGElement) {
    const g = clonedSvg.querySelector("g[transform]") as SVGGElement | null;
    if (!g) return;

    const t = g.getAttribute("transform") ?? "";
    if (!t.includes("translate") && !t.includes("scale")) return;

    g.setAttribute("transform", "translate(0 0) scale(1)");
}

function findBackgroundForExport(anchor: Element): { color: string; image: string } {
    let cur: Element | null = anchor;
    while (cur) {
        const cs = getComputedStyle(cur);
        const bgImg = cs.backgroundImage;
        const bgCol = cs.backgroundColor;

        const hasImg = bgImg && bgImg !== "none";
        const hasCol = bgCol && bgCol !== "transparent" && bgCol !== "rgba(0, 0, 0, 0)";

        if (hasImg || hasCol) {
            return {
                color: hasCol ? bgCol : "#101218",
                image: hasImg ? bgImg : "none",
            };
        }
        cur = cur.parentElement;
    }

    const body = getComputedStyle(document.body);
    return {
        color:
            body.backgroundColor && body.backgroundColor !== "transparent" && body.backgroundColor !== "rgba(0, 0, 0, 0)"
                ? body.backgroundColor
                : "#101218",
        image: body.backgroundImage && body.backgroundImage !== "none" ? body.backgroundImage : "none",
    };
}

function applyBackgroundToSvg(clonedSvg: SVGSVGElement, b: Bounds, bg: { color: string; image: string }) {
    const ns = "http://www.w3.org/2000/svg";

    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("x", `${b.x}`);
    rect.setAttribute("y", `${b.y}`);
    rect.setAttribute("width", `${b.w}`);
    rect.setAttribute("height", `${b.h}`);
    rect.setAttribute("fill", bg.color);

    const first = clonedSvg.firstChild;
    if (first) clonedSvg.insertBefore(rect, first);
    else clonedSvg.appendChild(rect);

    if (bg.image && bg.image.startsWith("linear-gradient(")) {
        const fo = document.createElementNS(ns, "foreignObject");
        fo.setAttribute("x", `${b.x}`);
        fo.setAttribute("y", `${b.y}`);
        fo.setAttribute("width", `${b.w}`);
        fo.setAttribute("height", `${b.h}`);

        const div = document.createElement("div");
        div.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
        div.style.width = "100%";
        div.style.height = "100%";
        div.style.backgroundImage = bg.image;
        div.style.backgroundColor = bg.color;

        fo.appendChild(div);
        clonedSvg.insertBefore(fo, rect.nextSibling);
    }
}

function inlineComputedStylesOnClone(clonedSvg: SVGSVGElement) {
    const props = [
        "color",
        "fill",
        "fillOpacity",
        "stroke",
        "strokeOpacity",
        "strokeWidth",
        "strokeLinecap",
        "strokeLinejoin",
        "strokeDasharray",
        "strokeDashoffset",
        "opacity",
        "fontFamily",
        "fontSize",
        "fontWeight",
        "fontStyle",
        "letterSpacing",
        "textAnchor",
        "dominantBaseline",
        "shapeRendering",
        "textRendering",
    ] as const;

    const els = clonedSvg.querySelectorAll<SVGElement>("*");

    for (const el of els) {
        const cs = getComputedStyle(el);
        const color = cs.color;
        const stylePairs: string[] = [];

        for (const p of props) {
            let v: string = cs[p];
            if (!v) continue;

            if ((p === "fill" || p === "stroke") && v === "currentColor") {
                v = color;
            }

            const cssName = p.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
            stylePairs.push(`${cssName}:${v}`);
        }

        const existing = el.getAttribute("style");
        el.setAttribute("style", existing ? `${existing};${stylePairs.join(";")}` : stylePairs.join(";"));
    }
}

function mountHiddenForComputedStyles(node: SVGSVGElement): () => void {
    const wrap = document.createElement("div");
    wrap.style.position = "fixed";
    wrap.style.left = "-100000px";
    wrap.style.top = "0";
    wrap.style.width = "1px";
    wrap.style.height = "1px";
    wrap.style.overflow = "hidden";
    wrap.style.pointerEvents = "none";
    wrap.style.opacity = "0";

    wrap.appendChild(node);
    document.body.appendChild(wrap);

    return () => {
        wrap.remove();
    };
}

async function saveBlobAsWithPicker(blob: Blob, suggestedName: string) {
    const w = window as any;

    if (typeof w.showSaveFilePicker !== "function") {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        return;
    }

    const handle = await w.showSaveFilePicker({
        suggestedName,
        types: [{ description: "PNG image", accept: { "image/png": [".png"] } }],
    });

    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
}

function svgToObjectUrl(svgText: string) {
    const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    return URL.createObjectURL(blob);
}

async function renderSvgUrlToPngBlob(svgUrl: string, w: number, h: number, pixelRatio: number): Promise<Blob> {
    const img = new Image();
    img.decoding = "async";

    await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Failed to load SVG into Image()"));
        img.src = svgUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * pixelRatio));
    canvas.height = Math.max(1, Math.round(h * pixelRatio));

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("PNG export failed");
    return blob;
}

/**
 * Export PNG = rendu STRICTEMENT identique à l’interface
 * (diagramme uniquement, sans grid/axes/overlays).
 */
export async function exportDiagramPng(args: {
    svgEl: SVGSVGElement;
    viewsById: ViewsById;
    filename?: string;
    padding?: number;
    pixelRatio?: number;
}) {
    const { svgEl, viewsById } = args;

    const filenameBase = (args.filename ?? "uml-diagram").replace(/\.png$/i, "");
    const padding = args.padding ?? 16;
    const pixelRatio =
        args.pixelRatio ?? Math.max(2, typeof window !== "undefined" ? window.devicePixelRatio || 1 : 2);

    const base = computeBoundsFromViews(viewsById);
    if (!base) return;

    const b = expandBounds(base, padding);

    const cloned = svgEl.cloneNode(true) as SVGSVGElement;
    cloned.querySelectorAll("[data-export='ignore']").forEach((el) => el.remove());

    neutralizeCameraTransform(cloned);

    // 🔑 FIX CRUCIAL : forcer l’héritage de currentColor depuis l’UI
    const uiStyle = getComputedStyle(svgEl);
    cloned.setAttribute(
        "style",
        `color:${uiStyle.color};font-family:${uiStyle.fontFamily};`
    );

    const outW = Math.ceil(b.w);
    const outH = Math.ceil(b.h);

    cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    cloned.setAttribute("viewBox", `${b.x} ${b.y} ${b.w} ${b.h}`);
    cloned.setAttribute("width", `${outW}`);
    cloned.setAttribute("height", `${outH}`);

    const bg = findBackgroundForExport(svgEl);
    applyBackgroundToSvg(cloned, b, bg);

    const unmount = mountHiddenForComputedStyles(cloned);
    try {
        inlineComputedStylesOnClone(cloned);
    } finally {
        unmount();
    }

    const xml = new XMLSerializer().serializeToString(cloned);
    const payload = `<?xml version="1.0" encoding="UTF-8"?>\n${xml}`;

    const url = svgToObjectUrl(payload);
    try {
        const pngBlob = await renderSvgUrlToPngBlob(url, outW, outH, pixelRatio);
        await saveBlobAsWithPicker(pngBlob, `${filenameBase}.png`);
    } finally {
        URL.revokeObjectURL(url);
    }
}
