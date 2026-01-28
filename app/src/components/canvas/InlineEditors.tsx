import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { NODE_LINE_HEIGHT, NODE_HEADER_HEIGHT } from "../nodes/layout";

type Props = {
    x: number;
    y: number;
    width: number;

    editingAttrIndex: number | null;
    editingMethodIndex: number | null;

    editingName: boolean;
    nameValue: string;
    onNameChange: (v: string) => void;

    // Must match the rendered ClassNode name typography when editing.
    // If omitted, falls back to the old defaults (14 / normal).
    nameFontSize?: number;
    nameFontWeight?: number;
    nameFontStyle?: "normal" | "italic";

    attrStartY: number;
    methodsStartY: number;

    editBuffer: string;
    setEditBuffer: (v: string) => void;

    commitLine: () => void;
    cancelLine: () => void;

    commitName: () => void;
    cancelName: () => void;
};

const TEXT_PADDING_X = 8; // doit matcher ClassNode
const BORDER_EXTRA_X = 4;
const BORDER_HEIGHT = 18;
const BORDER_Y_OFFSET = -1;

const BORDER_COLOR = "#ff355d";
const CARET_COLOR = "#e6e6e6";

const IDLE_MS = 500;

// Pour assurer une bbox stable (ascent/descent) quelle que soit la valeur éditée.
const METRICS_SAMPLE = "Hg";
// Pour éviter certains comportements SVG “texte vide” (bbox 0 / substring errors).
const ZERO_WIDTH = "\u200b";
const NBSP = "\u00A0";

