import { AUTOCOMPLETE_SUGGESTIONS } from "../analysis-behaviour/autocomplete-suggestions.js";
const MAX_SUGGESTIONS = 64;
export class FieldAutocomplete {
    constructor() {
        this.activeInput = null;
        this.activeField = null;
        this.activeIndex = 0;
        this.currentSuggestions = [];
        this.detachCallbacks = [];
        this.reposition = () => {
            const anchorInput = this.getAnchorInput();
            if (!anchorInput || !this.isVisible())
                return;
            this.activeInput = anchorInput;
            const rect = anchorInput.getBoundingClientRect();
            const viewportWidth = window.innerWidth - 16;
            const panelWidth = Math.min(Math.max(rect.width, 220), viewportWidth);
            const left = Math.max(8, Math.min(rect.left, viewportWidth - panelWidth));
            this.panelEl.style.left = `${left - 10}px`;
            this.panelEl.style.top = `${rect.bottom - 6}px`;
            this.panelEl.style.minWidth = `${panelWidth}px`;
        };
        this.panelEl = document.createElement('div');
        this.panelEl.className = 'autocomplete-panel';
        this.panelEl.style.display = 'none';
        this.panelEl.setAttribute('role', 'listbox');
        this.listEl = document.createElement('div');
        this.listEl.className = 'autocomplete-list';
        this.panelEl.appendChild(this.listEl);
        this.detailEl = document.createElement('div');
        this.detailEl.className = 'autocomplete-details';
        this.detailEl.setAttribute('aria-live', 'polite');
        this.panelEl.appendChild(this.detailEl);
        document.body.appendChild(this.panelEl);
        window.addEventListener('resize', this.reposition);
        window.addEventListener('scroll', this.reposition, true);
    }
    connect(elements) {
        this.disconnectFields();
        this.hide();
        if (!elements)
            return;
        this.attachInput(elements.category, 'category');
        this.attachInput(elements.function, 'function');
        this.selectIndex(0, -1);
    }
    destroy() {
        this.disconnectFields();
        this.hide();
        window.removeEventListener('resize', this.reposition);
        window.removeEventListener('scroll', this.reposition, true);
        this.panelEl.remove();
    }
    handleKeyDown(event) {
        if (!this.activeInput || !this.activeField || event.target !== this.activeInput)
            return false;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            if (!this.isVisible()) {
                this.refresh();
                return this.isVisible();
            }
            ;
            event.preventDefault();
            const delta = (event.key === 'ArrowDown') ? 1 : -1;
            this.selectIndex(this.activeIndex + delta, delta);
            return true;
        }
        if (!this.isVisible())
            return false;
        if ((event.key === 'Enter' || event.key === 'Tab')) {
            event.preventDefault();
            if (event.key === 'Enter' && this.activeInput.value.trim() === '')
                return false;
            this.acceptActiveSuggestion();
            return false;
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            this.hide();
            return true;
        }
        return false;
    }
    attachInput(input, field) {
        if (!input)
            return;
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-autocomplete', 'list');
        const onFocus = () => {
            this.hide();
            this.activeInput = input;
            this.activeField = field;
        };
        const onInput = () => this.refresh();
        const onBlur = () => {
            window.setTimeout(() => {
                if (this.activeInput === input && document.activeElement !== input)
                    this.hide();
            });
        };
        input.addEventListener('focus', onFocus);
        input.addEventListener('input', onInput);
        input.addEventListener('blur', onBlur);
        this.detachCallbacks.push(() => {
            input.removeEventListener('focus', onFocus);
            input.removeEventListener('input', onInput);
            input.removeEventListener('blur', onBlur);
            input.removeAttribute('role');
            input.removeAttribute('aria-autocomplete');
            input.removeAttribute('aria-expanded');
            input.removeAttribute('aria-activedescendant');
        });
    }
    disconnectFields() {
        for (const detach of this.detachCallbacks)
            detach();
        this.detachCallbacks = [];
        this.activeInput = null;
        this.activeField = null;
        this.currentSuggestions = [];
    }
    refresh() {
        const anchorInput = this.getAnchorInput();
        if (!anchorInput || !this.activeField)
            return;
        this.activeInput = anchorInput;
        this.currentSuggestions = getRankedSuggestions(anchorInput.value, AUTOCOMPLETE_SUGGESTIONS[this.activeField]);
        this.activeIndex = 0;
        this.render();
    }
    render() {
        const anchorInput = this.getAnchorInput();
        if (!anchorInput || this.currentSuggestions.length === 0) {
            this.hide();
            return;
        }
        this.activeInput = anchorInput;
        const options = this.currentSuggestions.map((suggestion, index) => {
            const optionEl = document.createElement('button');
            optionEl.type = 'button';
            optionEl.id = `autocomplete-option-${index}`;
            optionEl.className = 'autocomplete-option';
            optionEl.setAttribute('role', 'option');
            optionEl.setAttribute('aria-selected', String(index === this.activeIndex));
            optionEl.setAttribute('aria-label', `${suggestion.value} — ${suggestion.fullName}`);
            const valueEl = document.createElement('span');
            valueEl.className = 'autocomplete-option-value';
            valueEl.textContent = suggestion.value;
            optionEl.append(valueEl);
            optionEl.addEventListener('pointerdown', (event) => {
                event.preventDefault();
                this.acceptSuggestion(suggestion);
            });
            return optionEl;
        });
        this.listEl.replaceChildren(...options);
        anchorInput.setAttribute('aria-expanded', 'true');
        this.selectIndex(this.activeIndex);
        this.reposition();
        this.scheduleReposition();
        this.panelEl.style.display = '';
    }
    selectIndex(index, direction = 0) {
        if (this.currentSuggestions.length === 0)
            return;
        this.activeIndex = (index + this.currentSuggestions.length) % this.currentSuggestions.length;
        if (this.activeIndex !== index)
            direction *= -1;
        const options = [...this.listEl.querySelectorAll('.autocomplete-option')];
        options.forEach((optionEl, optionIndex) => {
            const isActive = optionIndex === this.activeIndex;
            optionEl.classList.toggle('active', isActive);
            optionEl.setAttribute('aria-selected', String(isActive));
            if (isActive) {
                this.activeInput?.setAttribute('aria-activedescendant', optionEl.id);
                const scrollTo = options[optionIndex + direction];
                optionEl.scrollIntoView({ block: 'nearest' });
                if (scrollTo)
                    scrollTo.scrollIntoView({ block: 'nearest' });
                else
                    optionEl.scrollIntoView({ block: 'center' });
            }
        });
        this.updateDetails();
        this.scheduleReposition();
    }
    updateDetails() {
        const suggestion = this.currentSuggestions[this.activeIndex];
        this.detailEl.replaceChildren();
        if (!suggestion) {
            this.detailEl.style.display = 'none';
            return;
        }
        const titleEl = document.createElement('div');
        titleEl.className = 'autocomplete-detail-title';
        titleEl.textContent = suggestion.value;
        const fullEl = document.createElement('div');
        fullEl.className = 'autocomplete-detail-full';
        fullEl.textContent = suggestion.fullName;
        const descriptionEl = document.createElement('div');
        descriptionEl.className = 'autocomplete-detail-description';
        descriptionEl.textContent = suggestion.description;
        this.detailEl.append(titleEl, fullEl, descriptionEl);
        this.detailEl.style.display = '';
    }
    acceptActiveSuggestion() {
        const suggestion = this.currentSuggestions[this.activeIndex];
        if (suggestion)
            this.acceptSuggestion(suggestion);
    }
    acceptSuggestion(suggestion) {
        if (!this.activeInput)
            return;
        this.activeInput.value = suggestion.value;
        this.activeInput.dispatchEvent(new Event('input', { bubbles: true }));
        this.activeInput.focus();
        this.activeInput.setSelectionRange(suggestion.value.length, suggestion.value.length);
        this.hide();
    }
    hide() {
        this.panelEl.style.display = 'none';
        this.listEl.replaceChildren();
        this.detailEl.replaceChildren();
        this.detailEl.style.display = 'none';
        this.activeIndex = 0;
        this.currentSuggestions = [];
        this.activeInput?.setAttribute('aria-expanded', 'false');
        this.activeInput?.removeAttribute('aria-activedescendant');
    }
    isVisible() {
        return this.panelEl.style.display !== 'none';
    }
    getAnchorInput() {
        const activeElement = document.activeElement;
        if (activeElement instanceof HTMLInputElement)
            return activeElement;
        return this.activeInput;
    }
    scheduleReposition() {
        this.reposition();
        requestAnimationFrame(this.reposition);
    }
}
function getRankedSuggestions(query, suggestions) {
    const normalizedQuery = normalizeSearchText(query);
    return suggestions
        .map((suggestion, index) => ({
        suggestion,
        index,
        score: scoreSuggestion(normalizedQuery, suggestion)
    }))
        .filter((result) => result.score !== null)
        .sort((a, b) => a.score - b.score || a.index - b.index)
        .slice(0, MAX_SUGGESTIONS)
        .map((result) => result.suggestion);
}
function scoreSuggestion(query, suggestion) {
    if (query === '')
        return 100;
    const primaryScore = scoreSearchText(query, suggestion.value);
    if (primaryScore !== null)
        return primaryScore;
    const secondaryScore = scoreSearchText(query, suggestion.fullName);
    if (secondaryScore !== null)
        return secondaryScore + 100;
    const descriptionScore = scoreSearchText(query, suggestion.description);
    if (descriptionScore !== null)
        return descriptionScore + 250;
    return null;
}
function scoreSearchText(query, value) {
    const normalizedValue = normalizeSearchText(value);
    if (normalizedValue === query)
        return 0;
    if (normalizedValue.startsWith(query))
        return 10 + normalizedValue.length - query.length;
    const containsIndex = normalizedValue.indexOf(query);
    if (containsIndex >= 0)
        return 35 + containsIndex + normalizedValue.length - query.length;
    const subsequenceScore = scoreSubsequence(query, normalizedValue);
    const typoScore = scoreTypo(query, normalizedValue);
    if (subsequenceScore === null)
        return typoScore;
    if (typoScore === null)
        return subsequenceScore;
    return Math.min(subsequenceScore, typoScore);
}
function scoreSubsequence(query, suggestion) {
    let suggestionIndex = 0;
    let score = 55;
    let previousMatchIndex = -1;
    for (const char of query) {
        const matchIndex = suggestion.indexOf(char, suggestionIndex);
        if (matchIndex < 0)
            return null;
        if (previousMatchIndex >= 0)
            score += Math.max(0, matchIndex - previousMatchIndex - 1);
        previousMatchIndex = matchIndex;
        suggestionIndex = matchIndex + 1;
    }
    return score + suggestion.length - query.length;
}
function scoreTypo(query, suggestion) {
    const maxDistance = (query.length <= 4) ? 1 : 2;
    const suggestionStart = suggestion.slice(0, Math.max(query.length, Math.min(suggestion.length, query.length + 1)));
    const fullDistance = boundedLevenshtein(query, suggestion, maxDistance);
    const startDistance = boundedLevenshtein(query, suggestionStart, maxDistance);
    const distance = Math.min(fullDistance, startDistance);
    if (distance > maxDistance)
        return null;
    return 80 + distance * 12 + suggestion.length - query.length;
}
function boundedLevenshtein(a, b, maxDistance) {
    if (Math.abs(a.length - b.length) > maxDistance)
        return maxDistance + 1;
    let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i++) {
        const current = [i];
        let rowMin = current[0];
        for (let j = 1; j <= b.length; j++) {
            const substitutionCost = (a[i - 1] === b[j - 1]) ? 0 : 1;
            const value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + substitutionCost);
            current[j] = value;
            rowMin = Math.min(rowMin, value);
        }
        if (rowMin > maxDistance)
            return maxDistance + 1;
        previous = current;
    }
    return previous[b.length];
}
function normalizeSearchText(text) {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
}
//# sourceMappingURL=autocomplete.js.map