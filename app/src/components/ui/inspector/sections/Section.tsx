import type { ReactNode } from "react";

export default function Section(p: { title: string; children: ReactNode }) {
    return (
        <div style={{ padding: 12, border: "1px solid #2b1f27", borderRadius: 12, background: "#101116" }}>
            <div style={{ fontSize: 12, color: "#c9c4d6", marginBottom: 8 }}>{p.title}</div>
            {p.children}
        </div>
    );
}
