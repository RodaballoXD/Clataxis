import { SyntaxNode, WordNode, RootNode, AnalysisData, NodeId } from "./tree.js";

abstract class BoxNodeEl extends HTMLElement {
    type: 'box' = 'box';
    nodeId: NodeId;
    protected abstract childrenEl: HTMLDivElement;

    constructor() {
        super();
        this.nodeId = -1;
    }

    build(node: SyntaxNode | RootNode): Map<NodeId, AnyNodeEl> {
        this.nodeId = node.id;

        return this.renderInside(node.contents).set(node.id, this);
    }

    renderInside(contents: (SyntaxNode | WordNode)[]): Map<NodeId, AnyNodeEl> {
        let elementMap = new Map<NodeId, AnyNodeEl>();

        this.childrenEl.replaceChildren();
        for (const child of contents) {
            if (child.type === 'word') {
                const wordEl = document.createElement('word-node') as WordNodeEl;
                this.childrenEl.appendChild(wordEl);
                const innerMap = wordEl.build(child);

                elementMap = new Map([...elementMap, ...innerMap]);
                continue;
            }
            const childEl = document.createElement('syntax-node') as SyntaxNodeEl;
            this.childrenEl.appendChild(childEl);
            const innerMap = childEl.build(child);
            elementMap = new Map([...elementMap, ...innerMap]);
        }
        return elementMap;
    }
}

export class RootNodeEl extends BoxNodeEl {
    protected childrenEl: HTMLDivElement;

    constructor() {
        super();
        this.childrenEl = document.createElement('div');
    }

    connectedCallback() {
        this.innerHTML = `
            <div class="root-node">
                <div class="children"></div>
            </div>
        `;
        this.childrenEl = this.querySelector('.children') as HTMLDivElement;
    }
}

export class SyntaxNodeEl extends BoxNodeEl {
    protected childrenEl: HTMLDivElement;
    private analysisEl: HTMLDivElement;
    private analysisElInside: AnalysisEls;

    constructor() {
        super();
        this.childrenEl = document.createElement('div'); this.analysisEl = document.createElement('div'); this.analysisElInside = { categoryEl: document.createElement('span'), slashEl: document.createElement('span'), functionEl: document.createElement('span'), commentEl: document.createElement('span'), catInputEl: document.createElement('input'), funcInputEl: document.createElement('input'), commentInputEl: document.createElement('input') };
    }

    connectedCallback() {
        this.innerHTML = `
            <div class="syntax-node">
                <div class="children"></div>
                <div class="line"></div>
                <div class="analysis">
                    <input class="category-input" placeholder="cat" spellcheck="false">

                    <span class="category"></span>
                    <span class="slash" style="display: none">/</span>
                    <span class="function"></span>
                    <span class="comment" style="display: none"></span>

                    <input class="function-input" placeholder="func" spellcheck="false">
                    <input class="comment-input" placeholder="com" spellcheck="false">
                </div>
            </div>
        `;

        this.childrenEl = this.querySelector('.children') as HTMLDivElement;
        this.analysisEl = this.querySelector('.analysis') as HTMLDivElement;
        this.analysisElInside = {
            categoryEl: this.analysisEl.querySelector('.category') as HTMLSpanElement,
            slashEl: this.analysisEl.querySelector('.slash') as HTMLSpanElement,
            functionEl: this.analysisEl.querySelector('.function') as HTMLSpanElement,
            commentEl: this.analysisEl.querySelector('.comment') as HTMLSpanElement,
            catInputEl: this.analysisEl.querySelector('.category-input') as HTMLInputElement,
            funcInputEl: this.analysisEl.querySelector('.function-input') as HTMLInputElement,
            commentInputEl: this.analysisEl.querySelector('.comment-input') as HTMLInputElement
        };
    }

    build(node: SyntaxNode): Map<NodeId, AnyNodeEl> {
        const elementMap = super.build(node);

        const analysis = { category: node.category, function: node.function, comment: node.comment };
        this.setAnalysis(analysis);

        return elementMap;
    }

    select() {
        this.classList.add('selected');
    }

    deselect() {
        this.classList.remove('selected');
    }

    setAnalysis(analysis: AnalysisData) {
        const newCateg = analysis.category;
        const newFunc = analysis.function;
        const newComment = analysis.comment;

        const slashVisible = (!!newCateg && !!newFunc);
        this.analysisElInside.slashEl.style.display = (slashVisible) ? '' : 'none';
        const commentVisible = !!newComment;
        this.analysisElInside.commentEl.style.display = (commentVisible) ? '' : 'none';
        const commentMargin = (commentVisible && (!!newCateg || !!newFunc));
        if (commentMargin) this.analysisElInside.commentEl.classList.add('left-margin');
        else this.analysisElInside.commentEl.classList.remove('left-margin');

        this.analysisElInside.categoryEl.textContent = newCateg ?? '';
        this.analysisElInside.functionEl.textContent = newFunc ?? '';
        this.analysisElInside.commentEl.textContent = newComment ?? '';
    }

