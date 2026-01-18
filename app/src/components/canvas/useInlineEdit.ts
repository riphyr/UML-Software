import { useEffect, useState } from "react";
import type { UmlClass } from "../../model/uml";

export function useInlineEdit(params: {
    selectedId: string | null;
    classes: UmlClass[];
    setClasses: React.Dispatch<React.SetStateAction<UmlClass[]>>;
}) {
    const { selectedId, classes, setClasses } = params;

    const [editingName, setEditingName] = useState(false);

    const [editingAttrIndex, setEditingAttrIndex] = useState<number | null>(null);
    const [editingMethodIndex, setEditingMethodIndex] = useState<number | null>(null);
    const [editBuffer, setEditBuffer] = useState("");

    const isEditingLine = editingAttrIndex !== null || editingMethodIndex !== null;

    function getSelectedClass(): UmlClass | null {
        if (!selectedId) return null;
        return classes.find(c => c.id === selectedId) ?? null;
    }

    // Si on change de sélection, on coupe toute édition en cours (évite les edits sur la mauvaise classe)
    useEffect(() => {
        setEditingName(false);
        setEditingAttrIndex(null);
        setEditingMethodIndex(null);
        setEditBuffer("");
    }, [selectedId]);

    function startEditName() {
        if (!selectedId) return;
        setEditingAttrIndex(null);
        setEditingMethodIndex(null);
        setEditingName(true);
    }

    function stopEditName() {
        setEditingName(false);
    }

    function onNameChange(value: string) {
        if (!selectedId) return;
        setClasses(cs => cs.map(c => (c.id === selectedId ? { ...c, name: value } : c)));
    }

    function startEditAttribute(index: number) {
        if (!selectedId) return;

        const c = getSelectedClass();
        if (!c) return;

        setEditingName(false);
        setEditingMethodIndex(null);
        setEditingAttrIndex(index);
        setEditBuffer(c.attributes[index] ?? "");
    }

    function startEditMethod(index: number) {
        if (!selectedId) return;

        const c = getSelectedClass();
        if (!c) return;

        setEditingName(false);
        setEditingAttrIndex(null);
        setEditingMethodIndex(index);
        setEditBuffer(c.methods[index] ?? "");
    }

    function commitLineEdit() {
        if (!selectedId) return;
        if (!isEditingLine) return;

        if (editingAttrIndex !== null) {
            const idx = editingAttrIndex;
            setClasses(cs =>
                cs.map(c =>
                    c.id === selectedId
                        ? { ...c, attributes: c.attributes.map((a, i) => (i === idx ? editBuffer : a)) }
                        : c
                )
            );
        }

        if (editingMethodIndex !== null) {
            const idx = editingMethodIndex;
            setClasses(cs =>
                cs.map(c =>
                    c.id === selectedId
                        ? { ...c, methods: c.methods.map((m, i) => (i === idx ? editBuffer : m)) }
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
        stopEditName,
        onNameChange,

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
