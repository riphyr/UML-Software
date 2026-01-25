import type { ReactNode } from "react";

export default function ToolbarButton(p: {
    active?: boolean;
    title: string;
    onClick: () => void;
    children: ReactNode;
}) {
    const bg = p.active ? "#2a1220" : "#0f1118";
    const border = p.active ? "#ff355d" : "#2b1f27";

    return (
        <button
            type="button"
            title={p.title}
            onClick={p.onClick}
            style={{
                padding: "6px 10px",
                borderRadius: 8,
                border: `1px solid ${border}`,
                background: bg,
                color: "#eceaf2",
                fontSize: 13,
                cursor: "pointer",
                userSelect: "none",
            }}
        >
            {p.children}
        </button>
    );
}
