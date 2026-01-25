export default function TextField(p: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}) {
    return (
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#c9c4d6" }}>{p.label}</div>
            <input
                value={p.value}
                placeholder={p.placeholder}
                onChange={(e) => p.onChange(e.target.value)}
                style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #2b1f27",
                    background: "#0b0f19",
                    color: "#eceaf2",
                    outline: "none",
                }}
            />
        </label>
    );
}
