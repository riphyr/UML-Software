// Header can contain an optional stereotype line + the class name.
export const NODE_HEADER_HEIGHT = 40;
export const NODE_LINE_HEIGHT = 18;
export const NODE_ATTR_START_Y = NODE_HEADER_HEIGHT + 12;

// séparation entre attributs et méthodes (ligne + marges)
export const NODE_METHODS_GAP = 10;
export const NODE_METHODS_START_EXTRA = 12;

export function getAttrsCount(attributesLength: number) {
    return Math.max(1, attributesLength);
}

export function getMethodsSeparatorY(attrsCount: number) {
    return NODE_ATTR_START_Y + attrsCount * NODE_LINE_HEIGHT + NODE_METHODS_GAP;
}

export function getMethodsStartY(attrsCount: number) {
    return getMethodsSeparatorY(attrsCount) + NODE_METHODS_START_EXTRA;
}
