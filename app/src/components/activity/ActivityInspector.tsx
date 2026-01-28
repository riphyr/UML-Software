import React from "react";
import type { ActivityFlow, ActivityFlowKind, ActivityNode, ActivityNodeKind } from "../../model/activity/activity";

function Section(p: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 12, background: "#0f1016" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>{p.title}</div>
            {p.children}
        </div>
    );
}

function Label(p: { t: string }) {
    return <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 6 }}>{p.t}</div>;
}

function Input(p: { value: string; onChange: (v: string) => void; placeholder?: string }) {
    return (
        <input
            value={p.value}
            placeholder={p.placeholder}
            onChange={(e) => p.onChange(e.target.value)}
            style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "#101116",
                color: "#eceaf2",
                fontSize: 12,
                outline: "none",
            }}
        />
    );
}

function Button(p: { onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={p.onClick}
            style={{
                width: "100%",
                padding: "7px 10px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "#101116",
                color: "#eceaf2",
                fontSize: 12,
                cursor: "pointer",
            }}
        >
            {p.children}
        </button>
    );
}

function Select(p: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
    return (
        <select
            value={p.value}
            onChange={(e) => p.onChange(e.target.value)}
            style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "#101116",
                color: "#eceaf2",
                fontSize: 12,
                outline: "none",
                cursor: "pointer",
            }}
        >
            {p.children}
        </select>
    );
}

export default function ActivityInspector(p: {
    selectedNodes: ActivityNode[];
    selectedFlow: ActivityFlow | null;

    setNodeName: (id: string, name: string) => void;
    setNodeKind: (id: string, kind: ActivityNodeKind) => void;

    setFlowLabel: (id: string, label: string) => void;
    setFlowGuard: (id: string, guard: string) => void;
    setFlowKind: (id: string, kind: ActivityFlowKind) => void;

    deleteSelected: () => void;
}) {
    const singleNode = p.selectedNodes.length === 1 ? p.selectedNodes[0] : null;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {p.selectedFlow ? (
                <Section title="Flow">
                    <Label t="Type" />
                    <Select value={p.selectedFlow.kind} onChange={(v) => p.setFlowKind(p.selectedFlow!.id, v as ActivityFlowKind)}>
                        <option value="control">control</option>
                        <option value="object">object</option>
                    </Select>

                    <div style={{ height: 10 }} />

                    <Label t="Guard (ex: [x>0])" />
                    <Input value={p.selectedFlow.guard} onChange={(v) => p.setFlowGuard(p.selectedFlow!.id, v)} placeholder="[condition]" />

                    <div style={{ height: 8 }} />

                    <Label t="Label" />
                    <Input value={p.selectedFlow.label} onChange={(v) => p.setFlowLabel(p.selectedFlow!.id, v)} placeholder="label" />

                    <div style={{ height: 10 }} />
                    <Button onClick={p.deleteSelected}>Delete</Button>
                </Section>
            ) : p.selectedNodes.length > 1 ? (
                <Section title="Multiple selection">
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }}>{p.selectedNodes.length} nodes</div>
                    <div style={{ height: 10 }} />
                    <Button onClick={p.deleteSelected}>Delete</Button>
                </Section>
            ) : singleNode ? (
                <Section title={`Node (${singleNode.kind})`}>
                    <Label t="Type" />
                    <Select value={singleNode.kind} onChange={(v) => p.setNodeKind(singleNode.id, v as ActivityNodeKind)}>
                        <option value="action">Action</option>
                        <option value="object">Object</option>
                        <option value="decision">Decision</option>
                        <option value="merge">Merge</option>
                        <option value="fork">Fork</option>
                        <option value="join">Join</option>
                        <option value="initial">Initial</option>
                        <option value="final">Final</option>
                    </Select>

                    <div style={{ height: 10 }} />

                    <Label t="Name" />
                    <Input value={singleNode.name} onChange={(v) => p.setNodeName(singleNode.id, v)} placeholder="name" />

                    <div style={{ height: 10 }} />
                    <Button onClick={p.deleteSelected}>Delete</Button>
                </Section>
            ) : (
                <Section title="Inspector">
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>Nothing selected</div>
                </Section>
            )}
        </div>
    );
}
