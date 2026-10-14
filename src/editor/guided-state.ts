export type GuidedEditorState =
    | { stage: 'choose-target' }
    | { stage: 'choose-type'; targetNodePath: number[] }
    | { stage: 'steps'; targetNodePath: number[] | null; syntagmaType: string | null; stepIndex: number };

export function createGuidedEditorState(): GuidedEditorState {
    return { stage: 'choose-target' };
}