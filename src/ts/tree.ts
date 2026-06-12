export class SyntaxTree {
    private tree: RootNode;
    private idCounter: number = 0;
    private tokenCounter: number | null = null;

    constructor(json?: ReducedJSON) {
        this.tree = this.buildTreeFromReduced(json ?? []);
    }

    private buildTreeFromReduced(json: ReducedJSON): RootNode {
        const contents = json.map(this.buildNode);
        const { startToken, endToken } = this.getTokenRangeFromChildren(contents);
        return {
            id: 'root',
            type: 'box',
            startToken,
            endToken,
            contents
        }
    }

    private buildNode(node: ReducedSyntaxNode): SyntaxNode | WordNode {
        if (this.tokenCounter === null) {
            this.tokenCounter = 0;
        }
        if (typeof node.contents === 'string') {
            this.tokenCounter++;
            return {
                id: this.newId(),
                type: 'word',
                token: this.tokenCounter,
                word: node.contents,
                comment: node.comment
            };
        }
        const contents = node.contents.map(this.buildNode);
        const { startToken, endToken } = this.getTokenRangeFromChildren(contents);
        return {
            id: this.newId(),
            type: 'box',
            startToken,
            endToken,
            function: (node as ReducedSyntaxBox).function,
            category: (node as ReducedSyntaxBox).category,
            comment: node.comment,
            contents
        };
    }

    private newId(): number {
        return this.idCounter++;
    }

    private getTokenRangeFromChildren(children: (SyntaxNode | WordNode)[]): { startToken: number, endToken: number } {
        let startToken: number; let endToken: number;

        const first = children[0];
        if (first.type === 'word') {
            startToken = (first as WordNode).token;
        } else {
            startToken = (first as SyntaxNode).startToken;
        }

        const last = children[children.length-1];
        if (last.type === 'word') {
            endToken = (last as WordNode).token;
        } else {
            endToken = (last as SyntaxNode).endToken;
        }

        return { startToken, endToken };
    }

    toJSON(): RootNode {
        return this.tree;
    }

    setJSON(json: RootNode) {
        this.tree = json;
    }

    toReducedJSON(): ReducedJSON {
        const contents = this.tree.contents;
        return contents.map(this.reduceNode);
    }

    private reduceNode(node: SyntaxNode | WordNode): ReducedSyntaxNode {
        if (node.type === 'word') {
            return {
                comment: node.comment,
                contents: node.word
            };
        }
        return {
            function: (node as SyntaxNode).function,
            category: (node as SyntaxNode).category,
            comment: node.comment,
            contents: (node as SyntaxNode).contents.map(this.reduceNode)
        };
    }
}

export interface SyntaxNode {
    id: number;
    type: 'box';
    startToken: number;
    endToken: number;
    category: string | null;
    function: string | null;
    comment?: string | null;
    contents: (SyntaxNode | WordNode)[];
}

export interface WordNode {
    id: number;
    type: 'word';
    token: number;
    word: string;
    comment?: string | null;
}

export interface RootNode {
    id: 'root';
    type: 'box';
    startToken: number;
    endToken: number;
    contents: (SyntaxNode | WordNode)[];
}

export interface ReducedSyntaxBox {
    function: string | null;
    category: string | null;
    comment?: string | null;
    contents: ReducedSyntaxNode[]
}

export interface ReducedWord {
    comment?: string | null;
    contents: string;
}

export type ReducedSyntaxNode = ReducedSyntaxBox | ReducedWord;
export type ReducedJSON = ReducedSyntaxNode[];