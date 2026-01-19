import type { ReactNode } from "react";

export default function ToolbarButton(p: {
    active?: boolean;
    title: string;
    onClick: () => void;
    children: ReactNode;
}) {
    const bg = p.active ? "#2a3a55" : "#1e2430";
    const border = p.active ? "#6aa9ff" : "#2a3040";

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
                color: "#e8eefc",
                fontSize: 13,
                cursor: "pointer",
                userSelect: "none",
            }}
        >
            {p.children}
        </button>
    );
}
