import ToolbarButton from "./ToolbarButton";
import NumberSpinner from "./NumberSpinner";
import type { EditorMode, GridState } from "../../../model/ui";

export default function Toolbar(p: {
    mode: EditorMode;
    setMode: (m: EditorMode) => void;

    grid: GridState;
    toggleGrid: () => void;
    setGridSize: (n: number) => void;

    undo: () => void;
    redo: () => void;

    recenter: () => void;
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
            }}
        >
            <div style={{ display: "flex", gap: 8 }}>
                <ToolbarButton active={p.mode === "select"} title="Select (V)" onClick={() => p.setMode("select")}>
                    Select
                </ToolbarButton>
                <ToolbarButton
                    active={p.mode === "multiSelect"}
                    title="Multi Selection (M)"
                    onClick={() => p.setMode("multiSelect")}
                >
                    Multi-select
                </ToolbarButton>
                <ToolbarButton active={p.mode === "link"} title="Link (L)" onClick={() => p.setMode("link")}>
                    Link
                </ToolbarButton>
                <ToolbarButton active={p.mode === "addClass"} title="Add Class (C)" onClick={() => p.setMode("addClass")}>
                    New class
                </ToolbarButton>
            </div>

            <div style={{ width: 1, height: 28, background: "#2b1f27" }} />

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <ToolbarButton active={p.grid.enabled} title="Toggle grid (G)" onClick={p.toggleGrid}>
                    Grid
                </ToolbarButton>

                <NumberSpinner
                    value={p.grid.size}
                    min={10}
                    step={10}
                    onChange={(v) => p.setGridSize(Math.max(4, Math.floor(v)))}
                />

                <ToolbarButton title="Recenter view" onClick={p.recenter}>
                    Center
                </ToolbarButton>
            </div>

            <div style={{ width: 1, height: 28, background: "#2b1f27" }} />

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
