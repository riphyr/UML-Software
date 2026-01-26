import React from "react";
import type { ActivityMode } from "./canvas/useActivityState";

function Btn(p: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
        <button
            onClick={p.onClick}
            style={{
                padding: "6px 10px",
                borderRadius: 10,
                border: `1px solid ${p.active ? "var(--accent)" : "var(--border)"}`,
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

export default function ActivityToolbar(p: {
    mode: ActivityMode;
    setMode: (m: ActivityMode) => void;
    undo: () => void;
    redo: () => void;
}) {
    return (
        <div style={{ position: "absolute", top: 12, left: 12, zIndex: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn active={p.mode === "select"} onClick={() => p.setMode("select")}>Select</Btn>
            <Btn active={p.mode === "addInitial"} onClick={() => p.setMode("addInitial")}>Initial</Btn>
            <Btn active={p.mode === "addAction"} onClick={() => p.setMode("addAction")}>Action</Btn>
            <Btn active={p.mode === "addDecision"} onClick={() => p.setMode("addDecision")}>Decision</Btn>
            <Btn active={p.mode === "addFinal"} onClick={() => p.setMode("addFinal")}>Final</Btn>
            <Btn active={p.mode === "linkControl"} onClick={() => p.setMode("linkControl")}>Link</Btn>
            <Btn onClick={p.undo}>Undo</Btn>
            <Btn onClick={p.redo}>Redo</Btn>
        </div>
    );
}
