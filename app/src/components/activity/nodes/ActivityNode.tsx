import React from "react";
import type { ActivityNode as N, ActivityNodeView } from "../../../model/activity/activity";
import ActionNode from "./ActionNode";
import DecisionNode from "./DecisionNode";
import ForkJoinNode from "./ForkJoinNode";
import InitialNode from "./InitialNode";
import FinalNode from "./FinalNode";
import ObjectNode from "./ObjectNode";

export default function ActivityNode(p: {
    node: N;
    view: ActivityNodeView;
    selected: boolean;
    onMouseDown: (e: React.MouseEvent) => void;
    onDoubleClick: () => void;
}) {
    const common = {
        selected: p.selected,
        x: p.view.x,
        y: p.view.y,
        w: p.view.w,
        h: p.view.h,
        name: p.node.name,
        onMouseDown: p.onMouseDown,
        onDoubleClick: p.onDoubleClick,
    };

    if (p.node.kind === "action") return <ActionNode {...common} />;
    if (p.node.kind === "object") return <ObjectNode {...common} />;
    if (p.node.kind === "decision" || p.node.kind === "merge") return <DecisionNode {...common} kind={p.node.kind} />;
    if (p.node.kind === "fork" || p.node.kind === "join") return <ForkJoinNode {...common} kind={p.node.kind} />;
    if (p.node.kind === "initial") return <InitialNode {...common} />;
    if (p.node.kind === "final") return <FinalNode {...common} />;
    return null;
}
