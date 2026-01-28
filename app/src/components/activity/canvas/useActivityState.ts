import { useMemo, useState } from "react";
import type { ActivityFlow, ActivityNode, ActivitySnapshotV1, ActivityViewsById } from "../../../model/activity/activity";
import { makeEmptyActivitySnapshot } from "../../../model/activity/activitySnapshot";

export type ActivityMode =
    | "select"
    | "addNode"
    | "addObject"
    | "link";

export function useActivityState() {
    const [nodes, setNodes] = useState<ActivityNode[]>([]);
    const [flows, setFlows] = useState<ActivityFlow[]>([]);
    const [viewsById, setViewsById] = useState<ActivityViewsById>({});

    const [mode, setMode] = useState<ActivityMode>("select");
    const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
    const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);

    const [grid, setGrid] = useState<{ enabled: boolean; size: number }>({ enabled: true, size: 20 });

    const selectedNodes = useMemo(
        () => selectedNodeIds.map((id) => nodes.find((n) => n.id === id) ?? null).filter((x): x is ActivityNode => !!x),
        [selectedNodeIds, nodes]
    );

    const selectedFlow = useMemo(
        () => (selectedFlowId ? flows.find((f) => f.id === selectedFlowId) ?? null : null),
        [selectedFlowId, flows]
    );

    function clearSelection() {
        setSelectedNodeIds([]);
        setSelectedFlowId(null);
    }

    function getSnapshot(): ActivitySnapshotV1 {
        return { version: 1, nodes, flows, viewsById };
    }

    function applySnapshot(s: ActivitySnapshotV1) {
        setNodes(s.nodes);
        setFlows(s.flows);
        setViewsById(s.viewsById);
        clearSelection();
    }

    function reset() {
        applySnapshot(makeEmptyActivitySnapshot());
    }

    return {
        nodes,
        setNodes,
        flows,
        setFlows,
        viewsById,
        setViewsById,

        mode,
        setMode,
        selectedNodeIds,
        setSelectedNodeIds,
        selectedFlowId,
        setSelectedFlowId,
        selectedNodes,
        selectedFlow,

        grid,
        setGrid,

        clearSelection,

        getSnapshot,
        applySnapshot,
        reset,
    };
}
