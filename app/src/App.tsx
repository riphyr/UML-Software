import { useRef, useState } from "react";
import DiagramCanvas, { type DiagramCanvasHandle } from "./components/DiagramCanvas";
import ToolbarButton from "./components/ui/toolbar/ToolbarButton";
import type { DiagramType } from "./model/umlDocument";

const LABEL: Record<DiagramType, string> = {
    class: "Class",
    activity: "Activity",
    state: "State",
    sequence: "Sequence",
    usecase: "Use case",
};

export default function App() {
    const canvasRef = useRef<DiagramCanvasHandle | null>(null);
    const [diagramType, setDiagramType] = useState<DiagramType>("class");

    return (
        <div
            style={{
                height: "100vh",
                background: "var(--bg)",
                color: "var(--text)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            }}
        >
            {/* Top app bar */}
            <div
                style={{
                    height: 48,
                    padding: "0 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    borderBottom: "1px solid var(--border)",
                    background: "rgba(15, 17, 24, 0.70)",
                    backdropFilter: "blur(8px)",
                    flex: "0 0 auto",
                    userSelect: "none",
                }}
            >
                <div
                    style={{
                        fontFamily: "system-ui, sans-serif",
                        fontSize: 13,
                        color: "var(--text-muted)",
                        marginRight: 8,
                        letterSpacing: 0.2,
                    }}
                >
                    UbnerithUML
                </div>

                <div style={{ width: 1, height: 22, background: "var(--border)" }} />

                {/* Diagram type selector (document-level) */}
                <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 12 }}>
                    Diagram
                    <select
                        value={diagramType}
                        onChange={(e) => {
                            const t = e.target.value as DiagramType;
                            setDiagramType(t);
                            canvasRef.current?.setDiagramType(t);
                        }}
                        style={{
                            height: 30,
                            padding: "0 10px",
                            borderRadius: 10,
                            border: "1px solid var(--border)",
                            background: "rgba(24, 20, 28, 0.9)",
                            color: "var(--text)",
                            outline: "none",
                        }}
                        title="Diagram type"
                    >
                        {Object.entries(LABEL).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v}
                            </option>
                        ))}
                    </select>
                </label>

                <div style={{ width: 1, height: 22, background: "var(--border)" }} />

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <ToolbarButton
                        title="Save"
                        onClick={() => {
                            canvasRef.current?.save();
                        }}
                    >
                        Save
                    </ToolbarButton>

                    <ToolbarButton
                        title="Load"
                        onClick={() => {
                            canvasRef.current?.load();
                            // re-sync selector with loaded document
                            const t = canvasRef.current?.getDiagramType?.();
                            if (t) setDiagramType(t);
                        }}
                    >
                        Load
                    </ToolbarButton>

                    <div style={{ width: 1, height: 22, background: "var(--border)" }} />

                    <ToolbarButton
                        title="Import"
                        onClick={async () => {
                            await canvasRef.current?.importFile();
                            const t = canvasRef.current?.getDiagramType?.();
                            if (t) setDiagramType(t);
                        }}
                    >
                        Import
                    </ToolbarButton>

                    <ToolbarButton
                        title="Export"
                        onClick={() => {
                            canvasRef.current?.exportFile();
                        }}
                    >
                        Export
                    </ToolbarButton>

                    <ToolbarButton
                        title="Export image (PNG)"
                        onClick={() => {
                            canvasRef.current?.exportPng();
                        }}
                    >
                        Export PNG
                    </ToolbarButton>

                    <ToolbarButton
                        title="Export image (PNG) - reversed colors"
                        onClick={() => {
                            canvasRef.current?.exportPng({ colorMode: "invert" });
                        }}
                    >
                        Export PNG Reverse
                    </ToolbarButton>
                </div>
            </div>

            <div
                style={{
                    padding: 16,
                    flex: "1 1 auto",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        height: "100%",
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "#101116",
                        overflow: "hidden",
                    }}
                >
                    <DiagramCanvas ref={canvasRef} />
                </div>
            </div>
        </div>
    );
}
