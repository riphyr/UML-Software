import Section from "../sections/Section";

export default function EmptyPanel() {
    return (
        <Section title="Inspector">
            <div style={{ color: "#a9b4d0", fontSize: 13, lineHeight: 1.4 }}>
                No selection.
            </div>
        </Section>
    );
}
