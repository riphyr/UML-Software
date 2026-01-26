export function uid(prefix = "a"): string {
    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}
