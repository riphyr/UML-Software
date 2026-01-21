import EmptyPanel from "./panels/EmptyPanel";
import ClassPanel from "./panels/ClassPanel";
import RelationPanel from "./panels/RelationPanel";
import MultiPanel from "./panels/MultiPanel";
import type { InspectorProps } from "./inspector.types";

export default function Inspector(p: InspectorProps & { getClassNameById: (id: string) => string }) {
    const selCount = p.selectedClasses.length + p.selectedRelations.length;
    if (selCount === 0) return <EmptyPanel />;

    if (selCount > 1) {
        return (
            <MultiPanel
                selectionCount={selCount}
                nodeCount={p.selectedClasses.length}
                relationCount={p.selectedRelations.length}
                actions={p.actions}
            />
        );
    }

    if (p.selectedClass) {
        const c = p.selectedClass;
        return (
            <ClassPanel
                c={c}
                onApply={(next) => p.actions.applyClassEdits(c.id, next)}
                onDelete={p.actions.deleteSelected}
                onDuplicate={p.actions.duplicateSelected}
            />
        );
    }

    const r = p.selectedRelation!;
    return (
        <RelationPanel
            r={r}
            fromName={p.getClassNameById(r.fromId)}
            toName={p.getClassNameById(r.toId)}
            onSetKind={p.actions.setRelationKindOnSelected}
            onSetLabel={p.actions.setRelationLabelOnSelected}
            onSetWaypointCount={p.actions.setRelationWaypointCountOnSelected}
            onDelete={p.actions.deleteSelected}
        />
    );
}
