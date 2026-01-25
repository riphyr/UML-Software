import Section from "../sections/Section";

export default function EmptyPanel() {
    return (
        <Section title="Inspector">
            <div style={{ color: "#c9c4d6", fontSize: 13, lineHeight: 1.4 }}>
                No selection.
            </div>
        </Section>
    );
}
