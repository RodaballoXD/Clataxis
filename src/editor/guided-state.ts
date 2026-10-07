export type GuidedEditorState =
    | { stage: 'choose-target'; candidateNodePath: number[] | null }
    | { stage: 'choose-type'; targetNodePath: number[] }
    | { stage: 'steps'; targetNodePath: number[] | null; syntagmaType: string | null; stepIndex: number };

export function createGuidedEditorState(): GuidedEditorState {
    return { stage: 'choose-target', candidateNodePath: null };
}