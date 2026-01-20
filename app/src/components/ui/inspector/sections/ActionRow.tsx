export default function ActionRow(p: { onDelete: () => void; onDuplicate?: () => void }) {
    return (
        <div style={{ display: "flex", gap: 8 }}>
            {p.onDuplicate && (
                <button
                    type="button"
                    onClick={p.onDuplicate}
                    style={{
                        padding: "8px 10px",
                        borderRadius: 10,
                        border: "1px solid #2a3040",
                        background: "#161b28",
                        color: "#e8eefc",
                        cursor: "pointer",
                    }}
                >
                    Duplicate
                </button>
            )}
            <button
                type="button"
                onClick={p.onDelete}
                style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #3a2630",
                    background: "#23111a",
                    color: "#ffd6df",
                    cursor: "pointer",
                }}
            >
                Delete
            </button>
        </div>
    );
}
