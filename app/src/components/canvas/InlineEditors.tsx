import { NODE_LINE_HEIGHT } from "../nodes/layout";

type Props = {
    x: number;
    y: number;
    width: number;

    editingAttrIndex: number | null;
    editingMethodIndex: number | null;

    attrStartY: number;
    methodsStartY: number;

    editBuffer: string;
    setEditBuffer: (v: string) => void;

    commit: () => void;
    cancel: () => void;
};

export default function InlineEditors({
                                          x,
                                          y,
                                          width,
                                          editingAttrIndex,
                                          editingMethodIndex,
                                          attrStartY,
                                          methodsStartY,
                                          editBuffer,
                                          setEditBuffer,
                                          commit,
                                          cancel,
                                      }: Props) {
    const inputStyle: React.CSSProperties = {
        width: "100%",
        height: "100%",
        background: "#141824",
        color: "#e6e6e6",
        border: "1px solid #6aa9ff",
        borderRadius: 4,
        fontSize: 12,
        padding: "0 4px",
        boxSizing: "border-box",
        outline: "none",
        fontFamily: "Inter, system-ui, sans-serif",
    };

    const commonInputProps = {
        autoFocus: true,
        value: editBuffer,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEditBuffer(e.target.value),
        onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
        },
        onBlur: commit,
        spellCheck: false,
        autoCorrect: "off" as const,
        autoCapitalize: "off" as const,
        inputMode: "text" as const,
        style: inputStyle,
    };

    return (
        <>
            {editingAttrIndex !== null && (
                <foreignObject
                    x={x + 4}
                    y={y + attrStartY + editingAttrIndex * NODE_LINE_HEIGHT}
                    width={width - 8}
                    height={NODE_LINE_HEIGHT}
                >
                    <input {...commonInputProps} />
                </foreignObject>
            )}

            {editingMethodIndex !== null && (
                <foreignObject
                    x={x + 4}
                    y={y + methodsStartY + editingMethodIndex * NODE_LINE_HEIGHT}
                    width={width - 8}
                    height={NODE_LINE_HEIGHT}
                >
                    <input {...commonInputProps} />
                </foreignObject>
            )}
        </>
    );
}
