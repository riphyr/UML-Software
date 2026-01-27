export default function Axes(p: { scale?: number; extent?: number } = {}) {
    const extent = p.extent ?? 200000;
    const scale = p.scale ?? 1;
    const sw = 1 / scale;

    return (
        <g data-export="ignore" pointerEvents="none">
            <line x1={-extent} y1={0} x2={extent} y2={0} stroke="rgba(255,255,255,0.08)" strokeWidth={sw} />
            <line x1={0} y1={-extent} x2={0} y2={extent} stroke="rgba(255,255,255,0.08)" strokeWidth={sw} />
        </g>
    );
}
