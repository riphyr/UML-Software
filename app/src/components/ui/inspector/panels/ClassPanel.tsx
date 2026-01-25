import { useEffect, useMemo, useState } from "react";
import type { UmlClass, UmlClassKind } from "../../../../model/uml";
import {
    formatAttributeLine,
    formatMethodLine,
    parseAttributeLine,
    parseMethodLine,
    type UmlAttributeForm,
    type UmlMethodForm,
    type UmlParamDirection,
    type UmlVisibility,
} from "../../../../model/uml";
import Section from "../sections/Section";
import TextField from "../sections/TextField";
import ActionRow from "../sections/ActionRow";

const LABEL_STYLE: React.CSSProperties = { fontSize: 12, color: "#cdd6f4" };

const INPUT_BASE: React.CSSProperties = {
    padding: "6px 8px",
    borderRadius: 10,
    border: "1px solid #2a3040",
    background: "#0b0f19",
    color: "#e8eefc",
    outline: "none",
    fontFamily: "Inter, system-ui, sans-serif",
    fontSize: 12,
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
};

const MONO_INPUT: React.CSSProperties = {
    ...INPUT_BASE,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

const BTN: React.CSSProperties = {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #2a3040",
    background: "#161b28",
    color: "#e8eefc",
    cursor: "pointer",
};

const BTN_SMALL: React.CSSProperties = {
    ...BTN,
    padding: "6px 10px",
};

const BTN_DANGER: React.CSSProperties = {
    ...BTN,
    background: "#2a1220",
    border: "1px solid #5a2a3a",
};

const ROW: React.CSSProperties = {
    display: "grid",
    gap: 8,
    alignItems: "center",
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
};

const METHOD_CARD: React.CSSProperties = {
    border: "1px solid #1f2736",
    borderRadius: 12,
    padding: 10,
    background: "#0b0f19",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
};

function visibilityLabel(v: UmlVisibility) {
    if (v === "public") return "+ public";
    if (v === "private") return "- private";
    if (v === "protected") return "# protected";
    return "none";
}

function directionLabel(d: UmlParamDirection) {
    if (d === "in") return "in";
    if (d === "out") return "out";
    if (d === "inout") return "inout";
    return "none";
}

function toReturnText(m: UmlMethodForm) {
    return (m.returnTypes ?? []).join(", ");
}

function fromReturnText(s: string): string[] {
    return s
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x.length > 0);
}

