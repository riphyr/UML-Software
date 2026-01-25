type Props = {
    width: number;
    height: number;
    scale: number;
    enabled?: boolean;
    base?: number;
};

export default function Grid({ width, height, scale, enabled = true, base = 50 }: Props) {
    if (!enabled) return null;

    const BASE = base;
    const step = BASE * Math.pow(2, Math.floor(Math.log2(1 / scale)));

    const linesX = Math.ceil(width / step);
    const linesY = Math.ceil(height / step);

    const opacity = scale < 0.6 ? 0.15 : 0.3;

    const lines = [];

    for (let i = -linesX; i <= linesX; i++) {
        lines.push(
            <line
                key={`x-${i}`}
                x1={i * step}
                y1={-linesY * step}
                x2={i * step}
                y2={linesY * step}
                stroke="#2b1f27"
                strokeWidth={1}
                opacity={opacity}
            />
        );
    }

    for (let j = -linesY; j <= linesY; j++) {
        lines.push(
            <line
                key={`y-${j}`}
                x1={-linesX * step}
                y1={j * step}
                x2={linesX * step}
                y2={j * step}
                stroke="#2b1f27"
                strokeWidth={1}
                opacity={opacity}
            />
        );
    }

    return <g data-export="ignore">{lines}</g>;
}