export default function InlineEditors(props: Props) {
    const {
        x,
        y,
        width,
        editingAttrIndex,
        editingMethodIndex,
        editingName,
        nameValue,
        onNameChange,
        nameFontSize,
        nameFontWeight,
        nameFontStyle,
        attrStartY,
        methodsStartY,
        editBuffer,
        setEditBuffer,
        commitLine,
        cancelLine,
        commitName,
        cancelName,
    } = props;

    const inputRef = useRef<HTMLInputElement | null>(null);

    // Mesure X (substring length)
    const measureXRef = useRef<SVGTextElement | null>(null);
    // Mesure Y (bbox stable)
    const metricsYRef = useRef<SVGTextElement | null>(null);

    const [caretIndex, setCaretIndex] = useState(0);
    const [caretX, setCaretX] = useState<number | null>(null);
    const [caretY1, setCaretY1] = useState<number | null>(null);
    const [caretY2, setCaretY2] = useState<number | null>(null);

    const [selStart, setSelStart] = useState(0);
    const [selEnd, setSelEnd] = useState(0);

    const [idle, setIdle] = useState(false);
    const idleTimerRef = useRef<number | null>(null);

    const mode = useMemo<"name" | "attr" | "method" | null>(() => {
        if (editingName) return "name";
        if (editingAttrIndex !== null) return "attr";
        if (editingMethodIndex !== null) return "method";
        return null;
    }, [editingName, editingAttrIndex, editingMethodIndex]);

    const activeValue = mode === "name" ? nameValue : editBuffer;

    // 🔑 MUST match ClassNode for name editing
    const fontSize = mode === "name" ? (nameFontSize ?? 14) : 12;
    const fontWeight = mode === "name" ? (nameFontWeight ?? 400) : 400;
    const fontStyle = mode === "name" ? (nameFontStyle ?? "normal") : "normal";

    const lineTop = useMemo(() => {
        if (mode === "name") return y;
        if (mode === "attr") return y + attrStartY + (editingAttrIndex as number) * NODE_LINE_HEIGHT;
        if (mode === "method") return y + methodsStartY + (editingMethodIndex as number) * NODE_LINE_HEIGHT;
        return null;
    }, [mode, y, attrStartY, methodsStartY, editingAttrIndex, editingMethodIndex]);

    const lineHeight = mode === "name" ? NODE_HEADER_HEIGHT : NODE_LINE_HEIGHT;

    const textX = x + TEXT_PADDING_X;
    const boxX = x + TEXT_PADDING_X - BORDER_EXTRA_X;
    const centerX = x + width / 2;
    const boxW = width - 2 * TEXT_PADDING_X + 2 * BORDER_EXTRA_X;
    const boxY = (lineTop ?? 0) + (lineHeight - BORDER_HEIGHT) / 2 + BORDER_Y_OFFSET;

    function clearIdleTimer() {
        if (idleTimerRef.current !== null) {
            window.clearTimeout(idleTimerRef.current);
            idleTimerRef.current = null;
        }
    }

    function bumpActivity() {
        setIdle(false);
        clearIdleTimer();
        idleTimerRef.current = window.setTimeout(() => setIdle(true), IDLE_MS) as unknown as number;
    }

    function syncFromInput() {
        const el = inputRef.current;
        if (!el) return;

        const a = el.selectionStart ?? 0;
        const b = el.selectionEnd ?? a;

        setSelStart(a);
        setSelEnd(b);
        setCaretIndex(b);
    }

    useLayoutEffect(() => {
        if (mode === null || lineTop === null) return;

        bumpActivity();

        requestAnimationFrame(() => {
            const el = inputRef.current;
            if (!el) return;

            el.focus();

            const end = el.value.length;
            try {
                el.setSelectionRange(end, end);
            } catch {
                // ignore
            }
            syncFromInput();
        });

        return () => clearIdleTimer();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, lineTop]);

    // calc caret X/Y automatiquement, cohérent vide/non vide
    useLayoutEffect(() => {
        if (mode === null || lineTop === null) return;

        // X
        const tx = measureXRef.current;
        if (tx) {
            let total = 0;
            try {
                total = tx.getComputedTextLength();
            } catch {
                total = 0;
            }

            const startX = mode === "name" ? centerX - total / 2 : textX;

            if (activeValue.length === 0) {
                setCaretX(mode === "name" ? centerX : textX);
            } else {
                let wCaret = 0;
                try {
                    wCaret = tx.getSubStringLength(0, Math.max(0, Math.min(caretIndex, activeValue.length)));
                } catch {
                    try {
                        wCaret = tx.getComputedTextLength();
                    } catch {
                        wCaret = 0;
                    }
                }
                setCaretX(startX + wCaret);
            }
        } else {
            setCaretX(null);
        }

        // Y (stable, indépendant du contenu)
        const ty = metricsYRef.current;
        if (ty) {
            try {
                const bb = ty.getBBox();
                setCaretY1(bb.y + 1);
                setCaretY2(bb.y + bb.height - 1);
            } catch {
                setCaretY1(null);
                setCaretY2(null);
            }
        } else {
            setCaretY1(null);
            setCaretY2(null);
        }
    }, [mode, lineTop, lineHeight, caretIndex, activeValue, textX, centerX]);

    function commit() {
        if (mode === "name") commitName();
        else commitLine();
    }
    function cancel() {
        if (mode === "name") cancelName();
        else cancelLine();
    }

    const inputStyle: React.CSSProperties = {
        width: "100%",
        height: "100%",
        border: "none",
        outline: "none",
        background: "transparent",
        padding: 0,
        margin: 0,

        color: "transparent",
        caretColor: "transparent",

        fontFamily: "Inter, system-ui, sans-serif",
        fontSize,
        fontWeight,
        fontStyle,
        lineHeight: `${lineHeight}px`,
        boxSizing: "border-box",

        textAlign: mode === "name" ? ("center" as const) : ("left" as const),
        paddingLeft: 0,
        paddingRight: 0,
    };

    function onInputChange(v: string) {
        bumpActivity();
        if (mode === "name") onNameChange(v);
        else setEditBuffer(v);
        requestAnimationFrame(syncFromInput);
    }

    function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        bumpActivity();

        if (e.key === "Enter") {
            e.preventDefault();
            commit();
            return;
        }
        if (e.key === "Escape") {
            e.preventDefault();
            cancel();
            return;
        }

        requestAnimationFrame(syncFromInput);
    }

    if (mode === null || lineTop === null) return null;

    const hasSelection = selEnd > selStart;

    const measureValue = activeValue.length === 0 ? ZERO_WIDTH : activeValue.replace(/ /g, NBSP);

    // sélection SVG (x start/end) via mesureXRef
    let selX1: number | null = null;
    let selX2: number | null = null;
    try {
        const t = measureXRef.current;
        if (t) {
            let total = 0;
            try {
                total = t.getComputedTextLength();
            } catch {
                total = 0;
            }

            const startX = mode === "name" ? centerX - total / 2 : textX;

            const a = Math.max(0, Math.min(selStart, measureValue.length));
            const b = Math.max(0, Math.min(selEnd, measureValue.length));
            const wa = a === 0 ? 0 : t.getSubStringLength(0, a);
            const wb = b === 0 ? 0 : t.getSubStringLength(0, b);
            selX1 = startX + wa;
            selX2 = startX + wb;
        }
    } catch {
        selX1 = null;
        selX2 = null;
    }

    return (
        <>
            <style>{`
@keyframes caretBlink {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
.inline-edit-input::selection { background: transparent; color: transparent; }
.inline-edit-input::-moz-selection { background: transparent; color: transparent; }
            `}</style>

            {/* Bordure */}
            <rect
                x={boxX}
                y={boxY}
                width={boxW}
                height={BORDER_HEIGHT}
                rx={6}
                fill="transparent"
                stroke={BORDER_COLOR}
                strokeWidth={1}
                pointerEvents="none"
            />

            {/* Texte invisible pour mesurer X */}
            <text
                ref={measureXRef}
                x={mode === "name" ? centerX : textX}
                y={lineTop + lineHeight / 2}
                dominantBaseline="middle"
                textAnchor={mode === "name" ? "middle" : undefined}
                fontSize={fontSize}
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight={fontWeight as any}
                fontStyle={fontStyle as any}
                fill="transparent"
                style={{ userSelect: "none" as const, pointerEvents: "none" }}
            >
                {measureValue}
            </text>

            {/* Texte invisible pour mesurer Y */}
            <text
                ref={metricsYRef}
                x={mode === "name" ? centerX : textX}
                y={lineTop + lineHeight / 2}
                dominantBaseline="middle"
                textAnchor={mode === "name" ? "middle" : undefined}
                fontSize={fontSize}
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight={fontWeight as any}
                fontStyle={fontStyle as any}
                fill="transparent"
                style={{ userSelect: "none" as const, pointerEvents: "none" }}
            >
                {METRICS_SAMPLE}
            </text>

            {/* Sélection SVG */}
            {hasSelection && selX1 !== null && selX2 !== null && caretY1 !== null && caretY2 !== null && (
                <rect
                    x={Math.min(selX1, selX2)}
                    y={caretY1}
                    width={Math.max(1, Math.abs(selX2 - selX1))}
                    height={Math.max(1, caretY2 - caretY1)}
                    fill="rgba(255,53,93,0.35)"
                    pointerEvents="none"
                    rx={2}
                />
            )}

            {/* Caret SVG */}
            {!hasSelection && caretX !== null && caretY1 !== null && caretY2 !== null && (
                <line
                    x1={caretX}
                    x2={caretX}
                    y1={caretY1}
                    y2={caretY2}
                    stroke={CARET_COLOR}
                    strokeWidth={1}
                    pointerEvents="none"
                    style={idle ? { animation: "caretBlink 1s steps(1) infinite" } : undefined}
                />
            )}

            {/* Input invisible */}
            <foreignObject x={boxX} y={lineTop} width={boxW} height={lineHeight}>
                <input
                    ref={inputRef}
                    className="inline-edit-input"
                    autoFocus
                    value={activeValue}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={onInputKeyDown}
                    onKeyUp={() => requestAnimationFrame(syncFromInput)}
                    onClick={() => requestAnimationFrame(syncFromInput)}
                    onSelect={() => requestAnimationFrame(syncFromInput)}
                    onMouseUp={() => requestAnimationFrame(syncFromInput)}
                    onBlur={commit}
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="off"
                    inputMode="text"
                    style={inputStyle}
                />
            </foreignObject>
        </>
    );
}
