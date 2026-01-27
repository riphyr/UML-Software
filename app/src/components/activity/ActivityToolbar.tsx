import ToolbarButton from "../ui/toolbar/ToolbarButton";
import NumberSpinner from "../ui/toolbar/NumberSpinner";
import type { ActivityMode } from "./canvas/useActivityState";

export default function ActivityToolbar(p: {
    mode: ActivityMode;
    setMode: (m: ActivityMode) => void;

    grid: { enabled: boolean; size: number };
    toggleGrid: () => void;
    setGridSize: (n: number) => void;
    recenter: () => void;

    undo: () => void;
    redo: () => void;
}) {
    return (
        <div
            style={{
                position: "absolute",
                top: 12,
                left: 12,
                display: "flex",
                gap: 10,
                alignItems: "center",
                padding: 10,
                borderRadius: 12,
                border: "1px solid #2b1f27",
                background: "rgba(15, 17, 24, 0.85)",
                backdropFilter: "blur(6px)",
                zIndex: 10,
                flexWrap: "wrap",
            }}
        >
            {/* Main tools */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ToolbarButton active={p.mode === "select"} title="Select (V)" onClick={() => p.setMode("select")}>
                    Select
                </ToolbarButton>

                <ToolbarButton
                    active={p.mode === "linkControl"}
                    title="Control flow link (L)"
                    onClick={() => p.setMode("linkControl")}
                >
                    Link
                </ToolbarButton>

                <ToolbarButton
                    active={p.mode === "linkObject"}
                    title="Object flow link (Shift+L)"
                    onClick={() => p.setMode("linkObject")}
                >
                    Obj link
                </ToolbarButton>
            </div>

            <div style={{ width: 1, height: 28, background: "#2b1f27" }} />

            {/* Node creation */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ToolbarButton active={p.mode === "addAction"} title="Add Action (A)" onClick={() => p.setMode("addAction")}>
                    Action
                </ToolbarButton>
                <ToolbarButton
                    active={p.mode === "addDecision"}
                    title="Add Decision (D)"
                    onClick={() => p.setMode("addDecision")}
                >
                    Decision
                </ToolbarButton>
                <ToolbarButton active={p.mode === "addMerge"} title="Add Merge (E)" onClick={() => p.setMode("addMerge")}>
                    Merge
                </ToolbarButton>
                <ToolbarButton active={p.mode === "addFork"} title="Add Fork (F)" onClick={() => p.setMode("addFork")}>
                    Fork
                </ToolbarButton>
                <ToolbarButton active={p.mode === "addJoin"} title="Add Join (J)" onClick={() => p.setMode("addJoin")}>
                    Join
                </ToolbarButton>
                <ToolbarButton
                    active={p.mode === "addObject"}
                    title="Add Object (O)"
                    onClick={() => p.setMode("addObject")}
                >
                    Object
                </ToolbarButton>
                <ToolbarButton
                    active={p.mode === "addInitial"}
                    title="Add Initial (I)"
                    onClick={() => p.setMode("addInitial")}
                >
                    Initial
                </ToolbarButton>
                <ToolbarButton active={p.mode === "addFinal"} title="Add Final (X)" onClick={() => p.setMode("addFinal")}>
                    Final
                </ToolbarButton>
            </div>

            <div style={{ width: 1, height: 28, background: "#2b1f27" }} />

            {/* Grid */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <ToolbarButton active={p.grid.enabled} title="Toggle grid (G)" onClick={p.toggleGrid}>
                    Grid
                </ToolbarButton>

                <label style={{ display: "flex", gap: 6, alignItems: "center", color: "#c9c4d6", fontSize: 12 }}>
                    size
                    <NumberSpinner
                        value={p.grid.size}
                        min={10}
                        step={10}
                        onChange={(v) => p.setGridSize(Math.max(4, Math.floor(v)))}
                    />
                </label>

                <ToolbarButton title="Recenter view" onClick={p.recenter}>
                    Center
                </ToolbarButton>
            </div>

            <div style={{ width: 1, height: 28, background: "#2b1f27" }} />

            {/* Undo/redo */}
            <div style={{ display: "flex", gap: 8 }}>
                <ToolbarButton title="Undo (Ctrl+Z)" onClick={p.undo}>
                    Undo
                </ToolbarButton>
                <ToolbarButton title="Redo (Ctrl+Y / Ctrl+Shift+Z)" onClick={p.redo}>
                    Redo
                </ToolbarButton>
            </div>
        </div>
    );
}
