import { useEffect, useMemo, useState } from "react";
import type { Cardinality, RelationKind, UmlRelation } from "../../../../model/relation";
import Section from "../sections/Section";
import SelectField from "../sections/SelectField";
import TextField from "../sections/TextField";
import ActionRow from "../sections/ActionRow";

const CARD_PRESETS: { value: Cardinality; label: string }[] = [
    { value: "", label: "none" },
    { value: "1", label: "1 (exactly one)" },
    { value: "0..1", label: "0..1 (zero or one)" },
    { value: "0..*", label: "0..* (zero or more)" },
    { value: "1..*", label: "1..* (one or more)" },
];

type CardChoice = Cardinality | "__custom__";

function isPresetCardinality(c: string) {
    return c === "" || c === "1" || c === "0..1" || c === "0..*" || c === "1..*";
}

function isValidCustomCardinality(s: string) {
    const t = s.trim();
    if (t === "") return true;
    if (t === "*") return false;
    if (/^\d+$/.test(t)) return true; // N
    if (/^\d+\.\.\*$/.test(t)) return true; // N..*
    if (/^\d+\.\.\d+$/.test(t)) return true; // N..M
    return false;
}

function choiceFromCardinality(c: Cardinality): CardChoice {
    const t = (c ?? "").trim();
    return isPresetCardinality(t) ? (t as Cardinality) : "__custom__";
}

export default function RelationPanel(p: {
    r: UmlRelation;
    fromName: string;
    toName: string;

    onSetKind: (k: RelationKind) => void;
    onSetLabel: (label: string) => void;

    onSetCardinality: (args: { fromCardinality: Cardinality; toCardinality: Cardinality }) => void;

    onSwapDirection: () => void;
    onSetWaypointCount: (count: number) => void;
    onDelete: () => void;
}) {
    const [label, setLabel] = useState(p.r.label ?? "");

    const [fromChoice, setFromChoice] = useState<CardChoice>(() => choiceFromCardinality(p.r.fromCardinality ?? ""));
    const [toChoice, setToChoice] = useState<CardChoice>(() => choiceFromCardinality(p.r.toCardinality ?? ""));

    const [fromCustom, setFromCustom] = useState<string>(() =>
        fromChoice === "__custom__" ? (p.r.fromCardinality ?? "") : ""
    );
    const [toCustom, setToCustom] = useState<string>(() => (toChoice === "__custom__" ? (p.r.toCardinality ?? "") : ""));

    // valeur réellement appliquée (preset ou custom)
    const fromCardinality: Cardinality = useMemo(() => {
        if (fromChoice === "__custom__") return (fromCustom ?? "").trim();
        return fromChoice;
    }, [fromChoice, fromCustom]);

    const toCardinality: Cardinality = useMemo(() => {
        if (toChoice === "__custom__") return (toCustom ?? "").trim();
        return toChoice;
    }, [toChoice, toCustom]);

    useEffect(() => {
        setLabel(p.r.label ?? "");

        const nextFrom = p.r.fromCardinality ?? "";
        const nextTo = p.r.toCardinality ?? "";

        const nextFromChoice = choiceFromCardinality(nextFrom);
        const nextToChoice = choiceFromCardinality(nextTo);

        setFromChoice(nextFromChoice);
        setToChoice(nextToChoice);

        setFromCustom(nextFromChoice === "__custom__" ? nextFrom : "");
        setToCustom(nextToChoice === "__custom__" ? nextTo : "");
    }, [p.r.id, p.r.label, p.r.fromCardinality, p.r.toCardinality]);

    const waypointCount = p.r.controlPoints?.length ?? 0;

    const MIN_WP = 2;
    const MAX_WP = 10;

    function incWp(n: number) {
        if (n < MIN_WP) return MIN_WP;
        return Math.min(MAX_WP, n + 1);
    }

    function decWp(n: number) {
        if (n <= MIN_WP) return MIN_WP;
        return Math.max(MIN_WP, n - 1);
    }

    const stepBtnStyle = {
        flex: 1,
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid #2b1f27",
        background: "#14151c",
        color: "#eceaf2",
        cursor: "pointer",
    } as const;

    const cardOptions: { value: CardChoice; label: string }[] = useMemo(
        () => [...CARD_PRESETS, { value: "__custom__" as const, label: "custom…" }],
        []
    );

    function applyCards(nextFrom: Cardinality, nextTo: Cardinality) {
        p.onSetCardinality({ fromCardinality: nextFrom, toCardinality: nextTo });
    }

    return (
        <Section title="Relation">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 12, color: "#c9c4d6" }}>
                    {p.fromName} → {p.toName}
                </div>

                <button
                    type="button"
                    onClick={p.onSwapDirection}
                    style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #2b1f27",
                        background: "#101116",
                        color: "#eceaf2",
                        cursor: "pointer",
                    }}
                >
                    Swap direction
                </button>

                <SelectField<RelationKind>
                    label="Kind"
                    value={p.r.kind as any}
                    options={[
                        { value: "assoc", label: "Association" },
                        { value: "inherit", label: "Inheritance" },
                        { value: "realize", label: "Realization" },
                        { value: "depend", label: "Dependency" },
                        { value: "agg", label: "Aggregation" },
                        { value: "comp", label: "Composition" },
                    ]}
                    onChange={(k) => p.onSetKind(k)}
                />

                <TextField
                    label="Label"
                    value={label}
                    onChange={(v) => {
                        setLabel(v);
                        p.onSetLabel(v);
                    }}
                    placeholder="optional"
                />

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ fontSize: 12, color: "#c9c4d6" }}>Cardinality</div>

                    <SelectField<CardChoice>
                        label={`From (${p.fromName})`}
                        value={fromChoice}
                        options={cardOptions}
                        onChange={(v) => {
                            setFromChoice(v);
                            if (v === "__custom__") return; // attendre la saisie
                            applyCards(v, toCardinality);
                        }}
                    />

                    {fromChoice === "__custom__" ? (
                        <TextField
                            label={`From (${p.fromName}) custom`}
                            value={fromCustom}
                            onChange={(v) => {
                                setFromCustom(v);
                                if (!isValidCustomCardinality(v)) return;
                                applyCards(v.trim(), toCardinality);
                            }}
                            placeholder='Formats: "N", "N..M", "N..*"'
                        />
                    ) : null}

                    <SelectField<CardChoice>
                        label={`To (${p.toName})`}
                        value={toChoice}
                        options={cardOptions}
                        onChange={(v) => {
                            setToChoice(v);
                            if (v === "__custom__") return; // attendre la saisie
                            applyCards(fromCardinality, v);
                        }}
                    />

                    {toChoice === "__custom__" ? (
                        <TextField
                            label={`To (${p.toName}) custom`}
                            value={toCustom}
                            onChange={(v) => {
                                setToCustom(v);
                                if (!isValidCustomCardinality(v)) return;
                                applyCards(fromCardinality, v.trim());
                            }}
                            placeholder='Formats: "N", "N..M", "N..*"'
                        />
                    ) : null}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ fontSize: 12, color: "#c9c4d6" }}>Waypoints internes</div>

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
                                border: "1px solid #2b1f27",
                                background: "#101116",
                                color: "#eceaf2",
                                userSelect: "none",
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
                    <ActionRow onDelete={p.onDelete} />
                </div>
            </div>
        </Section>
    );
}
