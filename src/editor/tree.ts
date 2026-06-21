import { KeywordToken } from "typescript";
import { exampleSentence } from "../shared/consts.js";

export class SyntaxTree {
    private tree: RootNode;
    private idCounter: number = 0;
    private tokenCounter: number | null = null;
    private nodeMap: Map<NodeId, RootNode | SyntaxNode | WordNode>;
    private parentNodeMap: Map<number, NodeId>;

    constructor(json?: ReducedJSON) {
        this.tree = this.buildTreeFromReduced(json ?? [{ cont: '∅' }]);

        this.nodeMap = new Map();
        this.parentNodeMap = new Map();
        this.mapNodes();
    }

    private buildTreeFromReduced(json: ReducedJSON): RootNode {
        this.idCounter = 0;
        this.tokenCounter = null;

        const contents = json.map(child => this.buildNode(child));
        const { startToken, endToken } = this.getTokenRangeFromChildren(contents);
        return {
            id: 'root',
            type: 'box',
            startToken,
            endToken,
            contents
        }
    }

    private buildNode(node: ReducedSyntaxNode, getTokenRange = true): SyntaxNode | WordNode {
        if (this.tokenCounter === null) {
            this.tokenCounter = 0;
        }
        if (typeof node.cont === 'string') {
            this.tokenCounter++;
            return {
                id: this.newId(),
                type: 'word',
                token: this.tokenCounter,
                word: node.cont,
                comment: node.com
            };
        }
        const contents = node.cont.map(child => this.buildNode(child));

        let startToken: number; let endToken: number;
        if (getTokenRange) {
            const range = this.getTokenRangeFromChildren(contents);
            startToken = range.startToken; endToken = range.endToken;
        }
        else {
            startToken = -1; endToken = -1;
        }

        return {
            id: this.newId(),
            type: 'box',
            startToken,
            endToken,
            function: (node as ReducedSyntaxBox).fun,
            category: (node as ReducedSyntaxBox).cat,
            comment: node.com,
            contents
        };
    }

    private mapNodes() {
        this.nodeMap = new Map();
        this.parentNodeMap = new Map();
        this.traverse(this.tree, 'root');
    }
    private traverse(node: RootNode | SyntaxNode | WordNode, parentId: NodeId) {
        this.nodeMap.set(node.id, node);
        if (node.id !== 'root') this.parentNodeMap.set(node.id, parentId);

        if (node.type === 'word') return;
        node.contents.forEach((child) => this.traverse(child, node.id));
    };

    private newId(): number {
        return this.idCounter++;
    }

