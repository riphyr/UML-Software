import React, { useEffect, useRef } from "react";
import {
    NODE_ATTR_START_Y,
    NODE_HEADER_HEIGHT,
    NODE_LINE_HEIGHT,
    getAttrsCount,
    getMethodsSeparatorY,
    getMethodsStartY,
} from "./layout";

type Handle = "nw" | "ne" | "sw" | "se";
export type PortSide = "N" | "E" | "S" | "W";

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

    onMouseDown?: (e: React.MouseEvent) => void;
    onSelect?: (e: React.MouseEvent) => void;
    onHoverStart?: () => void;
    onHoverEnd?: () => void;
    onDoubleClickName?: () => void;
    onResizeStart?: (handle: Handle, e: React.MouseEvent) => void;

    onDoubleClickAttribute?: (index: number) => void;
    onDoubleClickMethod?: (index: number) => void;

    onContextMenu?: (e: React.MouseEvent) => void;

    // Ports
    mouseWorld?: { x: number; y: number } | null;
    showPorts?: boolean;
    onPortHover?: (side: PortSide | null) => void;
    onPortMouseDown?: (side: PortSide, e: React.MouseEvent) => void;
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
                                      onHoverStart,
                                      onHoverEnd,
                                      onDoubleClickName,
                                      onResizeStart,
                                      onDoubleClickAttribute,
                                      onDoubleClickMethod,
                                      onContextMenu,
                                      mouseWorld,
                                      showPorts,
                                      onPortHover,
                                      onPortMouseDown,
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

    // Ports : positions en monde (décalées hors de la box)
    const PORT_OUT = 14;
    const ports: { side: PortSide; wx: number; wy: number; lx: number; ly: number }[] = [
        { side: "N", wx: x + width / 2, wy: y - PORT_OUT, lx: width / 2, ly: -PORT_OUT },
        { side: "E", wx: x + width + PORT_OUT, wy: y + height / 2, lx: width + PORT_OUT, ly: height / 2 },
        { side: "S", wx: x + width / 2, wy: y + height + PORT_OUT, lx: width / 2, ly: height + PORT_OUT },
        { side: "W", wx: x - PORT_OUT, wy: y + height / 2, lx: -PORT_OUT, ly: height / 2 },
    ];

    let hoverSide: PortSide | null = null;
    let bestSide: PortSide | null = null;
    let nearAny = false;

    if (showPorts && mouseWorld && !editing) {
        let bestD = Infinity;
        let best: PortSide | null = null;

        for (const p of ports) {
            const dx = mouseWorld.x - p.wx;
            const dy = mouseWorld.y - p.wy;
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < bestD) {
                bestD = d;
                best = p.side;
            }
        }

        const NEAR_R = 30;
        const HOVER_R = 14;

        if (bestD <= NEAR_R) {
            nearAny = true;
            bestSide = best;
            hoverSide = best && bestD <= HOVER_R ? best : null;
        }
    }

    // Côté logique : dès qu'on est "proche" d'un port, on annonce le bestSide.
    // Le visuel "hot" reste piloté par hoverSide (rayon plus petit).
    const logicalSide: PortSide | null = showPorts && !editing && nearAny ? (bestSide ?? null) : null;

    const lastHoverRef = useRef<PortSide | null>(null);
    useEffect(() => {
        if (!showPorts || !onPortHover) return;
        if (lastHoverRef.current === logicalSide) return;
        lastHoverRef.current = logicalSide;
        onPortHover(logicalSide);
    }, [showPorts, onPortHover, logicalSide]);

    return (
        <g
            transform={`translate(${x}, ${y})`}
            onMouseEnter={() => onHoverStart?.()}
            onMouseLeave={() => onHoverEnd?.()}
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

            <g clipPath={`url(#${clipId})`}>
                <line x1={0} y1={NODE_HEADER_HEIGHT} x2={width} y2={NODE_HEADER_HEIGHT} stroke="#3a4155" />
                <line x1={0} y1={methodsSeparatorY} x2={width} y2={methodsSeparatorY} stroke="#3a4155" />

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

            {/* Ports (affichage contextuel) */}
            {showPorts && !editing && nearAny && (hoverSide || bestSide) && (() => {
                const side = hoverSide ?? bestSide;
                if (!side) return null;
                const p = ports.find(pp => pp.side === side);
                if (!p) return null;

                const isHot = hoverSide === side;
                const opacity = isHot ? 0.92 : 0.32;
                const scale = isHot ? 1.12 : 1.0;
                const r = 7;

                return (
                    <g
                        transform={`translate(${p.lx}, ${p.ly}) scale(${scale})`}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            onPortMouseDown?.(side, e);
                        }}
                        style={{ cursor: "crosshair" }}
                    >
                        <circle
                            cx={0}
                            cy={0}
                            r={r}
                            fill="#cfd6e61a"
                            stroke={isHot ? "#6aa9ff" : "#cfd6e6"}
                            strokeWidth={1.5}
                            opacity={opacity}
                        />
                        <line x1={-3.5} y1={0} x2={3.5} y2={0} stroke="#cfd6e6" strokeWidth={1.5} opacity={opacity} />
                        <line x1={0} y1={-3.5} x2={0} y2={3.5} stroke="#cfd6e6" strokeWidth={1.5} opacity={opacity} />
                    </g>
                );
            })()}

            <rect
                width={width}
                height={height}
                rx={6}
                fill="none"
                stroke={selected ? "#6aa9ff" : "#3a4155"}
                strokeWidth={selected ? 2 : 1}
                pointerEvents="none"
            />

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
