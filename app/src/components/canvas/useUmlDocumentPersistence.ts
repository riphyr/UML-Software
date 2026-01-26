import { useEffect } from "react";
import type { UmlDocumentV1 } from "../../model/umlDocument";
import { loadUmlDocument, saveUmlDocument } from "../../model/umlDocumentStorage";
import { exportUmlDocumentToJsonFile, importUmlDocumentFromJsonFile } from "../../model/umlDocumentFile";

export function useUmlDocumentPersistence(p: {
    getDocument: () => UmlDocumentV1;
    applyDocument: (doc: UmlDocumentV1) => void;
}) {
    const { getDocument, applyDocument } = p;

    function saveLocal() {
        saveUmlDocument(getDocument());
    }

    function loadLocal() {
        const doc = loadUmlDocument();
        if (!doc) return;
        applyDocument(doc);
    }

    async function exportFile() {
        const doc = getDocument();
        await exportUmlDocumentToJsonFile(doc, "uml-document");
    }

    async function importFile() {
        const doc = await importUmlDocumentFromJsonFile();
        if (!doc) return;
        applyDocument(doc);
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
    }, []);

    return { saveLocal, loadLocal, exportFile, importFile };
}