    startEdit(): InputFieldEls {
        this.analysisEl.classList.add('editing');

        this.analysisElInside.catInputEl.value = this.analysisElInside.categoryEl.textContent;
        this.analysisElInside.funcInputEl.value = this.analysisElInside.functionEl.textContent;
        this.analysisElInside.commentInputEl.value = this.analysisElInside.commentEl.textContent;

        this.analysisElInside.slashEl.style.display = '';

        return {
            category: this.analysisElInside.catInputEl,
            function: this.analysisElInside.funcInputEl,
            comment: this.analysisElInside.commentInputEl
        };
    }

    finishEdit(): AnalysisData {
        this.analysisEl.classList.remove('editing');

        const newAnalysis = {
            category: popContent(this.analysisElInside.catInputEl),
            function: popContent(this.analysisElInside.funcInputEl),
            comment: popContent(this.analysisElInside.commentInputEl),
        }
        return newAnalysis;
    }
}

interface AnalysisEls {
    categoryEl: HTMLSpanElement;
    slashEl: HTMLSpanElement;
    functionEl: HTMLSpanElement;
    commentEl: HTMLSpanElement;
    catInputEl: HTMLInputElement;
    funcInputEl: HTMLInputElement;
    commentInputEl: HTMLInputElement;
}

export class WordNodeEl extends HTMLElement {
    type: 'word' = 'word';
    nodeId: NodeId;
    private containerEl: HTMLDivElement;
    private wordEl: HTMLDivElement;
    private commentEl: HTMLDivElement;
    private wordInputEl: HTMLInputElement;
    private commentInputEl: HTMLInputElement;
    private currentComment: string | null = null;

    constructor() {
        super();
        this.nodeId = -1;

        this.containerEl = document.createElement('div'); this.wordEl = document.createElement('div'); this.commentEl = document.createElement('div'); this.wordInputEl = document.createElement('input'); this.commentInputEl = document.createElement('input');
    }

    connectedCallback() {
        this.innerHTML = `
            <div class="word-node">
                <div class="word-comment"></div>
                <div class="word"></div>

                <input class="word-comment-input" placeholder="comentario" spellcheck="false">
                <input class="word-input" placeholder="palabra">
            </div>
        `;

        this.containerEl = this.querySelector('.word-node') as HTMLDivElement;
        this.wordEl = this.querySelector('.word') as HTMLDivElement;
        this.commentEl = this.querySelector('.word-comment') as HTMLDivElement;
        this.wordInputEl = this.querySelector('.word-input') as HTMLInputElement;
        this.commentInputEl = this.querySelector('.word-comment-input') as HTMLInputElement;
    }

    build(node: WordNode): Map<NodeId, AnyNodeEl> {
        this.nodeId = node.id;
        this.wordEl.textContent = node.word;
        
        this.setComment(node.comment);

        return new Map<NodeId, AnyNodeEl>().set(node.id, this);
    }

    setComment(comment?: string | null) {
        if (comment === undefined) {
            return;
        }
        this.currentComment = comment;
        this.commentEl.textContent = (this.currentComment) ? this.currentComment : '';
    }

    select() {
        this.classList.add('selected');
    }

    deselect() {
        this.classList.remove('selected');
    }

    startEdit(): InputFieldEls {
        this.containerEl.classList.add('editing');
        this.wordInputEl.value = this.wordEl.textContent;
        this.commentInputEl.value = this.currentComment ?? '';
        return { word: this.wordInputEl, comment: this.commentInputEl };
    }

    finishEdit(): WordNodeData {
        this.containerEl.classList.remove('editing');

        return {
            word: popContent(this.wordInputEl),
            comment: popContent(this.commentInputEl)
        };
    }
}

export interface InputFieldEls {
    category?: HTMLInputElement;
    function?: HTMLInputElement;
    word?: HTMLInputElement;
    comment: HTMLInputElement;
}

export type AnyNodeEl = RootNodeEl | SyntaxNodeEl | WordNodeEl | BoxNodeEl;

export interface WordNodeData {
    word?: string | null;
    comment?: string | null
}

function popContent(element: HTMLInputElement): string | null {
    const content = element.value || null;
    element.value = '';
    return content;
}