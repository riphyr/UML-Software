import DiagramCanvas from "./components/DiagramCanvas";

export default function App() {
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
            <div
                style={{
                    height: 56,
                    padding: 16,
                    fontFamily: "system-ui, sans-serif",
                    flex: "0 0 auto",
                }}
            >
                UML Software — Canvas
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
                    <DiagramCanvas />
                </div>
            </div>
        </div>
    );
}
