import { useEffect, useState } from "react";
import type { UmlClass } from "../../../../model/uml";
import Section from "../sections/Section";
import TextField from "../sections/TextField";
import ActionRow from "../sections/ActionRow";

function linesToArray(s: string) {
    return s
        .split("\n")
        .map(x => x.trimEnd())
        .filter(x => x.trim().length > 0);
}

export default function ClassPanel(p: {
    c: UmlClass;
    onApply: (next: { name: string; attributes: string[]; methods: string[] }) => void;
    onDelete: () => void;
    onDuplicate: () => void;
}) {
    const [name, setName] = useState(p.c.name);
    const [attrsText, setAttrsText] = useState(p.c.attributes.join("\n"));
    const [methodsText, setMethodsText] = useState(p.c.methods.join("\n"));

    const attrsJoined = p.c.attributes.join("\n");
    const methodsJoined = p.c.methods.join("\n");

    useEffect(() => {
        setName(p.c.name);
        setAttrsText(attrsJoined);
        setMethodsText(methodsJoined);
    }, [p.c.id, p.c.name, attrsJoined, methodsJoined]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Section title="Class">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <TextField
                        label="Name"
                        value={name}
                        onChange={(v) => setName(v)}
                        placeholder="ClassName"
                    />

                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ fontSize: 12, color: "#cdd6f4" }}>Attributes (1 per line)</div>
                        <textarea
                            value={attrsText}
                            onChange={(e) => setAttrsText(e.target.value)}
                            rows={6}
                            style={{
                                padding: "8px 10px",
                                borderRadius: 10,
                                border: "1px solid #2a3040",
                                background: "#0b0f19",
                                color: "#e8eefc",
                                outline: "none",
                                resize: "vertical",
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                fontSize: 12,
                            }}
                        />
                    </label>

                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ fontSize: 12, color: "#cdd6f4" }}>Methods (1 per line)</div>
                        <textarea
                            value={methodsText}
                            onChange={(e) => setMethodsText(e.target.value)}
                            rows={6}
                            style={{
                                padding: "8px 10px",
                                borderRadius: 10,
                                border: "1px solid #2a3040",
                                background: "#0b0f19",
                                color: "#e8eefc",
                                outline: "none",
                                resize: "vertical",
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                fontSize: 12,
                            }}
                        />
                    </label>

                    <div style={{ display: "flex", gap: 8 }}>
                        <button
                            type="button"
                            onClick={() => {
                                p.onApply({
                                    name: name.trim() || "ClassName",
                                    attributes: linesToArray(attrsText),
                                    methods: linesToArray(methodsText),
                                });
                            }}
                            style={{
                                padding: "8px 10px",
                                borderRadius: 10,
                                border: "1px solid #2a3040",
                                background: "#161b28",
                                color: "#e8eefc",
                                cursor: "pointer",
                            }}
                        >
                            Apply
                        </button>
                        <ActionRow onDelete={p.onDelete} onDuplicate={p.onDuplicate} />
                    </div>
                </div>
            </Section>
        </div>
    );
}
