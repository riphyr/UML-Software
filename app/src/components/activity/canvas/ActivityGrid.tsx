export default function ActivityGrid(p: {
    scale: number;
    enabled: boolean;
    base: number;
    extent?: number; // half-size in world units
}) {
    if (!p.enabled) return null;

    const step = Math.max(4, Math.round(p.base));
    const extent = p.extent ?? 200000; // very large world area

    // Per-step id avoids pattern collisions if we change the grid size.
    const patternId = `activity-grid-${step}`;
    const sw = 1 / p.scale;

    return (
        <g pointerEvents="none">
            <defs>
                <pattern id={patternId} width={step} height={step} patternUnits="userSpaceOnUse">
                    <path
                        d={`M ${step} 0 L 0 0 0 ${step}`}
                        fill="none"
                        stroke="rgba(255,255,255,0.04)"
                        strokeWidth={sw}
                    />
                </pattern>
            </defs>

            <rect
                x={-extent}
                y={-extent}
                width={extent * 2}
                height={extent * 2}
                fill={`url(#${patternId})`}
            />
        </g>
    );
}
