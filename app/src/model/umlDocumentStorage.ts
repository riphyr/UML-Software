import type { UmlDocumentV1 } from "./umlDocument";
import { normalizeDocument } from "./umlDocument";

const KEY = "ubnerithuml.document.v1";

export function saveUmlDocument(doc: UmlDocumentV1) {
    try {
        localStorage.setItem(KEY, JSON.stringify(doc));
    } catch {
        // ignore
    }
}

export function loadUmlDocument(): UmlDocumentV1 | null {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return normalizeDocument(parsed);
    } catch {
        return null;
    }
}
