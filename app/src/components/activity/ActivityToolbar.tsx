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

                <ToolbarButton active={p.mode === "link"} title="Link (L)" onClick={() => p.setMode("link")}>
                    Link
                </ToolbarButton>

                <ToolbarButton active={p.mode === "addNode"} title="Add node (A)" onClick={() => p.setMode("addNode")}>
                    Node
                </ToolbarButton>

                <ToolbarButton active={p.mode === "addObject"} title="Add object (O)" onClick={() => p.setMode("addObject")}>
                    Object
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
