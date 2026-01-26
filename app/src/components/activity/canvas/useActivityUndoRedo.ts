import { useRef } from "react";
import type { ActivitySnapshotV1 } from "../../../model/activity/activity";

export function useActivityUndoRedo(p: {
    getSnapshot: () => ActivitySnapshotV1;
    applySnapshot: (s: ActivitySnapshotV1) => void;
}) {
    const undo = useRef<ActivitySnapshotV1[]>([]);
    const redo = useRef<ActivitySnapshotV1[]>([]);

    function push() {
        undo.current.push(p.getSnapshot());
        redo.current = [];
    }

    function doUndo() {
        const prev = undo.current.pop();
        if (!prev) return;
        redo.current.push(p.getSnapshot());
        p.applySnapshot(prev);
    }

    function doRedo() {
        const next = redo.current.pop();
        if (!next) return;
        undo.current.push(p.getSnapshot());
        p.applySnapshot(next);
    }

    function clear() {
        undo.current = [];
        redo.current = [];
    }

    return { push, undo: doUndo, redo: doRedo, clear };
}
