type Props = {
    x: number;
    y: number;
    width: number;
    height: number;
    onMouseDown?: (e: React.MouseEvent) => void;
};

export default function ClassNode({
                                      x,
                                      y,
                                      width,
                                      height,
                                      onMouseDown,
                                  }: Props) {
    return (
        <g
            transform={`translate(${x}, ${y})`}
            onMouseDown={onMouseDown}
            style={{ cursor: "move" }}
        >
            <rect
                width={width}
                height={height}
                rx={6}
                fill="#1c2230"
                stroke="#3a4155"
            />

            {/* Nom de classe */}
            <text
                x={8}
                y={20}
                fontSize={14}
                fill="#e6e6e6"
            >
                ClassName
            </text>

            {/* Séparateur */}
            <line
                x1={0}
                y1={28}
                x2={width}
                y2={28}
                stroke="#3a4155"
            />
        </g>
    );
}
