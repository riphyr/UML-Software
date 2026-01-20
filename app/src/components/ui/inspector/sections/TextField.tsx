export default function TextField(p: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#cdd6f4" }}>{p.label}</div>
            <input
                value={p.value}
                placeholder={p.placeholder}
                onChange={(e) => p.onChange(e.target.value)}
                style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #2a3040",
                    background: "#0b0f19",
                    color: "#e8eefc",
                    outline: "none",
                }}
            />
        </label>
    );
}
