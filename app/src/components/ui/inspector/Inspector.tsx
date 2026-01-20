import EmptyPanel from "./panels/EmptyPanel";
import ClassPanel from "./panels/ClassPanel";
import RelationPanel from "./panels/RelationPanel";
import type { InspectorProps } from "./inspector.types";

export default function Inspector(p: InspectorProps & { getClassNameById: (id: string) => string }) {
    if (!p.selectedClass && !p.selectedRelation) return <EmptyPanel />;

    if (p.selectedClass) {
        const c = p.selectedClass;
        return (
            <ClassPanel
                c={c}
                onSetName={(name) => p.actions.setClassName(c.id, name)}
                onSetAttributes={(attrs) => p.actions.setClassAttributes(c.id, attrs)}
                onSetMethods={(methods) => p.actions.setClassMethods(c.id, methods)}
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
            onDelete={p.actions.deleteSelected}
        />
    );
}
