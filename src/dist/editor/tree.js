import { exampleSentence } from "../shared/consts.js";
export class SyntaxTree {
    constructor(json) {
        this.idCounter = 0;
        this.tokenCounter = null; // Starts at 1
        this.tree = this.buildTreeFromReduced(json ?? [{ cont: '∅' }]);
        this.nodeMap = new Map();
        this.parentNodeMap = new Map();
        this.mapNodes();
    }
    buildTreeFromReduced(json) {
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
        };
    }
    buildNode(node, getTokenRange = true) {
        if (this.tokenCounter === null) {
            this.tokenCounter = 0;
        }
        if (typeof node === 'string') {
            this.tokenCounter++;
            return {
                id: this.newId(),
                type: 'word',
                token: this.tokenCounter,
                word: node
            };
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
        let startToken;
        let endToken;
        if (getTokenRange) {
            const range = this.getTokenRangeFromChildren(contents);
            startToken = range.startToken;
            endToken = range.endToken;
        }
        else {
            startToken = -1;
            endToken = -1;
        }
        return {
            id: this.newId(),
            type: 'box',
            startToken,
            endToken,
            function: node.fun,
            category: node.cat,
            comment: node.com,
            contents
        };
    }
    mapNodes() {
        this.nodeMap = new Map();
        this.parentNodeMap = new Map();
        this.traverse(this.tree, 'root');
    }
    traverse(node, parentId) {
        this.nodeMap.set(node.id, node);
        if (node.id !== 'root')
            this.parentNodeMap.set(node.id, parentId);
        if (node.type === 'word')
            return;
        node.contents.forEach((child) => this.traverse(child, node.id));
    }
    ;
    newId() {
        return this.idCounter++;
    }
    getTokenRangeFromChildren(children) {
        if (children.length === 0)
            throw new Error('Cannot get token range from empty children array');
        let startToken;
        let endToken;
        const first = children[0];
        if (first.type === 'word') {
            startToken = first.token;
        }
        else {
            startToken = first.startToken;
        }
        const last = children[children.length - 1];
        if (last.type === 'word') {
            endToken = last.token;
        }
        else {
            endToken = last.endToken;
        }
        return { startToken, endToken };
    }
    getJSON() {
        return this.tree;
    }
    toReducedJSON() {
        const contents = this.tree.contents;
        return contents.map(child => this.reduceNode(child));
    }
    reduceNode(node) {
        if (node.type === 'word') {
            if (!node.comment)
                return node.word;
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
    getNode(id) {
        const node = this.nodeMap.get(id);
        if (!node) {
            throw new Error(`Node ${id} is not in nodeMap`);
        }
        return node;
    }
    getParentId(id) {
        const parentId = this.parentNodeMap.get(id);
        if (parentId === undefined) {
            throw new Error(`Id ${id} is not in parentMap`);
        }
        return parentId;
    }
    getNodePath(id) {
        const path = [];
        let currentId = id;
        while (currentId !== 'root') {
            const node = this.getNode(currentId);
            const parent = this.getParentNode(currentId);
            const childIndex = parent.contents.indexOf(node);
            if (childIndex < 0)
                throw new Error(`Node ${currentId} is not in its parent's contents`);
            path.unshift(childIndex);
            currentId = parent.id;
        }
        return path;
    }
    getBoxNodeIdAtPath(path) {
        let current = this.tree;
        for (const childIndex of path) {
            const child = current.contents[childIndex];
            if (!child || child.type !== 'box')
                return null;
            current = child;
        }
        return current.id === 'root' ? null : current.id;
    }
    getParentNode(id) {
        const node = this.getNode(this.getParentId(id));
        if (!node) {
            throw new Error(`Node ${id} is not in nodeMap`);
        }
        return node;
    }
    setNodeAnalysis(id, analysis) {
        const node = this.getNode(id);
        if (node.type === 'word')
            throw new Error('Cannot setNodeAnalysis of WordNode');
        node.category = newAnalysisPart(node.category, analysis.category);
        node.function = newAnalysisPart(node.function, analysis.function);
        node.comment = newAnalysisPart(node.comment, analysis.comment) ?? undefined;
        function newAnalysisPart(currentPart, newPart) {
            if (newPart === null) {
                return null;
            }
            else if (newPart === undefined) {
                return (!currentPart) ? null : currentPart;
            }
            return newPart;
        }
    }
    deleteNode(id) {
        const node = this.getNode(id);
        if (node.type === 'word')
            throw new Error('Cannot delete word node');
        const parent = this.getParentNode(id);
        const nodeIndexInParent = parent.contents.indexOf(node);
        const wordNodes = findWords(node);
        parent.contents.splice(nodeIndexInParent, 1, ...wordNodes);
        this.mapNodes();
        function findWords(node) {
            const children = node.contents;
            let words = [];
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
    promoteChildren(id) {
        const node = this.getNode(id);
        if (node.type === 'word') {
            throw new Error('Cannot delete word node');
        }
        const children = node.contents;
        const parent = this.getParentNode(id);
        const nodeIndexInParent = parent.contents.indexOf(node);
        parent.contents.splice(nodeIndexInParent, 1, ...children);
        this.mapNodes();
    }
    insertBoxAtRange(start, end) {
        const root = this.tree;
        const parentOfInserted = findParentForRange(root, start, end);
        if (!parentOfInserted)
            return { status: 'error' };
        const children = parentOfInserted.contents;
        const { startNode, endNode } = findStartEndChildren(children);
        if (!(startNode && endNode))
            return { status: 'error' };
        const nodesToMove = nodesInRange(children, startNode, endNode);
        const newNode = this.buildNode({ fun: null, cat: null, cont: [] }, false);
        newNode.contents = nodesToMove;
        newNode.startToken = start;
        newNode.endToken = end;
        parentOfInserted.contents.splice(parentOfInserted.contents.indexOf(nodesToMove[0]), nodesToMove.length, newNode);
        this.mapNodes();
        return {
            innermostUntouchedId: parentOfInserted.id,
            newNodeId: newNode.id,
            status: 'success'
        };
        function findParentForRange(node, start, end) {
            const endBigger = (node.endToken >= end);
            const startSmaller = (node.startToken <= start);
            if (!(endBigger && startSmaller))
                return null;
            for (const child of node.contents) {
                if (child.type === 'word')
                    continue;
                const found = findParentForRange(child, start, end);
                if (found)
                    return found;
            }
            return node;
        }
        function findStartEndChildren(children) {
            let startNode = null;
            let endNode = null;
            for (const child of children) {
                const childStartToken = (child.type === 'word') ? child.token : child.startToken;
                const childEndToken = (child.type === 'word') ? child.token : child.endToken;
                if (childStartToken === start)
                    startNode = child;
                if (childEndToken === end)
                    endNode = child;
            }
            return { startNode, endNode };
        }
        function nodesInRange(children, startNode, endNode) {
            let nodesToMove = [];
            let inRange = false;
            for (const child of children) {
                if (child === startNode)
                    inRange = true;
                if (!inRange)
                    continue;
                nodesToMove.push(child);
                if (child === endNode)
                    break;
            }
            return nodesToMove;
        }
    }
    setWordNodeAtId(id, wordData) {
        const node = this.getNode(id);
        if (node.type !== 'word')
            throw new Error("Attempted to `setWordNodeAtId` on box node");
        const word = wordData.word?.trim() ?? null;
        const comment = wordData.comment ?? null; // Don't trim
        const wordHasSpaces = /\s/.test(word ?? '');
        if (word && !wordHasSpaces) {
            node.word = word;
            node.comment = comment;
            return false;
        }
        if (!word) {
            this.deleteWordNode(node);
        }
        else if (wordHasSpaces) {
            this.createWordsAt(node, word, comment);
        }
        // Remap token ranges
        const reduced = this.toReducedJSON();
        this.tree = this.buildTreeFromReduced(reduced);
        this.mapNodes();
        return true;
    }
    deleteWordNode(node) {
        const findOneSizedParent = (node) => {
            let found = null;
            let parent = node;
            while (true) {
                parent = this.getParentNode(parent.id);
                if ((parent.startToken !== parent.endToken) || (parent.id === 'root')) {
                    break;
                }
                found = parent;
            }
            return found;
        };
        let outermostForRange = findOneSizedParent(node);
        if (outermostForRange) {
            this.deleteNode(outermostForRange.id);
        }
        const currentParent = this.getParentNode(node.id); // Given that `deleteNode` used `mapNodes`
        currentParent.contents = currentParent.contents.filter((child) => (child !== node));
        const treeIsEmpty = (currentParent.id === 'root' && currentParent.contents.length === 0);
        if (treeIsEmpty) {
            const placeholder = this.buildNode({ cont: '∅' }, false);
            placeholder.token = 1;
            currentParent.contents = [placeholder];
        }
    }
    createWordsAt(node, word, comment) {
        const wordsArr = word.split(/\s+/);
        const newNodes = wordsArr.map((str) => {
            return this.buildNode({ cont: str });
        });
        newNodes[0].comment = comment;
        const parent = this.getParentNode(node.id);
        const idxInParent = parent.contents.indexOf(node);
        parent.contents.splice(idxInParent, 1, ...newNodes);
    }
    getWordsFromTokenRange(startToken, endToken, fromNode = this.tree) {
        const children = fromNode.contents;
        let foundInRange = [];
        for (const child of children) {
            if (child.type === 'word') {
                if ((startToken <= child.token) && (child.token <= endToken))
                    foundInRange.push(child);
                continue;
            }
            foundInRange.push(...this.getWordsFromTokenRange(startToken, endToken, child));
        }
        return foundInRange;
    }
}
export function sentenceToReducedJSON(sentence) {
    if (sentence) {
        sentence = sentence.trim();
        if (!sentence)
            return null;
    }
    else {
        sentence = exampleSentence;
    }
    const words = sentence.split(/\s+/);
    return words;
}
//# sourceMappingURL=tree.js.map