import type { InspectorActions } from "../inspector.types";

export default function MultiPanel(p: {
    selectionCount: number;
    nodeCount: number;
    relationCount: number;
    actions: InspectorActions;
}) {
    return (
        <div style={{ padding: 12, color: "#e6e6e6", fontFamily: "Inter, system-ui, sans-serif" }}>
            <div style={{ fontSize: 14, marginBottom: 10 }}>Multi-selection ({p.selectionCount})</div>

            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 12 }}>
                Nodes: {p.nodeCount} • Relations: {p.relationCount}
            </div>

            <button
                onClick={p.actions.deleteSelected}
                style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #3a2b34",
                    background: "#2a1220",
                    color: "#eceaf2",
                    cursor: "pointer",
                }}
            >
                Delete selection
            </button>
        </div>
    );
}
