import React from "react";
import {
    NODE_ATTR_START_Y,
    NODE_HEADER_HEIGHT,
    NODE_LINE_HEIGHT,
    getAttrsCount,
    getMethodsSeparatorY,
    getMethodsStartY,
} from "./layout";

type Handle = "nw" | "ne" | "sw" | "se";

type Props = {
    x: number;
    y: number;
    width: number;
    height: number;

    name: string;
    attributes: string[];
    methods: string[];

    selected: boolean;
    editing: boolean;

    onMouseDown?: (e: React.MouseEvent) => void;     // drag (fond)
    onSelect?: (e: React.MouseEvent) => void;        // select-only (zones texte)
    onDoubleClickName?: () => void;
    onNameChange?: (value: string) => void;          // (plus utilisé ici, gardé si tu veux)
    onResizeStart?: (handle: Handle, e: React.MouseEvent) => void;

    onDoubleClickAttribute?: (index: number) => void;
    onDoubleClickMethod?: (index: number) => void;

    onContextMenu?: (e: React.MouseEvent) => void;
};

const HANDLE_SIZE = 8;
const PADDING_X = 8;

export default function ClassNode({
                                      x,
                                      y,
                                      width,
                                      height,
                                      name,
                                      attributes,
                                      methods,
                                      selected,
                                      editing,
                                      onMouseDown,
                                      onSelect,
                                      onDoubleClickName,
                                      onResizeStart,
                                      onDoubleClickAttribute,
                                      onDoubleClickMethod,
                                      onContextMenu,
                                  }: Props) {
    const handles: { h: Handle; x: number; y: number }[] = [
        { h: "nw", x: 0, y: 0 },
        { h: "ne", x: width, y: 0 },
        { h: "sw", x: 0, y: height },
        { h: "se", x: width, y: height },
    ];

    const clipId = `clip-${x}-${y}`;

    const attrs = attributes.length ? attributes : ["+ attribute: Type"];
    const mets = methods.length ? methods : ["+ method(): Return"];

    const attrsCount = getAttrsCount(attributes.length);
    const methodsSeparatorY = getMethodsSeparatorY(attrsCount);
    const methodsStartY = getMethodsStartY(attrsCount);

    return (
        <g
            transform={`translate(${x}, ${y})`}
            onContextMenu={e => {
                e.preventDefault();
                e.stopPropagation();
                onContextMenu?.(e);
            }}
        >
            <defs>
                <clipPath id={clipId}>
                    <rect width={width} height={height} rx={6} />
                </clipPath>
            </defs>

            {/* Fond (drag) */}
            <rect
                width={width}
                height={height}
                rx={6}
                fill="#1c2230"
                onMouseDown={e => {
                    if (editing) return;
                    onMouseDown?.(e);
                }}
                style={{ cursor: editing ? "default" : "move" }}
            />

            {/* Header hitbox (select + doubleclick edit) */}
            <rect
                x={0}
                y={0}
                width={width}
                height={NODE_HEADER_HEIGHT}
                fill="transparent"
                onMouseDown={e => {
                    e.stopPropagation();
                    onSelect?.(e);
                }}
                onDoubleClick={e => {
                    e.stopPropagation();
                    onDoubleClickName?.();
                }}
                style={{ cursor: "text", userSelect: "none" as const }}
            />

            {/* Contenu clippé */}
            <g clipPath={`url(#${clipId})`}>
                <line x1={0} y1={NODE_HEADER_HEIGHT} x2={width} y2={NODE_HEADER_HEIGHT} stroke="#3a4155" />
                <line x1={0} y1={methodsSeparatorY} x2={width} y2={methodsSeparatorY} stroke="#3a4155" />

                {/* Nom (TOUJOURS en SVG, jamais d'input ici) */}
                <text
                    x={PADDING_X}
                    y={NODE_HEADER_HEIGHT / 2}
                    dominantBaseline="middle"
                    fontSize={14}
                    fill="#e6e6e6"
                    fontFamily="Inter, system-ui, sans-serif"
                    style={{ pointerEvents: "none", userSelect: "none" as const }}
                >
                    {name}
                </text>

                {/* Attributs (hitbox par ligne) */}
                {attrs.map((a, i) => {
                    const yMid = NODE_ATTR_START_Y + i * NODE_LINE_HEIGHT + NODE_LINE_HEIGHT / 2;

                    return (
                        <g key={`a-${i}`}>
                            <rect
                                x={0}
                                y={yMid - NODE_LINE_HEIGHT / 2}
                                width={width}
                                height={NODE_LINE_HEIGHT}
                                fill="transparent"
                                onMouseDown={e => {
                                    e.stopPropagation();
                                    onSelect?.(e);
                                }}
                                onDoubleClick={e => {
                                    e.stopPropagation();
                                    onDoubleClickAttribute?.(i);
                                }}
                                style={{ cursor: "text" }}
                            />
                            <text
                                x={PADDING_X}
                                y={yMid}
                                dominantBaseline="middle"
                                fontSize={12}
                                fill="#cfd6e6"
                                fontFamily="Inter, system-ui, sans-serif"
                                style={{ pointerEvents: "none", userSelect: "none" as const }}
                            >
                                {a}
                            </text>
                        </g>
                    );
                })}

                {/* Méthodes (hitbox par ligne) */}
                {mets.map((m, i) => {
                    const yMid = methodsStartY + i * NODE_LINE_HEIGHT + NODE_LINE_HEIGHT / 2;

                    return (
                        <g key={`m-${i}`}>
                            <rect
                                x={0}
                                y={yMid - NODE_LINE_HEIGHT / 2}
                                width={width}
                                height={NODE_LINE_HEIGHT}
                                fill="transparent"
                                onMouseDown={e => {
                                    e.stopPropagation();
                                    onSelect?.(e);
                                }}
                                onDoubleClick={e => {
                                    e.stopPropagation();
                                    onDoubleClickMethod?.(i);
                                }}
                                style={{ cursor: "text" }}
                            />
                            <text
                                x={PADDING_X}
                                y={yMid}
                                dominantBaseline="middle"
                                fontSize={12}
                                fill="#cfd6e6"
                                fontFamily="Inter, system-ui, sans-serif"
                                style={{ pointerEvents: "none", userSelect: "none" as const }}
                            >
                                {m}
                            </text>
                        </g>
                    );
                })}
            </g>

            {/* Outline au-dessus */}
            <rect
                width={width}
                height={height}
                rx={6}
                fill="none"
                stroke={selected ? "#6aa9ff" : "#3a4155"}
                strokeWidth={selected ? 2 : 1}
                pointerEvents="none"
            />

            {/* Handles */}
            {selected &&
                !editing &&
                handles.map(h => (
                    <rect
                        key={h.h}
                        x={h.x - HANDLE_SIZE / 2}
                        y={h.y - HANDLE_SIZE / 2}
                        width={HANDLE_SIZE}
                        height={HANDLE_SIZE}
                        fill="#6aa9ff"
                        onMouseDown={e => {
                            e.stopPropagation();
                            onResizeStart?.(h.h, e);
                        }}
                        style={{ cursor: `${h.h}-resize` }}
                    />
                ))}
        </g>
    );
}