    private getTokenRangeFromChildren(children: (SyntaxNode | WordNode)[]): { startToken: number, endToken: number } {
        if (children.length === 0) throw new Error('Cannot get token range from empty children array');

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

    getJSON(): RootNode {
        return this.tree;
    }

    setJSON(json: RootNode) {
        this.tree = json;
        this.mapNodes();
    }

    toReducedJSON(): ReducedJSON {
        const contents = this.tree.contents;
        return contents.map(child => this.reduceNode(child));
    }

    private reduceNode(node: SyntaxNode | WordNode): ReducedSyntaxNode {
        if (node.type === 'word') {
            return {
                com: node.comment,
                cont: node.word
            };
        }
        return {
            fun: node.function,
            cat: node.category,
            com: node.comment,
            cont: node.contents.map(child => this.reduceNode(child))
        };
    }

    getNode(id: NodeId): SyntaxNode | RootNode | WordNode {
        const node = this.nodeMap.get(id);
        if (!node) {
            throw new Error(`Node ${id} is not in nodeMap`);
        }
        return node;
    }

    getParentId(id: number): NodeId {
        const parentId = this.parentNodeMap.get(id);
        if (parentId === undefined) {
            throw new Error(`Id ${id} is not in parentMap`);
        }
        return parentId;
    }

    getParentNode(id: number): SyntaxNode | RootNode {
        const node = this.getNode(this.getParentId(id)!) as SyntaxNode | RootNode;
        if (!node) {
            throw new Error(`Node ${id} is not in nodeMap`);
        }
        return node;
    }

    setNodeAnalysis(id: number, analysis: AnalysisData) {
        const node = this.getNode(id) as SyntaxNode;
        if ((node as any).type === 'word') throw new Error('Cannot setNodeAnalysis of WordNode');
        node.category = newAnalysisPart(node.category, analysis.category);
        node.function = newAnalysisPart(node.function, analysis.function);
        node.comment = newAnalysisPart(node.comment, analysis.comment) ?? undefined;

        function newAnalysisPart(currentPart?: string | null, newPart?: string | null): string | null {
            if (newPart === null) {
                return null;
            } else if (newPart === undefined) {
                return (!currentPart) ? null : currentPart;
            }
            return newPart;
        }
    }

    deleteNode(id: number) { // Deletes the node and its children, only keeping words
        const node = this.getNode(id) as SyntaxNode;
        if ((node as any).type === 'word') throw new Error('Cannot delete word node');

        const parent = this.getParentNode(id) as SyntaxNode | RootNode;
        const nodeIndexInParent = parent.contents.indexOf(node);

        const wordNodes = findWords(node);
        parent.contents.splice(nodeIndexInParent, 1, ...wordNodes);

        this.mapNodes();

        function findWords(node: SyntaxNode | RootNode): WordNode[] {
            const children = node.contents;
            let words: WordNode[] = [];
            for (const child of children) {
                if (child.type === 'word') {
                    words.push(child);
                    continue;
                }
                words.push(...findWords(child));
            }
            return words;
        }
    }

    promoteChildren(id: number) { // Deletes the node and gives its children to its parent
        const node = this.getNode(id) as SyntaxNode;
        if ((node as any).type === 'word') {
            throw new Error('Cannot delete word node');
        }
        const children = node.contents;
        const parent = this.getParentNode(id);
        const nodeIndexInParent = parent.contents.indexOf(node);
        parent.contents.splice(nodeIndexInParent, 1, ...children);

        this.mapNodes();
    }

    insertBoxAtRange(start: number, end: number): ({ status: 'error' } | { innermostUntouchedId: NodeId, status: 'success' }) {
        const root = this.tree;
        const parentOfInserted = findParentForRange(root, start, end);
        if (!parentOfInserted) return { status: 'error' };

        const children = parentOfInserted.contents;
        const { startNode, endNode } = findStartEndChildren(children);
        if (!(startNode && endNode)) return { status: 'error' };

        const nodesToMove = nodesInRange(children, startNode, endNode);

        const newNode = this.buildNode({ fun: null, cat: null, cont: [] }, true) as SyntaxNode;
        newNode.contents = nodesToMove;
        newNode.startToken = start; newNode.endToken = end;

        parentOfInserted.contents.splice(
            parentOfInserted.contents.indexOf(nodesToMove[0]),
            nodesToMove.length,
            newNode
        );

        this.mapNodes();

        return {
            innermostUntouchedId: parentOfInserted.id,
            status: 'success'
        };

        function findParentForRange(node: SyntaxNode | RootNode, start: number, end: number): SyntaxNode | RootNode | null {
            const endBigger = (node.endToken >= end);
            const startSmaller = (node.startToken <= start);
            if (!(endBigger && startSmaller)) return null;

            for (const child of node.contents) {
                if (child.type === 'word') continue;
                const found = findParentForRange(child, start, end);
                if (found) return found;
            }

            return node;
        }

        function findStartEndChildren(children: (SyntaxNode | WordNode)[]): { startNode: SyntaxNode | WordNode | null, endNode: SyntaxNode | WordNode | null } {
            let startNode: SyntaxNode | WordNode | null = null;
            let endNode: SyntaxNode | WordNode | null = null;

            for (const child of children) {
                const childStartToken = (child.type === 'word') ? child.token : child.startToken;
                const childEndToken = (child.type === 'word') ? child.token : child.endToken;

                if (childStartToken === start) startNode = child;
                if (childEndToken === end) endNode = child;
            }

            return { startNode, endNode };
        }

        function nodesInRange(children: (SyntaxNode | WordNode)[], startNode: SyntaxNode | WordNode, endNode: SyntaxNode | WordNode): (SyntaxNode | WordNode)[] {
            let nodesToMove: (SyntaxNode | WordNode)[] = [];
            let inRange = false;
            for (const child of children) {
                if (child === startNode) inRange = true;
                if (!inRange) continue;
                nodesToMove.push(child);
                if (child === endNode) break;
            }
            return nodesToMove;
        }
    }
}

export function sentenceToReducedJSON(sentence: string): ReducedJSON | null {
    if (sentence) {
        sentence = sentence.trim();
        if (!sentence) return null;
    } else {
        sentence = exampleSentence;
    }

    const words = sentence.split(/\s+/);
    return words.map(word => { return {cont: word} });
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
    fun: string | null;
    cat: string | null;
    com?: string | null;
    cont: ReducedSyntaxNode[]
}

export interface ReducedWord {
    com?: string | null;
    cont: string;
}

export type ReducedSyntaxNode = ReducedSyntaxBox | ReducedWord;
export type ReducedJSON = ReducedSyntaxNode[];

export type NodeId = number | 'root';

export interface AnalysisData {
    category?: string | null;
    function?: string | null;
    comment?: string | null;
}