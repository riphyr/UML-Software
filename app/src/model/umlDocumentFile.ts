import type { UmlDocumentV1 } from "./umlDocument";
import { normalizeDocument } from "./umlDocument";

const FILTERS = [{ name: "UML Document", extensions: ["json"] }];

function normalizeDialogPath(p: string): string {
    // certains environnements peuvent renvoyer file://...
    if (p.startsWith("file://")) {
        const url = new URL(p);
        // Windows: pathname commence par /C:/...
        const path = decodeURIComponent(url.pathname);
        return path.startsWith("/") && /^[A-Za-z]:/.test(path.slice(1)) ? path.slice(1) : path;
    }
    return p;
}

function isTauriSyncFallback(): boolean {
    // Selon la version/config Tauri, `window.__TAURI__` peut être absent.
    // On couvre aussi `__TAURI_INTERNALS__` (plus fréquent en v2).
    return (
        typeof (window as any).__TAURI__ !== "undefined" ||
        typeof (window as any).__TAURI_INTERNALS__ !== "undefined" ||
        typeof (window as any).__TAURI_INTERNALS !== "undefined"
    );
}

async function isTauriRuntime(): Promise<boolean> {
    // Détection fiable (Tauri v2): `@tauri-apps/api/core` expose `isTauri()`.
    try {
        const core = await import("@tauri-apps/api/core");
        const fn = (core as any).isTauri;
        if (typeof fn === "function") return !!fn();
    } catch {
        // ignore
    }
    return isTauriSyncFallback();
}

export async function exportUmlDocumentToJsonFile(doc: UmlDocumentV1, filenameBase = "uml-document") {
    const json = JSON.stringify(doc, null, 2);

    // Tauri: vraie fenêtre "Enregistrer sous..."
    if (await isTauriRuntime()) {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");

        const selected = await save({
            title: "Exporter le document",
            defaultPath: `${filenameBase}.json`,
            filters: FILTERS,
        });

        if (!selected) return;

        const path = normalizeDialogPath(selected);
        await writeTextFile(path, json, { create: true });
        return;
    }

    // Web fallback: téléchargement (Downloads)
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `${filenameBase}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
}

export async function importUmlDocumentFromJsonFile(): Promise<UmlDocumentV1 | null> {
    // Tauri: vraie fenêtre "Ouvrir..."
    if (await isTauriRuntime()) {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const { readTextFile } = await import("@tauri-apps/plugin-fs");

        const selected = await open({
            title: "Importer un document",
            multiple: false,
            directory: false,
            filters: FILTERS,
        });

        if (!selected || Array.isArray(selected)) return null;

        const path = normalizeDialogPath(selected);
        const raw = await readTextFile(path);
        const parsed = JSON.parse(raw) as unknown;

        return normalizeDocument(parsed as any);
    }

    // Web fallback: input file
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";

    const pickFile = () =>
        new Promise<File | null>((resolve) => {
            input.onchange = () => resolve(input.files?.[0] ?? null);
            input.click();
        });

    const file = await pickFile();
    if (!file) return null;

    const text = await file.text();
    const parsed = JSON.parse(text);
    return normalizeDocument(parsed);
}
