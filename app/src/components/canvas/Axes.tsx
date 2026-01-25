export default function Axes() {
    return (
        <g data-export="ignore">
            <line x1={-5000} y1={0} x2={5000} y2={0} stroke="#ff355d" strokeWidth={1} />
            <line x1={0} y1={-5000} x2={0} y2={5000} stroke="#ff355d" strokeWidth={1} />
            <circle cx={0} cy={0} r={4} fill="#ff355d" />
        </g>
    );
}
