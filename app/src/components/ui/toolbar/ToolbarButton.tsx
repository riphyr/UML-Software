import type { CSSProperties, ReactNode } from "react";

export default function ToolbarButton(p: {
    active?: boolean;
    title: string;
    onClick: () => void;
    children: ReactNode;
    style?: CSSProperties;
    disabled?: boolean;
}) {
    const bg = p.active ? "#2a1220" : "#0f1118";
    const border = p.active ? "#ff355d" : "#2b1f27";

    return (
        <button
            type="button"
            title={p.title}
            onClick={p.onClick}
            disabled={p.disabled}
            style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: `1px solid ${border}`,
                background: bg,
                color: "#eceaf2",
                fontSize: 13,
                cursor: p.disabled ? "not-allowed" : "pointer",
                userSelect: "none",
                opacity: p.disabled ? 0.55 : 1,
                ...p.style,
            }}
        >
            {p.children}
        </button>
    );
}
