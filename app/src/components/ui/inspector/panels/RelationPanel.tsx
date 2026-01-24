// RelationPanel.tsx
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
    onSwapDirection: () => void;
    onSetWaypointCount: (count: number) => void;
    onDelete: () => void;
}) {
    const [label, setLabel] = useState(p.r.label ?? "");

    useEffect(() => {
        setLabel(p.r.label ?? "");
    }, [p.r.id, p.r.label]);

    const waypointCount = p.r.controlPoints?.length ?? 0;

    // 0 = auto (pas de controlPoints)
    // manual = entre 2 et 10
    const MIN_WP = 2;
    const MAX_WP = 10;

    function incWp(n: number) {
        if (n < MIN_WP) return MIN_WP; // 0 -> 2
        return Math.min(MAX_WP, n + 1);
    }

    function decWp(n: number) {
        // borné (pas de "auto" ici) : manuel entre MIN et MAX
        if (n <= MIN_WP) return MIN_WP;
        return Math.max(MIN_WP, n - 1);
    }

    const stepBtnStyle = {
        flex: 1,
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid #2a3040",
        background: "#161b28",
        color: "#e8eefc",
        cursor: "pointer",
    } as const;

    return (
        <Section title="Relation">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 12, color: "#a9b4d0" }}>
                    {p.fromName} → {p.toName}
                </div>

                <button
                    type="button"
                    onClick={p.onSwapDirection}
                    style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #2a3040",
                        background: "#0f1420",
                        color: "#e8eefc",
                        cursor: "pointer",
                    }}
                >
                    Swap direction
                </button>

                <SelectField<RelationKind>
                    label="Kind"
                    value={p.r.kind}
                    options={[
                        { value: "assoc", label: "Association" },
                        { value: "inherit", label: "Inheritance" },
                        { value: "realize", label: "Realization" },
                        { value: "depend", label: "Dependency" },
                        { value: "agg", label: "Aggregation" },
                        { value: "comp", label: "Composition" },
                    ]}
                    onChange={p.onSetKind}
                />

                <TextField label="Label" value={label} onChange={setLabel} placeholder="optional" />

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontSize: 12, color: "#a9b4d0" }}>Waypoints internes</div>

                    <div style={{ display: "flex", gap: 8, width: "100%" }}>
                        <button
                            type="button"
                            onClick={() => p.onSetWaypointCount(decWp(waypointCount))}
                            style={stepBtnStyle}
                        >
                            −
                        </button>

                        <div
                            style={{
                                flex: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 10,
                                border: "1px solid #2a3040",
                                background: "#0f1420",
                                color: "#e8eefc",
                                fontSize: 13,
                                fontVariantNumeric: "tabular-nums",
                                height: 36,
                            }}
                        >
                            {waypointCount}
                        </div>

                        <button
                            type="button"
                            onClick={() => p.onSetWaypointCount(incWp(waypointCount))}
                            style={stepBtnStyle}
                        >
                            +
                        </button>
                    </div>
                </div>

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
