interface SyntaxNode {
    id: number;
    type: 'box';
    category: string | null;
    function: string | null;
    comment?: string | null;
    contents: (SyntaxNode | WordNode)[];
}

interface WordNode {
    id: number;
    type: 'word';
    word: string;
    comment?: string | null;
}

interface TreeJSON {
    id: 'root';
    type: 'box';
    contents: (SyntaxNode | WordNode)[];
}

interface ReducedSyntaxNode {
    function: string | null;
    category: string | null;
    comment?: string | null;
    contents: ReducedSyntaxNode[] | string;
}

type ReducedJSON = ReducedSyntaxNode[];

export class SyntaxTree {
    private tree: TreeJSON;
    private idCounter: number = 0;

    constructor(json?: ReducedJSON) {
        if (!json) {
            this.tree = this.buildTreeFromReduced([]);
            return;
        }
        this.tree = this.buildTreeFromReduced(json);
    }

    private buildTreeFromReduced(json: ReducedJSON): TreeJSON {
        return {
            id: 'root',
            type: 'box',
            contents: json.map(this.buildNode)
        }
    }

    private buildNode(node: ReducedSyntaxNode): SyntaxNode | WordNode {
        if (typeof node.contents === 'string') {
            return {
                id: this.newId(),
                type: 'word',
                word: node.contents,
                comment: node.comment
            };
        }
        return {
            id: this.newId(),
            type: 'box',
            function: node.function,
            category: node.category,
            comment: node.comment,
            contents: node.contents.map(this.buildNode)
        };
    }

    toJSON() {
        return this.tree;
    }

    setJSON(json: TreeJSON) {
        this.tree = json;
    }

    private newId(): number {
        return this.idCounter++;
    }
};