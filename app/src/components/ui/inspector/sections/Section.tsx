import type { ReactNode } from "react";

export default function Section(p: { title: string; children: ReactNode }) {
    return (
        <div style={{ padding: 12, border: "1px solid #2a3040", borderRadius: 12, background: "#111521" }}>
            <div style={{ fontSize: 12, color: "#a9b4d0", marginBottom: 8 }}>{p.title}</div>
            {p.children}
        </div>
    );
}
