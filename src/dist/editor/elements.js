class BoxNodeEl extends HTMLElement {
    constructor() {
        super();
        this.type = 'box';
        this.nodeId = -1;
    }
    build(node) {
        this.nodeId = node.id;
        return this.renderInside(node.contents).set(node.id, this);
    }
    renderInside(contents) {
        let elementMap = new Map();
        this.childrenEl.replaceChildren();
        for (const child of contents) {
            if (child.type === 'word') {
                const wordEl = document.createElement('word-node');
                this.childrenEl.appendChild(wordEl);
                const innerMap = wordEl.build(child);
                elementMap = new Map([...elementMap, ...innerMap]);
                continue;
            }
            const childEl = document.createElement('syntax-node');
            this.childrenEl.appendChild(childEl);
            const innerMap = childEl.build(child);
            elementMap = new Map([...elementMap, ...innerMap]);
        }
        return elementMap;
    }
}
export class RootNodeEl extends BoxNodeEl {
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
        this.childrenEl = this.querySelector('.children');
    }
}
export class SyntaxNodeEl extends BoxNodeEl {
    constructor() {
        super();
        this.childrenEl = document.createElement('div');
        this.analysisEl = document.createElement('div');
        this.analysisElInside = { categoryEl: document.createElement('span'), slashEl: document.createElement('span'), functionEl: document.createElement('span'), commentEl: document.createElement('span'), catInputEl: document.createElement('input'), funcInputEl: document.createElement('input'), commentInputEl: document.createElement('input') };
    }
    connectedCallback() {
        this.innerHTML = `
            <div class="syntax-node">
                <div class="children"></div>
                <div class="line">
                    <button class="resize-handle start" type="button" aria-label="Redimensionar desde el inicio" title="Arrastrar para redimensionar desde el inicio"></button>
                    <button class="resize-handle end" type="button" aria-label="Redimensionar desde el final" title="Arrastrar para redimensionar desde el final"></button>
                </div>
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
        this.childrenEl = this.querySelector('.children');
        this.analysisEl = this.querySelector('.analysis');
        this.analysisElInside = {
            categoryEl: this.analysisEl.querySelector('.category'),
            slashEl: this.analysisEl.querySelector('.slash'),
            functionEl: this.analysisEl.querySelector('.function'),
            commentEl: this.analysisEl.querySelector('.comment'),
            catInputEl: this.analysisEl.querySelector('.category-input'),
            funcInputEl: this.analysisEl.querySelector('.function-input'),
            commentInputEl: this.analysisEl.querySelector('.comment-input')
        };
    }
    build(node) {
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
    setAnalysis(analysis) {
        const newCateg = analysis.category;
        const newFunc = analysis.function;
        const newComment = analysis.comment;
        const slashVisible = (!!newCateg && !!newFunc);
        this.analysisElInside.slashEl.style.display = (slashVisible) ? '' : 'none';
        const commentVisible = !!newComment;
        this.analysisElInside.commentEl.style.display = (commentVisible) ? '' : 'none';
        const commentMargin = (commentVisible && (!!newCateg || !!newFunc));
        if (commentMargin)
            this.analysisElInside.commentEl.classList.add('left-margin');
        else
            this.analysisElInside.commentEl.classList.remove('left-margin');
        this.analysisElInside.categoryEl.textContent = newCateg ?? '';
        this.analysisElInside.functionEl.textContent = newFunc ?? '';
        this.analysisElInside.commentEl.textContent = newComment ?? '';
    }
    startEdit() {
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
    finishEdit() {
        this.analysisEl.classList.remove('editing');
        const newAnalysis = {
            category: popContent(this.analysisElInside.catInputEl),
            function: popContent(this.analysisElInside.funcInputEl),
            comment: popContent(this.analysisElInside.commentInputEl),
        };
        return newAnalysis;
    }
}
export class WordNodeEl extends HTMLElement {
    constructor() {
        super();
        this.type = 'word';
        this.currentComment = null;
        this.nodeId = -1;
        this.containerEl = document.createElement('div');
        this.wordEl = document.createElement('div');
        this.commentEl = document.createElement('div');
        this.wordInputEl = document.createElement('input');
        this.commentInputEl = document.createElement('input');
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
        this.containerEl = this.querySelector('.word-node');
        this.wordEl = this.querySelector('.word');
        this.commentEl = this.querySelector('.word-comment');
        this.wordInputEl = this.querySelector('.word-input');
        this.commentInputEl = this.querySelector('.word-comment-input');
    }
    build(node) {
        this.nodeId = node.id;
        this.wordEl.textContent = node.word;
        this.setComment(node.comment);
        return new Map().set(node.id, this);
    }
    setComment(comment) {
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
    startEdit() {
        this.containerEl.classList.add('editing');
        this.wordInputEl.value = this.wordEl.textContent;
        this.commentInputEl.value = this.currentComment ?? '';
        return { word: this.wordInputEl, comment: this.commentInputEl };
    }
    finishEdit() {
        this.containerEl.classList.remove('editing');
        return {
            word: popContent(this.wordInputEl),
            comment: popContent(this.commentInputEl)
        };
    }
}
function popContent(element) {
    const content = element.value || null;
    element.value = '';
    return content;
}
//# sourceMappingURL=elements.js.map