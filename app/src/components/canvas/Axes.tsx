export default function Axes() {
    return (
        <g>
            {/* Axe X */}
            <line x1={-5000} y1={0} x2={5000} y2={0} stroke="#6aa9ff" strokeWidth={1} />
            {/* Axe Y */}
            <line x1={0} y1={-5000} x2={0} y2={5000} stroke="#6aa9ff" strokeWidth={1} />

            {/* Origine */}
            <circle cx={0} cy={0} r={4} fill="#6aa9ff" />
        </g>
    );
}
