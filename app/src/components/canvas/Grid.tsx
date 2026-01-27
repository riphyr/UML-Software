type Props = {
    width: number;   // conservé pour compat, non utilisé
    height: number;  // conservé pour compat, non utilisé
    scale: number;
    enabled?: boolean;
    base?: number;
    extent?: number; // NEW
};

export default function Grid({ scale, enabled = true, base = 50, extent = 200000 }: Props) {
    if (!enabled) return null;

    const BASE = base;
    const step = BASE * Math.pow(2, Math.floor(Math.log2(1 / scale)));

    // stroke constant on screen
    const sw = 1 / scale;

    const patternId = `uml-grid-${BASE}-${Math.round(step)}`;

    const opacity = scale < 0.6 ? 0.15 : 0.3;

    return (
        <g data-export="ignore" pointerEvents="none" opacity={opacity}>
            <defs>
                <pattern id={patternId} width={step} height={step} patternUnits="userSpaceOnUse">
                    <path
                        d={`M ${step} 0 L 0 0 0 ${step}`}
                        fill="none"
                        stroke="#2b1f27"
                        strokeWidth={sw}
                    />
                </pattern>
            </defs>

            <rect x={-extent} y={-extent} width={extent * 2} height={extent * 2} fill={`url(#${patternId})`} />
        </g>
    );
}
