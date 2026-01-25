import ToolbarButton from "./ToolbarButton";
import type { EditorMode, GridState } from "../../../model/ui";

export default function Toolbar(p: {
    mode: EditorMode;
    setMode: (m: EditorMode) => void;

    grid: GridState;
    toggleGrid: () => void;
    setGridSize: (n: number) => void;

    undo: () => void;
    redo: () => void;

    save: () => void;
    load: () => void;
    exportFile: () => void;
    importFile: () => void;

    exportPng: () => void; // AJOUT
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
                border: "1px solid #2a3040",
                background: "rgba(16, 18, 24, 0.85)",
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

            <div style={{ width: 1, height: 28, background: "#2a3040" }} />

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <ToolbarButton active={p.grid.enabled} title="Toggle grid (G)" onClick={p.toggleGrid}>
                    Grid
                </ToolbarButton>

                <label style={{ display: "flex", gap: 6, alignItems: "center", color: "#cdd6f4", fontSize: 12 }}>
                    size
                    <input
                        type="number"
                        value={p.grid.size}
                        min={10}
                        step={10}
                        onChange={(e) => p.setGridSize(Number(e.target.value) || 10)}
                        style={{
                            width: 64,
                            padding: "6px 8px",
                            borderRadius: 8,
                            border: "1px solid #2a3040",
                            background: "#151924",
                            color: "#e8eefc",
                        }}
                    />
                </label>
            </div>

            <div style={{ width: 1, height: 28, background: "#2a3040" }} />

            <div style={{ display: "flex", gap: 8 }}>
                <ToolbarButton title="Undo (Ctrl+Z)" onClick={p.undo}>
                    Undo
                </ToolbarButton>
                <ToolbarButton title="Redo (Ctrl+Y / Ctrl+Shift+Z)" onClick={p.redo}>
                    Redo
                </ToolbarButton>
            </div>

            <div style={{ width: 1, height: 28, background: "#2a3040" }} />

            <div style={{ display: "flex", gap: 8 }}>
                <ToolbarButton title="Save" onClick={p.save}>
                    Save
                </ToolbarButton>
                <ToolbarButton title="Load" onClick={p.load}>
                    Load
                </ToolbarButton>
                <ToolbarButton title="Export" onClick={p.exportFile}>
                    Export
                </ToolbarButton>
                <ToolbarButton title="Import" onClick={p.importFile}>
                    Import
                </ToolbarButton>

                <ToolbarButton title="Export image (PNG)" onClick={p.exportPng}>
                    Export PNG
                </ToolbarButton>
            </div>
        </div>
    );
}
