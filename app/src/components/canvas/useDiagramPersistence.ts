import { useEffect } from "react";
import type { UmlClass } from "../../model/uml";
import type { ViewsById } from "../../model/views";
import type { UmlRelation } from "../../model/relation";
import { loadDiagram, saveDiagram } from "../../model/diagramStorage";
import { makeSnapshot, type DiagramSnapshotV2 } from "../../model/diagram";
import { exportSnapshotToJsonFile, importSnapshotFromJsonFile } from "../../model/diagramFile";

type Params = {
    classes: UmlClass[];
    setClasses: React.Dispatch<React.SetStateAction<UmlClass[]>>;

    viewsById: ViewsById;
    setViewsById: React.Dispatch<React.SetStateAction<ViewsById>>;

    clearSelection: () => void;

    relations?: UmlRelation[];
    setRelations?: React.Dispatch<React.SetStateAction<UmlRelation[]>>;
};

export function useDiagramPersistence(p: Params) {
    const { classes, viewsById, setClasses, setViewsById, clearSelection, relations, setRelations } = p;

    function applySnapshot(snap: DiagramSnapshotV2) {
        // ordre: données -> puis sélection
        setClasses(snap.classes);
        setViewsById(snap.viewsById);
        if (setRelations) setRelations(snap.relations ?? []);
        clearSelection();
    }

    function saveLocal() {
        saveDiagram(makeSnapshot(classes, viewsById, relations ?? []));
    }

    function loadLocal() {
        const snap = loadDiagram();
        if (!snap) return;
        applySnapshot(snap);
    }

    async function exportFile() {
        try {
            const snap = makeSnapshot(classes, viewsById, relations ?? []);
            const res = await exportSnapshotToJsonFile(snap);
            if (res.ok) console.log("[export] wrote:", res.path);
        } catch (err) {
            console.error("[export] failed:", err);
            alert(`Export échoué: ${String(err)}`);
        }
    }

    async function importFile() {
        try {
            const snap = await importSnapshotFromJsonFile();
            if (!snap) return;
            applySnapshot(snap);
            console.log("[import] ok");
        } catch (err) {
            console.error("[import] failed:", err);
            alert(`Import échoué: ${String(err)}`);
        }
    }

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (!e.ctrlKey) return;

            const k = e.key.toLowerCase();
            if (k === "s") {
                e.preventDefault();
                void exportFile();
            } else if (k === "o") {
                e.preventDefault();
                void importFile();
            }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [classes, viewsById, relations]);

    return { saveLocal, loadLocal, exportFile, importFile };
}
