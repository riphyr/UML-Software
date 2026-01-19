import { useCallback, useRef } from "react";
import type { DiagramSnapshot, DiagramSnapshotV2 } from "../../model/diagram";
import { normalizeSnapshot } from "../../model/diagram";

type Params = {
    getSnapshot: () => DiagramSnapshot;
    applySnapshot: (s: DiagramSnapshotV2) => void;
    onAfterApply?: () => void;
    limit?: number;
};

export function useUndoRedo(p: Params) {
    const { getSnapshot, applySnapshot, onAfterApply, limit = 200 } = p;

    const pastRef = useRef<DiagramSnapshotV2[]>([]);
    const futureRef = useRef<DiagramSnapshotV2[]>([]);

    const canUndo = () => pastRef.current.length > 0;
    const canRedo = () => futureRef.current.length > 0;

    const pushSnapshot = useCallback(
        (snapshot?: DiagramSnapshot) => {
            const snap = normalizeSnapshot(snapshot ?? getSnapshot());
            pastRef.current.push(snap);
            if (pastRef.current.length > limit) pastRef.current.splice(0, pastRef.current.length - limit);
            futureRef.current = [];
        },
        [getSnapshot, limit]
    );

    const undo = useCallback(() => {
        if (!canUndo()) return;

        const current = normalizeSnapshot(getSnapshot());
        const prev = pastRef.current.pop()!;
        futureRef.current.push(current);

        applySnapshot(prev);
        onAfterApply?.();
    }, [applySnapshot, getSnapshot, onAfterApply]);

    const redo = useCallback(() => {
        if (!canRedo()) return;

        const current = normalizeSnapshot(getSnapshot());
        const next = futureRef.current.pop()!;
        pastRef.current.push(current);

        applySnapshot(next);
        onAfterApply?.();
    }, [applySnapshot, getSnapshot, onAfterApply]);

    const clear = useCallback(() => {
        pastRef.current = [];
        futureRef.current = [];
    }, []);

    return { pushSnapshot, undo, redo, clear, canUndo, canRedo };
}
