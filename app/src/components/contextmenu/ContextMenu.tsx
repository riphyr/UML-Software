import { useEffect } from "react";

export type ContextMenuItem = {
    label: string;
    disabled?: boolean;
    onClick: () => void;
};

export default function ContextMenu(props: {
    open: boolean;
    x: number;
    y: number;
    items: ContextMenuItem[];
    onClose: () => void;
}) {
    const { open, x, y, items, onClose } = props;

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
            }}
            onMouseDown={onClose}
        >
            <div
                style={{
                    position: "fixed",
                    left: x,
                    top: y,
                    minWidth: 220,
                    background: "#111",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    padding: 6,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
                }}
                onMouseDown={(e) => e.stopPropagation()}
            >
                {items.map((it, i) => (
                    <button
                        key={i}
                        disabled={it.disabled}
                        onClick={() => {
                            it.onClick();
                            onClose();
                        }}
                        style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            padding: "8px 10px",
                            borderRadius: 6,
                            border: "none",
                            background: "transparent",
                            color: it.disabled ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.92)",
                            cursor: it.disabled ? "default" : "pointer",
                            fontSize: 13,
                        }}
                    >
                        {it.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
