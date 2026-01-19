import type { NodeView } from "./view";

export type ViewsById = Record<string, NodeView>;

export function addView(map: ViewsById, view: NodeView): ViewsById {
    return { ...map, [view.id]: view };
}

export function removeView(map: ViewsById, id: string): ViewsById {
    if (!(id in map)) return map;
    const { [id]: _, ...rest } = map;
    return rest;
}

export function updateView(map: ViewsById, id: string, patch: Partial<NodeView>): ViewsById {
    const v = map[id];
    if (!v) return map;
    return { ...map, [id]: { ...v, ...patch } };
}
