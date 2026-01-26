import type { ActivityFlow, ActivityNode } from "../../../model/activity/activity";
import { uid } from "../utils/id";

export function useActivityActions(p: {
    nodes: ActivityNode[];
    setNodes: React.Dispatch<React.SetStateAction<ActivityNode[]>>;

    flows: ActivityFlow[];
    setFlows: React.Dispatch<React.SetStateAction<ActivityFlow[]>>;

    selectedNodeIds: string[];
    setSelectedNodeIds: React.Dispatch<React.SetStateAction<string[]>>;
    selectedFlowId: string | null;
    setSelectedFlowId: React.Dispatch<React.SetStateAction<string | null>>;
}) {
    function setNodeName(id: string, name: string) {
        p.setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, name } : n)));
    }

    function setFlowLabel(id: string, label: string) {
        p.setFlows((prev) => prev.map((f) => (f.id === id ? { ...f, label } : f)));
    }

    function setFlowGuard(id: string, guard: string) {
        p.setFlows((prev) => prev.map((f) => (f.id === id ? { ...f, guard } : f)));
    }

    function deleteSelected() {
        const nodeIds = p.selectedNodeIds;
        const flowId = p.selectedFlowId;

        if (flowId) {
            p.setFlows((prev) => prev.filter((f) => f.id !== flowId));
            p.setSelectedFlowId(null);
            return;
        }

        if (nodeIds.length > 0) {
            p.setNodes((prev) => prev.filter((n) => !nodeIds.includes(n.id)));
            p.setFlows((prev) => prev.filter((f) => !nodeIds.includes(f.fromId) && !nodeIds.includes(f.toId)));
            p.setSelectedNodeIds([]);
        }
    }

    function createFlow(args: { kind: "control" | "object"; fromId: string; toId: string }) {
        const f: ActivityFlow = {
            id: uid("flow"),
            kind: args.kind,
            fromId: args.fromId,
            toId: args.toId,
            label: "",
            guard: "",
            waypoints: [],
        };
        p.setFlows((prev) => [f, ...prev]);
        p.setSelectedFlowId(f.id);
        p.setSelectedNodeIds([]);
    }

    return {
        setNodeName,
        setFlowLabel,
        setFlowGuard,
        deleteSelected,
        createFlow,
    };
}
