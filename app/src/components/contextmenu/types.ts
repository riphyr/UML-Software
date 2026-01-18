export type ContextTarget =
    | { kind: "background"; worldX: number; worldY: number }
    | { kind: "class"; id: string; worldX: number; worldY: number };

export type ContextAction =
    | { type: "create_class"; worldX: number; worldY: number }
    | { type: "delete_class"; id: string }
    | { type: "rename_class"; id: string };
