export type ContextTarget =
    | { kind: "background"; worldX: number; worldY: number }
    | { kind: "class"; id: string; worldX: number; worldY: number }
    | { kind: "relation"; id: string; worldX: number; worldY: number };

export type ContextAction =
    | { type: "create_class"; worldX: number; worldY: number }
    | { type: "delete_class"; id: string }
    | { type: "duplicate_class"; id: string }
    | { type: "rename_class"; id: string }
    | { type: "add_attribute"; id: string }
    | { type: "add_method"; id: string }
    // LocalStorage (dev/fallback)
    | { type: "save_diagram" }
    | { type: "load_diagram" }
    // Fichier (Tauri)
    | { type: "export_diagram" }
    | { type: "import_diagram" }
    // Relations
    | { type: "delete_relation"; id: string }
    | { type: "set_relation_kind"; id: string; kind: "assoc" | "herit" | "agg" | "comp" }
    | { type: "edit_relation_label"; id: string };
