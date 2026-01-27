import ToolbarButton from "./ToolbarButton";

export default function NumberSpinner(p: {
    value: number;
    onChange: (v: number) => void;
    min?: number;
    step?: number;
    width?: number;
}) {
    const min = p.min ?? -Infinity;
    const step = p.step ?? 1;
    const w = p.width ?? 64;

    const set = (v: number) => p.onChange(Math.max(min, v));

    return (
        <div style={{ position: "relative", width: w }}>
            <input
                type="number"
                value={p.value}
                step={step}
                min={Number.isFinite(min) ? min : undefined}
                onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n)) set(n);
                }}
                style={{
                    width: "100%",
                    padding: "6px 28px 6px 8px", // right padding for buttons
                    borderRadius: 8,
                    border: "1px solid #2b1f27",
                    background: "#180c12",
                    color: "#eceaf2",
                    outline: "none",
                    fontSize: 12,
                }}
            />

            <div
                style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    bottom: 2,
                    width: 22,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                }}
            >
                <ToolbarButton
                    title="Increase"
                    onClick={() => set(p.value + step)}
                    style={{
                        padding: 0,
                        minWidth: 0,
                        height: "50%",
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        lineHeight: 1,
                        fontSize: 10,
                    }}
                >
                    ▲
                </ToolbarButton>
                <ToolbarButton
                    title="Decrease"
                    onClick={() => set(p.value - step)}
                    style={{
                        padding: 0,
                        minWidth: 0,
                        height: "50%",
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        lineHeight: 1,
                        fontSize: 10,
                    }}
                >
                    ▼
                </ToolbarButton>
            </div>
        </div>
    );
}
