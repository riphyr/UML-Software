export type NodeView = {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;

    /**
     * auto: taille pilotée par le contenu (avec snap grille si activée)
     * locked: l'utilisateur impose width/height
     */
    sizeMode?: "auto" | "locked";
};
