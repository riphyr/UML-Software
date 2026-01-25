export type UmlClass = {
    id: string;
    name: string;
    // UML stereotype displayed as <<stereotype>> above the class name.
    // Empty string means "no stereotype".
    stereotype: string;

    // Visual/semantic kind of the classifier.
    kind: "class" | "abstract" | "interface";
    attributes: string[];
    methods: string[];
};

// -----------------------------------------------------------------------------
// UML helpers
// - On conserve le stockage en string[] (attributes/methods) pour éviter un refactor global.
// - L’UI (Inspector) édite en “formulaire structuré” puis sérialise en lignes normalisées.
// - Les éditions inline (double-clic) sont normalisées à la validation.
// -----------------------------------------------------------------------------

export type UmlVisibility = "none" | "public" | "private" | "protected";
export type UmlParamDirection = "none" | "in" | "out" | "inout";

export type UmlAttributeForm = {
    visibility: UmlVisibility;
    name: string;
    type: string;
};

export type UmlParamForm = {
    direction: UmlParamDirection;
    name: string;
    type: string;
};

export type UmlMethodForm = {
    visibility: UmlVisibility;
    name: string;
    params: UmlParamForm[];
    returnTypes: string[];
};

export function visibilityToSymbol(v: UmlVisibility): string {
    switch (v) {
        case "public":
            return "+";
        case "private":
            return "-";
        case "protected":
            return "#";
        case "none":
        default:
            return "";
    }
}

export function symbolToVisibility(sym: string): UmlVisibility {
    if (sym === "+") return "public";
    if (sym === "-") return "private";
    if (sym === "#") return "protected";
    return "none";
}

function cleanName(s: string): string {
    return s.trim().replace(/\s+/g, " ");
}

function cleanType(s: string): string {
    return s.trim().replace(/\s+/g, " ");
}

export function formatAttributeLine(a: UmlAttributeForm): string {
    const sym = visibilityToSymbol(a.visibility);
    const name = cleanName(a.name) || "attr";
    const type = cleanType(a.type);

    const head = sym ? `${sym} ${name}` : name;
    return type ? `${head}: ${type}` : head;
}

export function parseAttributeLine(line: string): UmlAttributeForm {
    const raw = line.trim();
    if (!raw) return { visibility: "none", name: "", type: "" };

    const m = raw.match(/^([+\-#])\s*(.*)$/);
    const visibility = m ? symbolToVisibility(m[1]) : "none";
    const rest = (m ? m[2] : raw).trim();

    const colon = rest.indexOf(":");
    if (colon === -1) {
        return { visibility, name: cleanName(rest), type: "" };
    }

    const name = cleanName(rest.slice(0, colon));
    const type = cleanType(rest.slice(colon + 1));
    return { visibility, name, type };
}

export function normalizeAttributeLine(line: string): string {
    return formatAttributeLine(parseAttributeLine(line));
}

export function formatMethodLine(m: UmlMethodForm): string {
    const sym = visibilityToSymbol(m.visibility);
    const name = cleanName(m.name) || "method";

    const params = (m.params ?? [])
        .filter((p) => cleanName(p.name).length > 0 || cleanType(p.type).length > 0)
        .map((p) => {
            const dir = p.direction && p.direction !== "none" ? `${p.direction} ` : "";
            const pn = cleanName(p.name) || "p";
            const pt = cleanType(p.type);
            return pt ? `${dir}${pn}: ${pt}` : `${dir}${pn}`;
        })
        .join(", ");

    const returns = (m.returnTypes ?? []).map(cleanType).filter((t) => t.length > 0);
    const head = sym ? `${sym} ${name}` : name;
    const sig = `${head}(${params})`;

    return returns.length > 0 ? `${sig}: ${returns.join(", ")}` : sig;
}

export function parseMethodLine(line: string): UmlMethodForm {
    const raw = line.trim();
    if (!raw) return { visibility: "none", name: "", params: [], returnTypes: [] };

    const m = raw.match(/^([+\-#])\s*(.*)$/);
    const visibility = m ? symbolToVisibility(m[1]) : "none";
    const rest = (m ? m[2] : raw).trim();

    const open = rest.indexOf("(");
    const close = rest.lastIndexOf(")");
    const hasParens = open !== -1 && close !== -1 && close > open;

    const namePart = cleanName(hasParens ? rest.slice(0, open) : rest.split(":")[0]);
    const paramsPart = hasParens ? rest.slice(open + 1, close) : "";

    const afterParens = hasParens ? rest.slice(close + 1).trim() : rest.slice(namePart.length).trim();

    let returnsPart = "";
    const colonIdx = afterParens.indexOf(":");
    if (colonIdx !== -1) returnsPart = afterParens.slice(colonIdx + 1).trim();
    else {
        const c = rest.indexOf(":");
        if (!hasParens && c !== -1) returnsPart = rest.slice(c + 1).trim();
    }

    const params: UmlParamForm[] = paramsPart
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x.length > 0)
        .map((chunk) => {
            const parts = chunk.split(/\s+/);
            let direction: UmlParamDirection = "none";
            let restChunk = chunk;

            const first = parts[0]?.toLowerCase();
            if (first === "in" || first === "out" || first === "inout") {
                direction = first;
                restChunk = chunk.slice(parts[0].length).trim();
            }

            const c = restChunk.indexOf(":");
            if (c === -1) {
                return { direction, name: cleanName(restChunk), type: "" };
            }
            const pn = cleanName(restChunk.slice(0, c));
            const pt = cleanType(restChunk.slice(c + 1));
            return { direction, name: pn, type: pt };
        });

    const returnTypes = returnsPart
        ? returnsPart
            .split(",")
            .map((x) => cleanType(x))
            .filter((x) => x.length > 0)
        : [];

    return { visibility, name: namePart, params, returnTypes };
}

export function normalizeMethodLine(line: string): string {
    return formatMethodLine(parseMethodLine(line));
}