export default function ClassPanel(p: {
    c: UmlClass;
    onApply: (next: { name: string; stereotype: string; kind: UmlClassKind; attributes: string[]; methods: string[] }) => void;
    onDelete: () => void;
    onDuplicate: () => void;
}) {
    const [name, setName] = useState(p.c.name);
    const [stereotype, setStereotype] = useState(p.c.stereotype ?? "");
    const [kind, setKind] = useState<UmlClassKind>(p.c.kind ?? "class");

    const parsedAttrs = useMemo(() => p.c.attributes.map(parseAttributeLine), [p.c.attributes]);
    const parsedMethods = useMemo(() => p.c.methods.map(parseMethodLine), [p.c.methods]);

    const [attrs, setAttrs] = useState<UmlAttributeForm[]>(parsedAttrs);
    const [methods, setMethods] = useState<UmlMethodForm[]>(parsedMethods);

    const [returnTextByIndex, setReturnTextByIndex] = useState<Record<number, string>>({});

    useEffect(() => {
        setName(p.c.name);
        setStereotype(p.c.stereotype ?? "");
        setKind(p.c.kind ?? "class");
        setAttrs(parsedAttrs);
        setMethods(parsedMethods);
        setReturnTextByIndex({});
    }, [p.c.id, p.c.name, p.c.stereotype, p.c.kind, parsedAttrs, parsedMethods]);

    function addAttribute() {
        setAttrs((prev) => [...prev, { visibility: "none", name: "attr", type: "Type" }]);
    }

    function addMethod() {
        setMethods((prev) => [...prev, { visibility: "none", name: "method", params: [], returnTypes: [] }]);
    }

    function commit() {
        const nextName = name.trim() || "ClassName";
        const nextStereotype = stereotype.trim();
        const nextKind: UmlClassKind = kind || "class";

        const nextAttributes = attrs
            .map(formatAttributeLine)
            .map((x) => x.trim())
            .filter((x) => x.length > 0);

        const nextMethods = methods
            .map(formatMethodLine)
            .map((x) => x.trim())
            .filter((x) => x.length > 0);

        p.onApply({ name: nextName, stereotype: nextStereotype, kind: nextKind, attributes: nextAttributes, methods: nextMethods });
    }

    useEffect(() => {
        const t = window.setTimeout(() => commit(), 200);
        return () => window.clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [name, stereotype, kind, attrs, methods]);

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                width: "100%",
                minWidth: 0,
                boxSizing: "border-box",
            }}
        >
            <Section title="Class">
                <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", minWidth: 0 }}>
                    <TextField label="Name" value={name} onChange={(v) => setName(v)} placeholder="ClassName" />

                    <TextField
                        label="Stereotype"
                        value={stereotype}
                        onChange={(v) => setStereotype(v)}
                        placeholder="entity / control / boundary ..."
                    />

                    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", minWidth: 0 }}>
                        <div style={LABEL_STYLE}>Kind</div>
                        <select value={kind} onChange={(e) => setKind(e.target.value as UmlClassKind)} style={INPUT_BASE}>
                            <option value="class">class</option>
                            <option value="abstract">abstract</option>
                            <option value="interface">interface</option>
                        </select>
                    </div>

                    {/* Attributes */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                            <div style={LABEL_STYLE}>Attributes</div>
                            <button type="button" style={BTN_SMALL} onClick={addAttribute}>
                                + Attribute
                            </button>
                        </div>

                        {attrs.length === 0 ? (
                            <div style={{ fontSize: 12, color: "#8aa0c8" }}>No attributes</div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", minWidth: 0 }}>
                                {attrs.map((a, i) => (
                                    <div
                                        key={`attr-${i}`}
                                        style={{
                                            ...ROW,
                                            gridTemplateColumns: "100px minmax(0, 1fr) minmax(0, 1fr) 40px",
                                        }}
                                    >
                                        <select
                                            value={a.visibility}
                                            onChange={(e) => {
                                                const v = e.target.value as UmlVisibility;
                                                setAttrs((prev) => prev.map((x, idx) => (idx === i ? { ...x, visibility: v } : x)));
                                            }}
                                            style={INPUT_BASE}
                                        >
                                            <option value="none">{visibilityLabel("none")}</option>
                                            <option value="public">{visibilityLabel("public")}</option>
                                            <option value="private">{visibilityLabel("private")}</option>
                                            <option value="protected">{visibilityLabel("protected")}</option>
                                        </select>

                                        <input
                                            value={a.name}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setAttrs((prev) => prev.map((x, idx) => (idx === i ? { ...x, name: v } : x)));
                                            }}
                                            placeholder="attributeName"
                                            style={MONO_INPUT}
                                        />

                                        <input
                                            value={a.type}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setAttrs((prev) => prev.map((x, idx) => (idx === i ? { ...x, type: v } : x)));
                                            }}
                                            placeholder="Type"
                                            style={MONO_INPUT}
                                        />

                                        <button
                                            type="button"
                                            style={BTN_DANGER}
                                            onClick={() => setAttrs((prev) => prev.filter((_, idx) => idx !== i))}
                                            title="Remove"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Methods */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                            <div style={LABEL_STYLE}>Methods</div>
                            <button type="button" style={BTN_SMALL} onClick={addMethod}>
                                + Method
                            </button>
                        </div>

                        {methods.length === 0 ? (
                            <div style={{ fontSize: 12, color: "#8aa0c8" }}>No methods</div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", minWidth: 0 }}>
                                {methods.map((m, i) => {
                                    const retText = returnTextByIndex[i] ?? toReturnText(m);
                                    return (
                                        <div key={`method-${i}`} style={METHOD_CARD}>
                                            {/* Header (visibility + name + remove) */}
                                            <div
                                                style={{
                                                    ...ROW,
                                                    gridTemplateColumns: "100px minmax(0, 1fr) 40px",
                                                }}
                                            >
                                                <select
                                                    value={m.visibility}
                                                    onChange={(e) => {
                                                        const v = e.target.value as UmlVisibility;
                                                        setMethods((prev) =>
                                                            prev.map((x, idx) => (idx === i ? { ...x, visibility: v } : x))
                                                        );
                                                    }}
                                                    style={INPUT_BASE}
                                                >
                                                    <option value="none">{visibilityLabel("none")}</option>
                                                    <option value="public">{visibilityLabel("public")}</option>
                                                    <option value="private">{visibilityLabel("private")}</option>
                                                    <option value="protected">{visibilityLabel("protected")}</option>
                                                </select>

                                                <input
                                                    value={m.name}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setMethods((prev) => prev.map((x, idx) => (idx === i ? { ...x, name: v } : x)));
                                                    }}
                                                    placeholder="methodName"
                                                    style={MONO_INPUT}
                                                />

                                                <button
                                                    type="button"
                                                    style={BTN_DANGER}
                                                    onClick={() => setMethods((prev) => prev.filter((_, idx) => idx !== i))}
                                                    title="Remove"
                                                >
                                                    ×
                                                </button>
                                            </div>

                                            {/* Parameters */}
                                            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", minWidth: 0 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                                                    <div style={{ ...LABEL_STYLE, opacity: 0.9 }}>Parameters</div>
                                                    <button
                                                        type="button"
                                                        style={BTN_SMALL}
                                                        onClick={() =>
                                                            setMethods((prev) =>
                                                                prev.map((x, idx) =>
                                                                    idx === i
                                                                        ? {
                                                                            ...x,
                                                                            params: [
                                                                                ...(x.params ?? []),
                                                                                { direction: "in", name: "p", type: "Type" },
                                                                            ],
                                                                        }
                                                                        : x
                                                                )
                                                            )
                                                        }
                                                    >
                                                        + Param
                                                    </button>
                                                </div>

                                                {(m.params ?? []).length === 0 ? (
                                                    <div style={{ fontSize: 12, color: "#8aa0c8" }}>No parameters</div>
                                                ) : (
                                                    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", minWidth: 0 }}>
                                                        {(m.params ?? []).map((p2, pi) => (
                                                            <div
                                                                key={`param-${i}-${pi}`}
                                                                style={{
                                                                    ...ROW,
                                                                    gridTemplateColumns: "70px minmax(0, 1fr) minmax(0, 1fr) 40px",
                                                                }}
                                                            >
                                                                <select
                                                                    value={p2.direction}
                                                                    onChange={(e) => {
                                                                        const v = e.target.value as UmlParamDirection;
                                                                        setMethods((prev) =>
                                                                            prev.map((x, idx) => {
                                                                                if (idx !== i) return x;
                                                                                const nextParams = (x.params ?? []).map((pp, pidx) =>
                                                                                    pidx === pi ? { ...pp, direction: v } : pp
                                                                                );
                                                                                return { ...x, params: nextParams };
                                                                            })
                                                                        );
                                                                    }}
                                                                    style={INPUT_BASE}
                                                                >
                                                                    <option value="none">{directionLabel("none")}</option>
                                                                    <option value="in">{directionLabel("in")}</option>
                                                                    <option value="out">{directionLabel("out")}</option>
                                                                    <option value="inout">{directionLabel("inout")}</option>
                                                                </select>

                                                                <input
                                                                    value={p2.name}
                                                                    onChange={(e) => {
                                                                        const v = e.target.value;
                                                                        setMethods((prev) =>
                                                                            prev.map((x, idx) => {
                                                                                if (idx !== i) return x;
                                                                                const nextParams = (x.params ?? []).map((pp, pidx) =>
                                                                                    pidx === pi ? { ...pp, name: v } : pp
                                                                                );
                                                                                return { ...x, params: nextParams };
                                                                            })
                                                                        );
                                                                    }}
                                                                    placeholder="param"
                                                                    style={MONO_INPUT}
                                                                />

                                                                <input
                                                                    value={p2.type}
                                                                    onChange={(e) => {
                                                                        const v = e.target.value;
                                                                        setMethods((prev) =>
                                                                            prev.map((x, idx) => {
                                                                                if (idx !== i) return x;
                                                                                const nextParams = (x.params ?? []).map((pp, pidx) =>
                                                                                    pidx === pi ? { ...pp, type: v } : pp
                                                                                );
                                                                                return { ...x, params: nextParams };
                                                                            })
                                                                        );
                                                                    }}
                                                                    placeholder="Type"
                                                                    style={MONO_INPUT}
                                                                />

                                                                <button
                                                                    type="button"
                                                                    style={BTN_DANGER}
                                                                    onClick={() =>
                                                                        setMethods((prev) =>
                                                                            prev.map((x, idx) => {
                                                                                if (idx !== i) return x;
                                                                                const nextParams = (x.params ?? []).filter((_, pidx) => pidx !== pi);
                                                                                return { ...x, params: nextParams };
                                                                            })
                                                                        )
                                                                    }
                                                                    title="Remove"
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Returns */}
                                            <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", minWidth: 0 }}>
                                                <div style={{ ...LABEL_STYLE, opacity: 0.9 }}>Return type(s)</div>
                                                <input
                                                    value={retText}
                                                    onChange={(e) => {
                                                        const v = e.target.value;
                                                        setReturnTextByIndex((prev) => ({ ...prev, [i]: v }));
                                                        setMethods((prev) =>
                                                            prev.map((x, idx) => (idx === i ? { ...x, returnTypes: fromReturnText(v) } : x))
                                                        );
                                                    }}
                                                    placeholder="Type or TypeA, TypeB"
                                                    style={MONO_INPUT}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                        <ActionRow onDelete={p.onDelete} onDuplicate={p.onDuplicate} />
                    </div>
                </div>
            </Section>
        </div>
    );
}
