import { SyntaxNode, WordNode, RootNode } from "./tree";

abstract class BoxNodeEl extends HTMLElement {
    type = 'box';
    protected abstract childrenEl: HTMLDivElement;

    constructor() {
        super();
    }

    build(node: SyntaxNode | RootNode) {
        this.id = `node ${node.id}`;

        this.renderInside(node.contents);
    }

    renderInside(contents: (SyntaxNode | WordNode)[]) {
        this.childrenEl.replaceChildren();
        for (const child of contents) {
            if (child.type === 'word') {
                const wordEl = document.createElement('word-node') as WordNodeEl;
                wordEl.build(child);
                this.childrenEl.appendChild(wordEl);
                continue;
            }
            const childEl = document.createElement('syntax-node') as SyntaxNodeEl;
            childEl.build(child);
            this.childrenEl.appendChild(childEl);
        }
    }
}

export class RootNodeEl extends BoxNodeEl {
    protected childrenEl: HTMLDivElement;

    constructor() {
        super();
        this.innerHTML = `
            <div class = "root-node">
                <div class = "children"></div>
            </div>
        `;
        this.childrenEl = this.querySelector('.children') as HTMLDivElement;
    }
}

export class SyntaxNodeEl extends BoxNodeEl {
    protected childrenEl: HTMLDivElement;
    private analysisEl: HTMLDivElement;
    private analysisElInside: AnalysisEls;
    private currentAnalysis: AnalysisData = { category: null, function: null, comment: null };

    constructor() {
        super();

        this.innerHTML = `
            <div class = "syntax-node">
                <div class = "children"></div>
                <div class = "line"></div>
                <div class = "analysis">
                    <span class = "category" style="display: none"></span>
                    <span class = "slash" style="display: none">/</span>
                    <span class = "function" style="display: none"></span>
                    <span class = "comment" style="display: none"></span>
                </div>
            </div>
        `;

        this.childrenEl = this.querySelector('.children') as HTMLDivElement;
        this.analysisEl = this.querySelector('.analysis') as HTMLDivElement;
        this.analysisElInside = {
            categoryEl: this.analysisEl.querySelector('.category') as HTMLSpanElement,
            slashEl: this.analysisEl.querySelector('.slash') as HTMLSpanElement,
            functionEl: this.analysisEl.querySelector('.function') as HTMLSpanElement,
            commentEl: this.analysisEl.querySelector('.comment') as HTMLSpanElement
        };
    }

    build(node: SyntaxNode) {
        super.build(node);

        const analysis = { category: node.category, function: node.function, comment: node.comment };
        this.setAnalysis(analysis);
    }

    setAnalysis(analysis: AnalysisData) { // Implemented in a way that undefined values won't overwrite existing values
        function newAnalysisPart(currentPart?: string | null, newPart?: string | null): string | null {
            if (newPart === null) {
                return null;
            } else if (newPart === undefined) {
                return (!currentPart) ? null : currentPart;
            }
            return newPart;
        }
        const newCateg = newAnalysisPart(this.currentAnalysis.category, analysis.category);
        const newFunc = newAnalysisPart(this.currentAnalysis.function, analysis.function);
        const newComment = newAnalysisPart(this.currentAnalysis.comment, analysis.comment);

        this.currentAnalysis = { category: newCateg, function: newFunc, comment: newComment };

        const slashVisible = (!!newCateg && !!newFunc);
        this.analysisElInside.slashEl.style.display = (slashVisible) ? '' : 'none';
        const commentVisible = !!newComment;
        this.analysisElInside.commentEl.style.display = (commentVisible) ? '' : 'none';

        this.analysisElInside.categoryEl.textContent = newCateg ?? '';
        this.analysisElInside.functionEl.textContent = newFunc ?? '';
        this.analysisElInside.commentEl.textContent = newComment ?? '';
    }
}

export interface AnalysisData {
    category?: string | null;
    function?: string | null;
    comment?: string | null;
}

interface AnalysisEls {
    categoryEl: HTMLSpanElement;
    slashEl: HTMLSpanElement;
    functionEl: HTMLSpanElement;
    commentEl: HTMLSpanElement;
}

export class WordNodeEl extends HTMLElement {
    type = 'word';
    private wordEl: HTMLDivElement;
    private commentEl: HTMLDivElement;
    private currentComment: string | null = null;

    constructor() {
        super();

        this.innerHTML = `
            <div class = "word-node">
                <div class = "comment"></div>
                <div class = "word"></div>
            </div>
        `;

        this.wordEl = this.querySelector('.word') as HTMLDivElement;
        this.commentEl = this.querySelector('.comment') as HTMLDivElement;
    }

    build(node: WordNode) {
        this.id = `node ${node.id}`;
        this.wordEl.textContent = node.word;
        this.currentComment = (node.comment) ? node.comment : null;
        this.commentEl.textContent = (this.currentComment) ? this.currentComment : '';
    }

    setComment(comment?: string | null) {
        if (comment === undefined) {
            return;
        }
        this.currentComment = comment;
        this.commentEl.textContent = (this.currentComment) ? this.currentComment : '';
    }
}

