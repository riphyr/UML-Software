import { normalizeSnapshot } from "./diagram";
import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";

const FILTERS = [{ name: "UML Diagram", extensions: ["json"] }];

function normalizeDialogPath(p: string): string {
    // iOS / certains environnements peuvent renvoyer file://...
    if (p.startsWith("file://")) {
        const url = new URL(p);
        // Windows: pathname commence par /C:/...
        const path = decodeURIComponent(url.pathname);
        return path.startsWith("/") && /^[A-Za-z]:/.test(path.slice(1)) ? path.slice(1) : path;
    }
    return p;
}

export async function exportSnapshotToJsonFile(snapshot: unknown): Promise<{ ok: true; path: string } | { ok: false; reason: string }> {
    const filePath = await save({
        title: "Exporter le diagramme",
        filters: FILTERS,
        defaultPath: "diagram.uml.json",
    });

    if (!filePath) return { ok: false, reason: "cancel" };

    const path = normalizeDialogPath(filePath);
    const json = JSON.stringify(snapshot, null, 2);

    // IMPORTANT: create: true -> autorise la création du fichier :contentReference[oaicite:4]{index=4}
    await writeTextFile(path, json, { create: true });

    return { ok: true, path };
}

export async function importSnapshotFromJsonFile(): Promise<ReturnType<typeof normalizeSnapshot> | null> {
    const selected = await open({
        title: "Importer un diagramme",
        multiple: false,
        directory: false,
        filters: FILTERS,
    });

    if (!selected || Array.isArray(selected)) return null;

    const path = normalizeDialogPath(selected);
    const raw = await readTextFile(path);

    const parsed = JSON.parse(raw) as unknown;
    return normalizeSnapshot(parsed as any);
}
