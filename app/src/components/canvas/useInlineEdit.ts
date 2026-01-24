import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { UmlClass } from "../../model/uml";
import { normalizeAttributeLine, normalizeMethodLine } from "../../model/uml";

export function useInlineEdit(params: {
    selectedId: string | null;
    classes: UmlClass[];
    setClasses: Dispatch<SetStateAction<UmlClass[]>>;
}) {
    const { selectedId, classes, setClasses } = params;

    const [editingName, setEditingName] = useState(false);
    const [nameBuffer, setNameBuffer] = useState("");

    const [editingAttrIndex, setEditingAttrIndex] = useState<number | null>(null);
    const [editingMethodIndex, setEditingMethodIndex] = useState<number | null>(null);
    const [editBuffer, setEditBuffer] = useState("");

    const isEditingLine = editingAttrIndex !== null || editingMethodIndex !== null;

    function getSelectedClass(): UmlClass | null {
        if (!selectedId) return null;
        return classes.find((c) => c.id === selectedId) ?? null;
    }

    useEffect(() => {
        setEditingName(false);
        setNameBuffer("");
        setEditingAttrIndex(null);
        setEditingMethodIndex(null);
        setEditBuffer("");
    }, [selectedId]);

    function startEditName() {
        if (!selectedId) return;

        const c = getSelectedClass();
        if (!c) return;

        setEditingAttrIndex(null);
        setEditingMethodIndex(null);
        setEditingName(true);
        setNameBuffer(c.name);
    }

    function commitNameEdit() {
        if (!selectedId) return;
        if (!editingName) return;

        setClasses((cs) => cs.map((c) => (c.id === selectedId ? { ...c, name: nameBuffer } : c)));
        setEditingName(false);
    }

    function cancelNameEdit() {
        setEditingName(false);
        setNameBuffer("");
    }

    function startEditAttribute(index: number) {
        if (!selectedId) return;

        const c = getSelectedClass();
        if (!c) return;

        setEditingName(false);
        setEditingMethodIndex(null);
        setEditingAttrIndex(index);

        setEditBuffer(c.attributes[index] ?? "+ attr: Type");
    }

    function startEditMethod(index: number) {
        if (!selectedId) return;

        const c = getSelectedClass();
        if (!c) return;

        setEditingName(false);
        setEditingAttrIndex(null);
        setEditingMethodIndex(index);

        setEditBuffer(c.methods[index] ?? "+ method(): Return");
    }

    function commitLineEdit() {
        if (!selectedId) return;
        if (!isEditingLine) return;

        // Normalisation stricte : même si l’utilisateur tape “n’importe quoi”,
        // on resérialise en notation cohérente.
        const normalizedAttr = editingAttrIndex !== null ? normalizeAttributeLine(editBuffer) : null;
        const normalizedMethod = editingMethodIndex !== null ? normalizeMethodLine(editBuffer) : null;

        if (editingAttrIndex !== null) {
            const idx = editingAttrIndex;
            setClasses((cs) =>
                cs.map((c) =>
                    c.id === selectedId
                        ? { ...c, attributes: c.attributes.map((a, i) => (i === idx ? (normalizedAttr ?? a) : a)) }
                        : c
                )
            );
        }

        if (editingMethodIndex !== null) {
            const idx = editingMethodIndex;
            setClasses((cs) =>
                cs.map((c) =>
                    c.id === selectedId
                        ? { ...c, methods: c.methods.map((m, i) => (i === idx ? (normalizedMethod ?? m) : m)) }
                        : c
                )
            );
        }

        setEditingAttrIndex(null);
        setEditingMethodIndex(null);
    }

    function cancelLineEdit() {
        setEditingAttrIndex(null);
        setEditingMethodIndex(null);
    }

    return {
        editingName,
        setEditingName,
        startEditName,
        nameBuffer,
        setNameBuffer,
        commitNameEdit,
        cancelNameEdit,

        editingAttrIndex,
        editingMethodIndex,
        editBuffer,
        setEditBuffer,
        isEditingLine,

        startEditAttribute,
        startEditMethod,
        commitLineEdit,
        cancelLineEdit,
    };
}
