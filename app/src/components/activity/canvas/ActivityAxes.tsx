export default function ActivityAxes(p: { scale: number }) {
    return (
        <g>
            <line x1={0} y1={0} x2={2000} y2={0} stroke="rgba(255,255,255,0.08)" strokeWidth={2 / p.scale} />
            <line x1={0} y1={0} x2={0} y2={2000} stroke="rgba(255,255,255,0.08)" strokeWidth={2 / p.scale} />
        </g>
    );
}
