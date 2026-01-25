export default function SelectField<T extends string>(p: {
    label: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (v: T) => void;
}) {
    return (
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#c9c4d6" }}>{p.label}</div>
            <select
                value={p.value}
                onChange={(e) => p.onChange(e.target.value as T)}
                style={{
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: "1px solid #2b1f27",
                    background: "#0b0f19",
                    color: "#eceaf2",
                    outline: "none",
                }}
            >
                {p.options.map(o => (
                    <option key={o.value} value={o.value}>
                        {o.label}
                    </option>
                ))}
            </select>
        </label>
    );
}
