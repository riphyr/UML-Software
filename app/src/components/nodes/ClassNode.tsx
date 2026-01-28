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

    // Optional (pour header centré stéréotype/interface/abstract)
    stereotype?: string;
    kind?: "class" | "abstract" | "interface";

    attributes: string[];
    methods: string[];

    selected: boolean;
    editing: boolean;

    // Auto-size
    sizeMode: "auto" | "locked";
    disableLockToggle?: boolean;
    onToggleSizeMode?: () => void;

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
                                      stereotype,
                                      kind = "class",
                                      attributes,
                                      methods,
                                      selected,
                                      editing,
                                      sizeMode,
                                      disableLockToggle,
                                      onToggleSizeMode,
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

    const attrs = attributes;
    const mets = methods;

    const attrsCount = getAttrsCount(attributes.length);
    const methodsSeparatorY = getMethodsSeparatorY(attrsCount);
    const methodsStartY = getMethodsStartY(attrsCount);

    // Ports (anchors) : positions en monde (décalées hors de la box)
    const PORT_OUT = 14;
    const ports: { side: PortSide; wx: number; wy: number; lx: number; ly: number }[] = [
        { side: "N", wx: x + width / 2, wy: y - PORT_OUT, lx: width / 2, ly: -PORT_OUT },
        { side: "E", wx: x + width + PORT_OUT, wy: y + height / 2, lx: width + PORT_OUT, ly: height / 2 },
        { side: "S", wx: x + width / 2, wy: y + height + PORT_OUT, lx: width / 2, ly: height + PORT_OUT },
        { side: "W", wx: x - PORT_OUT, wy: y + height / 2, lx: -PORT_OUT, ly: height / 2 },
    ];

    // Règle: un seul côté visible -> le plus proche; "hot" uniquement si proche du point exact.
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

        const NEAR_R = 30; // apparaît
        const HOVER_R = 14; // interactif / “hot”

        if (bestD <= NEAR_R) {
            nearAny = true;
            bestSide = best;
            hoverSide = best && bestD <= HOVER_R ? best : null;
        }
    }

    // pour l’API externe (hover highlight / cursor)
    const logicalSide: PortSide | null = showPorts && !editing && nearAny ? (bestSide ?? null) : null;

    // Lock toggle (NE) : visible uniquement quand la souris est proche
    const LOCK_OUT = 14;
    const lockPoint = { wx: x + width + LOCK_OUT, wy: y - LOCK_OUT, lx: width + LOCK_OUT, ly: -LOCK_OUT };
    const lockNearR = 30;
    const lockHotR = 14;
    const lockDisabled = !!disableLockToggle || editing;
    const lockDist = mouseWorld ? Math.hypot(mouseWorld.x - lockPoint.wx, mouseWorld.y - lockPoint.wy) : Infinity;
    const lockNear = !lockDisabled && lockDist <= lockNearR;
    const lockHot = !lockDisabled && lockDist <= lockHotR;

    const lastHoverRef = useRef<PortSide | null>(null);
    useEffect(() => {
        if (!showPorts || !onPortHover) return;
        if (lastHoverRef.current === logicalSide) return;
        lastHoverRef.current = logicalSide;
        onPortHover(logicalSide);
    }, [showPorts, onPortHover, logicalSide]);

    // Header centré : stéréotype + nom centrés ; attrs/methods à gauche.
    const rawStereo = (stereotype ?? "").trim();
    const stereoLine =
        rawStereo.length > 0 ? `<<${rawStereo}>>` : kind === "interface" ? "<<interface>>" : "";
    const hasStereo = stereoLine.length > 0;

    const centerX = width / 2;
    const stereoY = 12;
    const nameY = hasStereo ? 28 : NODE_HEADER_HEIGHT / 2;

    return (
        <g
            transform={`translate(${x}, ${y})`}
            onMouseEnter={() => onHoverStart?.()}
            onMouseLeave={() => onHoverEnd?.()}
            onContextMenu={(e) => {
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

            {/* Body */}
            <rect
                width={width}
                height={height}
                rx={6}
                fill="#17121a"
                onMouseDown={(e) => {
                    if (editing) return;
                    onMouseDown?.(e);
                }}
                style={{ cursor: editing ? "default" : "move" }}
            />

            {/* Header hit area */}
            <rect
                x={0}
                y={0}
                width={width}
                height={NODE_HEADER_HEIGHT}
                fill="transparent"
                onMouseDown={(e) => {
                    e.stopPropagation();
                    onSelect?.(e);
                }}
                onDoubleClick={(e) => {
                    e.stopPropagation();
                    onDoubleClickName?.();
                }}
                style={{ cursor: "text", userSelect: "none" as const }}
            />

            <g clipPath={`url(#${clipId})`}>
                <line x1={0} y1={NODE_HEADER_HEIGHT} x2={width} y2={NODE_HEADER_HEIGHT} stroke="#3a2b34" />
                <line x1={0} y1={methodsSeparatorY} x2={width} y2={methodsSeparatorY} stroke="#3a2b34" />

                {hasStereo && (
                    <text
                        x={centerX}
                        y={stereoY}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={12}
                        fill="#f2f0f7"
                        fontFamily="Inter, system-ui, sans-serif"
                        style={{ pointerEvents: "none", userSelect: "none" as const }}
                    >
                        {stereoLine}
                    </text>
                )}

                <text
                    x={centerX}
                    y={nameY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={17}
                    fill="#f2f0f7"
                    fontFamily="Inter, system-ui, sans-serif"
                    style={{
                        pointerEvents: "none",
                        userSelect: "none" as const,
                        fontStyle: kind === "abstract" ? ("italic" as const) : ("normal" as const),
                        fontWeight: kind === "interface" ? (400 as any) : (500 as any),
                    }}
                >
                    {name}
                </text>

                {/* Attributes left-aligned */}
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
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    onSelect?.(e);
                                }}
                                onDoubleClick={(e) => {
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
                                fill="#c9c4d6"
                                fontFamily="Inter, system-ui, sans-serif"
                                style={{ pointerEvents: "none", userSelect: "none" as const }}
                            >
                                {a}
                            </text>
                        </g>
                    );
                })}

                {/* Methods left-aligned */}
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
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    onSelect?.(e);
                                }}
                                onDoubleClick={(e) => {
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
                                fill="#c9c4d6"
                                fontFamily="Inter, system-ui, sans-serif"
                                style={{ pointerEvents: "none", userSelect: "none" as const }}
                            >
                                {m}
                            </text>
                        </g>
                    );
                })}
            </g>

            {/* Anchors: UN SEUL + affiché (côté le plus proche), jamais les 4 */}
            {showPorts &&
                !editing &&
                nearAny &&
                (hoverSide || bestSide) &&
                (() => {
                    const side = hoverSide ?? bestSide;
                    if (!side) return null;
                    const p = ports.find((pp) => pp.side === side);
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
                                fill="#3a2b3430"
                                stroke={isHot ? "#ff355d" : "#c9c4d6"}
                                strokeWidth={1.5}
                                opacity={opacity}
                            />
                            <line x1={-3.5} y1={0} x2={3.5} y2={0} stroke="#c9c4d6" strokeWidth={1.5} opacity={opacity} />
                            <line x1={0} y1={-3.5} x2={0} y2={3.5} stroke="#c9c4d6" strokeWidth={1.5} opacity={opacity} />
                        </g>
                    );
                })()}

            {/* Lock: même style (cercle + cadenas) */}
            {lockNear &&
                (() => {
                    const isLocked = sizeMode === "locked";
                    const opacity = lockHot ? 0.92 : 0.32;
                    const scale = lockHot ? 1.12 : 1.0;
                    const r = 7;

                    return (
                        <g
                            transform={`translate(${lockPoint.lx}, ${lockPoint.ly}) scale(${scale})`}
                            onMouseDown={(e) => {
                                if (!lockHot) return;
                                if (!onToggleSizeMode) return;
                                e.stopPropagation();
                                onToggleSizeMode();
                            }}
                            style={{ cursor: lockHot ? "pointer" : "default" }}
                        >
                            <circle
                                cx={0}
                                cy={0}
                                r={r}
                                fill="#c9c4d6"
                                stroke={isLocked ? "#ff355d" : "#c9c4d6"}
                                strokeWidth={1.5}
                                opacity={opacity}
                            />

                            {isLocked ? (
                                <>
                                    <rect x={-3.2} y={-0.5} width={6.4} height={5.2} rx={1.2} fill="#ff355d" opacity={opacity} />
                                    <path
                                        d="M -2.2 -0.5 v -1.0 c 0 -1.6 1.0 -2.6 2.2 -2.6 s 2.2 1.0 2.2 2.6 v 1.0"
                                        fill="none"
                                        stroke="#ff355d"
                                        strokeWidth={1.2}
                                        opacity={opacity}
                                    />
                                </>
                            ) : (
                                <>
                                    <rect x={-3.2} y={-0.5} width={6.4} height={5.2} rx={1.2} fill="#c9c4d6" opacity={opacity} />
                                    <path
                                        d="M -2.2 -0.5 v -1.0 c 0 -1.6 1.0 -2.6 2.2 -2.6 c 0.7 0 1.3 0.3 1.7 0.8"
                                        fill="none"
                                        stroke="#c9c4d6"
                                        strokeWidth={1.2}
                                        opacity={opacity}
                                    />
                                </>
                            )}
                        </g>
                    );
                })()}

            {/* Border: toujours présent */}
            <rect
                width={width}
                height={height}
                rx={6}
                fill="none"
                stroke={selected ? "#ff355d" : "#3a2b34"}
                strokeWidth={selected ? 2 : 1}
                pointerEvents="none"
            />

            {/* Handles: uniquement quand sélectionné + pas en édition */}
            {selected &&
                !editing &&
                handles.map((h) => (
                    <rect
                        key={h.h}
                        x={h.x - HANDLE_SIZE / 2}
                        y={h.y - HANDLE_SIZE / 2}
                        width={HANDLE_SIZE}
                        height={HANDLE_SIZE}
                        fill="#ff355d"
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            onResizeStart?.(h.h, e);
                        }}
                        style={{ cursor: `${h.h}-resize` }}
                    />
                ))}
        </g>
    );
}
