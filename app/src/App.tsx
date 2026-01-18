import DiagramCanvas from "./components/DiagramCanvas";

export default function App() {
    return (
        <div
            style={{
                height: "100vh",
                background: "#0f1115",
                color: "#e6e6e6",
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
                        border: "1px solid #2a2f3a",
                        background: "#141824",
                        overflow: "hidden",
                    }}
                >
                    <DiagramCanvas />
                </div>
            </div>
        </div>
    );
}
