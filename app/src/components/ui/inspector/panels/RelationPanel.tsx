import { useEffect, useState } from "react";
import type { UmlRelation, RelationKind } from "../../../../model/relation";
import Section from "../sections/Section";
import SelectField from "../sections/SelectField";
import TextField from "../sections/TextField";
import ActionRow from "../sections/ActionRow";

export default function RelationPanel(p: {
    r: UmlRelation;
    fromName: string;
    toName: string;
    onSetKind: (k: RelationKind) => void;
    onSetLabel: (label: string) => void;
    onDelete: () => void;
}) {
    const [label, setLabel] = useState(p.r.label ?? "");

    useEffect(() => {
        setLabel(p.r.label ?? "");
    }, [p.r.id, p.r.label]);

    return (
        <Section title="Relation">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 12, color: "#a9b4d0" }}>
                    {p.fromName} → {p.toName}
                </div>

                <SelectField<RelationKind>
                    label="Kind"
                    value={p.r.kind}
                    options={[
                        { value: "assoc", label: "Association" },
                        { value: "herit", label: "Inheritance" },
                        { value: "agg", label: "Aggregation" },
                        { value: "comp", label: "Composition" },
                    ]}
                    onChange={p.onSetKind}
                />

                <TextField
                    label="Label"
                    value={label}
                    onChange={setLabel}
                    placeholder="optional"
                />

                <div style={{ display: "flex", gap: 8 }}>
                    <button
                        type="button"
                        onClick={() => p.onSetLabel(label)}
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
                    <ActionRow onDelete={p.onDelete} />
                </div>
            </div>
        </Section>
    );
}
