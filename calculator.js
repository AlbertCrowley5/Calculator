class Calculator {
    constructor() {
        this.currentInput  = '';
        this.cursorPos     = 0;
        this.lastAnswer    = null;
        this.shiftActive   = false;
        this.resultShown   = false;
        this.activeInput   = null;
        this.calcHistory   = [];
        this.memoryValue   = 0;
        this.angleMode     = 'deg';
        this.initializeModeSwitching();
        this.initializeTheme();
        this.setupSolverInputTracking();
    }

    // ── Theme ────────────────────────────────────────────────
    initializeTheme() {
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                const html = document.documentElement;
                const isDark = html.getAttribute('data-theme') === 'dark';
                html.setAttribute('data-theme', isDark ? 'light' : 'dark');
                toggle.querySelector('.theme-icon').textContent = isDark ? '🌙' : '☀️';
            });
        }
    }

    // ── Mode switching ───────────────────────────────────────
    initializeModeSwitching() {
        document.querySelectorAll('.mode-item').forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchMode(btn.getAttribute('data-mode'), btn);
            });
        });
    }

    switchMode(mode, clickedBtn) {
        document.querySelectorAll('.mode-item').forEach(b => b.classList.remove('active'));
        if (clickedBtn) clickedBtn.classList.add('active');
        document.querySelectorAll('.calculator-mode').forEach(m => m.classList.remove('active'));
        const modeEl = document.getElementById(`${mode}-mode`);
        if (modeEl) modeEl.classList.add('active');

        const names = {
            basic: 'Standard Calculator', equation: 'Equation Solver',
            quadratic: 'Quadratic Solver', simultaneous: 'Simultaneous Equations',
            function: 'Function Evaluator'
        };
        const indicator = document.getElementById('mode-indicator');
        if (indicator) indicator.textContent = names[mode] || mode;
        this.clearSolutions();

        if (mode !== 'basic') {
            setTimeout(() => {
                const firstInput = modeEl?.querySelector('.solver-input');
                if (firstInput) { firstInput.focus(); this.activeInput = firstInput; }
            }, 60);
        }
    }

    clearSolutions() {
        document.querySelectorAll('.solution-display').forEach(sol => {
            sol.classList.remove('show'); sol.innerHTML = '';
        });
    }

    // ── Solver input focus tracking ──────────────────────────
    setupSolverInputTracking() {
        document.querySelectorAll('.solver-input').forEach(input => {
            input.addEventListener('focus', () => { this.activeInput = input; });
        });
    }

    // ── Visual renderer ──────────────────────────────────────
    renderDisplay() {
        const el = document.getElementById('display');
        if (!el) return;

        if (this.resultShown) {
            el.textContent = this.currentInput || '0';
            el.classList.add('result-mode');
            return;
        }
        el.classList.remove('result-mode');
        el.innerHTML = this.currentInput
            ? this.renderToHtml(this.currentInput, this.cursorPos)
            : '<span class="disp-cursor"></span>';
    }

    renderToHtml(str, cur) {
        let html = '';
        let i = 0;

        while (i <= str.length) {
            if (cur === i) html += '<span class="disp-cursor"></span>';
            if (i === str.length) break;

            const rest = str.slice(i);
            const ch = str[i];

            // ── frac(NUM,DEN) ──────────────────────────────
            if (rest.startsWith('frac(')) {
                const openIdx = i + 4;
                const closeIdx = this.findMatchingParen(str, openIdx);
                if (closeIdx === -1) {
                    // unmatched — show literal frac( and continue
                    html += '<span class="disp-fn">frac</span>(';
                    i += 5; continue;
                }
                const inner = str.slice(openIdx + 1, closeIdx);
                const commaIdx = this.findTopLevelComma(inner);
                const numStr = commaIdx === -1 ? inner : inner.slice(0, commaIdx);
                const denStr = commaIdx === -1 ? '' : inner.slice(commaIdx + 1);
                const numStart = openIdx + 1;
                const denStart = numStart + numStr.length + 1;
                const numCur = (cur >= numStart && cur <= numStart + numStr.length) ? cur - numStart : -1;
                const denCur = (cur >= denStart && cur <= denStart + denStr.length) ? cur - denStart : -1;
                const numHtml = numStr
                    ? this.renderToHtml(numStr, numCur)
                    : (numCur === 0 ? '<span class="disp-cursor"></span>' : '<span class="disp-slot">■</span>');
                const denHtml = denStr
                    ? this.renderToHtml(denStr, denCur)
                    : (denCur === 0 ? '<span class="disp-cursor"></span>' : '<span class="disp-slot">■</span>');
                html += `<span class="disp-frac"><span class="disp-num">${numHtml}</span><span class="disp-den">${denHtml}</span></span>`;
                i = closeIdx + 1; continue;
            }

            // ── sqrt(CONTENT) ──────────────────────────────
            if (rest.startsWith('sqrt(')) {
                const openIdx = i + 4;
                const closeIdx = this.findMatchingParen(str, openIdx);
                const innerStart = openIdx + 1;
                let inner, endIdx;
                if (closeIdx === -1) {
                    inner = str.slice(innerStart); endIdx = str.length;
                } else {
                    inner = str.slice(innerStart, closeIdx); endIdx = closeIdx + 1;
                }
                const innerCur = (cur >= innerStart && cur <= innerStart + inner.length) ? cur - innerStart : -1;
                const innerHtml = inner
                    ? this.renderToHtml(inner, innerCur)
                    : (innerCur === 0 ? '<span class="disp-cursor"></span>' : '<span class="disp-slot">■</span>');
                html += `<span class="disp-sqrt"><span class="disp-sqrt-sign">√</span><span class="disp-sqrt-body">${innerHtml}</span></span>`;
                i = endIdx; continue;
            }

            // ── abs(CONTENT) ───────────────────────────────
            if (rest.startsWith('abs(')) {
                const openIdx = i + 3;
                const closeIdx = this.findMatchingParen(str, openIdx);
                if (closeIdx === -1) { html += '<span class="disp-fn">|</span>'; i += 4; continue; }
                const inner = str.slice(openIdx + 1, closeIdx);
                const innerStart = openIdx + 1;
                const innerCur = (cur >= innerStart && cur <= innerStart + inner.length) ? cur - innerStart : -1;
                const innerHtml = inner ? this.renderToHtml(inner, innerCur) : '';
                html += `<span class="disp-abs">|<span class="disp-abs-body">${innerHtml}</span>|</span>`;
                i = closeIdx + 1; continue;
            }

            // ── Named functions (longest match first) ──────
            const fnRx = /^(asin|acos|atan|log10|log|sin|cos|tan)\(/;
            const fnMatch = rest.match(fnRx);
            if (fnMatch) {
                const fname = fnMatch[1];
                const dname = { asin:'sin⁻¹', acos:'cos⁻¹', atan:'tan⁻¹', log10:'log', log:'ln' }[fname] || fname;
                const openIdx = i + fname.length;
                const closeIdx = this.findMatchingParen(str, openIdx);
                if (closeIdx === -1) {
                    html += `<span class="disp-fn">${dname}</span>(`;
                    i += fname.length + 1; continue;
                }
                const inner = str.slice(openIdx + 1, closeIdx);
                const innerStart = openIdx + 1;
                const innerCur = (cur >= innerStart && cur <= innerStart + inner.length) ? cur - innerStart : -1;
                const innerHtml = inner
                    ? this.renderToHtml(inner, innerCur)
                    : (innerCur === 0 ? '<span class="disp-cursor"></span>' : '');
                html += `<span class="disp-fn">${dname}</span>(<span class="disp-fn-body">${innerHtml}</span>)`;
                i = closeIdx + 1; continue;
            }

            // ── Power: ^(...) or ^char ──────────────────────
            if (ch === '^') {
                if (i + 1 < str.length && str[i + 1] === '(') {
                    const closeIdx = this.findMatchingParen(str, i + 1);
                    if (closeIdx === -1) {
                        // open superscript — rest goes in sup
                        const innerStart = i + 2;
                        const innerStr = str.slice(innerStart);
                        const innerCur = cur >= innerStart ? cur - innerStart : -1;
                        html += `<sup>${innerStr ? this.renderToHtml(innerStr, innerCur) : (innerCur === 0 ? '<span class="disp-cursor"></span>' : '')}</sup>`;
                        i = str.length; continue;
                    }
                    const inner = str.slice(i + 2, closeIdx);
                    const innerStart = i + 2;
                    const innerCur = (cur >= innerStart && cur <= innerStart + inner.length) ? cur - innerStart : -1;
                    const innerHtml = inner
                        ? this.renderToHtml(inner, innerCur)
                        : (innerCur === 0 ? '<span class="disp-cursor"></span>' : '<span class="disp-slot">□</span>');
                    html += `<sup>${innerHtml}</sup>`;
                    i = closeIdx + 1;
                } else {
                    // single-char exponent
                    const nc = str[i + 1] || '';
                    html += '<sup>';
                    if (cur === i + 1) html += '<span class="disp-cursor"></span>';
                    html += this.escapeHtml(nc);
                    if (cur === i + 2) html += '<span class="disp-cursor"></span>';
                    html += '</sup>';
                    i += 2;
                }
                continue;
            }

            // ── Special replacements ────────────────────────
            if (rest.startsWith('pi'))  { html += 'π'; i += 2; continue; }
            if (ch === '*') { html += '<span class="disp-op">×</span>'; i++; continue; }
            if (ch === '/') { html += '<span class="disp-op">÷</span>'; i++; continue; }
            if (ch === '-') { html += '<span class="disp-op">−</span>'; i++; continue; }
            if (ch === '+') { html += '<span class="disp-op">+</span>'; i++; continue; }

            html += this.escapeHtml(ch);
            i++;
        }
        return html;
    }

    findMatchingParen(str, parenIdx) {
        let depth = 0;
        for (let i = parenIdx; i < str.length; i++) {
            if (str[i] === '(') depth++;
            else if (str[i] === ')') { depth--; if (depth === 0) return i; }
        }
        return -1;
    }

    findTopLevelComma(str) {
        let depth = 0;
        for (let i = 0; i < str.length; i++) {
            if (str[i] === '(') depth++;
            else if (str[i] === ')') depth--;
            else if (str[i] === ',' && depth === 0) return i;
        }
        return -1;
    }

    // ── Cursor-aware insertion ────────────────────────────────
    insertAtCursor(value) {
        const before = this.currentInput.slice(0, this.cursorPos);
        const after  = this.currentInput.slice(this.cursorPos);
        this.currentInput = before + value + after;
        this.cursorPos += value.length;
    }

    appendToDisplay(value) {
        if (this.resultShown) {
            const isChainOp = /^[+\-*/^]/.test(value);
            if (!isChainOp) { this.currentInput = ''; this.cursorPos = 0; }
            this.resultShown = false;
        }
        this.insertAtCursor(value);
        this.renderDisplay();
    }

    clear() {
        this.currentInput = ''; this.cursorPos = 0; this.resultShown = false;
        this.renderDisplay();
        const prev = document.getElementById('display-prev');
        if (prev) prev.textContent = '';
    }

    backspace() {
        if (this.resultShown) { this.clear(); return; }
        if (this.cursorPos === 0) return;

        // Delete whole atoms (multi-char tokens) at once
        const before = this.currentInput.slice(0, this.cursorPos);
        const atoms = ['asin(','acos(','atan(','log10(','sqrt(','sin(','cos(','tan(',
                        'log(','abs(','frac(','pi','10^(','e^('];
        let eaten = false;
        for (const atom of atoms) {
            if (before.endsWith(atom)) {
                this.currentInput = before.slice(0, -atom.length) + this.currentInput.slice(this.cursorPos);
                this.cursorPos -= atom.length;
                eaten = true; break;
            }
        }
        if (!eaten) {
            this.currentInput = before.slice(0, -1) + this.currentInput.slice(this.cursorPos);
            this.cursorPos--;
        }
        this.renderDisplay();
    }

    // ── ANS ──────────────────────────────────────────────────
    appendAns() {
        if (this.lastAnswer === null || this.lastAnswer === undefined) return;
        const s = String(this.lastAnswer);
        if (this.resultShown) {
            this.currentInput = s; this.cursorPos = s.length; this.resultShown = false;
        } else {
            this.insertAtCursor(s);
        }
        this.renderDisplay();
    }

    // ── 2nd / Shift ───────────────────────────────────────────
    toggleShift() {
        this.shiftActive = !this.shiftActive;
        document.getElementById('shift-btn')?.classList.toggle('active', this.shiftActive);
        document.getElementById('keyboard-wrap')?.classList.toggle('shifted', this.shiftActive);
    }

    pressFunction(fn) {
        const s = this.shiftActive;
        // [insert string, cursorBackOffset from end]
        const map = {
            sin:  s ? ['asin()', 1] : ['sin()', 1],
            cos:  s ? ['acos()', 1] : ['cos()', 1],
            tan:  s ? ['atan()', 1] : ['tan()', 1],
            log:  s ? ['10^()', 1]  : ['log10()', 1],
            ln:   s ? ['e^()', 1]   : ['log()', 1],
            sqrt: s ? ['^(2)', 2]   : ['sqrt()', 1],
        };
        const entry = map[fn];
        if (!entry) return;
        const [insertStr, backOffset] = entry;
        if (this.shiftActive) this.toggleShift();
        if (this.resultShown) { this.currentInput = ''; this.cursorPos = 0; this.resultShown = false; }
        const before = this.currentInput.slice(0, this.cursorPos);
        const after  = this.currentInput.slice(this.cursorPos);
        this.currentInput = before + insertStr + after;
        this.cursorPos += insertStr.length - backOffset;
        this.renderDisplay();
    }

    insertFraction() {
        if (this.resultShown) { this.currentInput = ''; this.cursorPos = 0; this.resultShown = false; }
        const before = this.currentInput.slice(0, this.cursorPos);
        const after  = this.currentInput.slice(this.cursorPos);
        this.currentInput = before + 'frac(,)' + after;
        this.cursorPos += 5; // cursor in numerator, after 'frac('
        this.renderDisplay();
    }

    insertPower() {
        if (this.resultShown) { this.currentInput = ''; this.cursorPos = 0; this.resultShown = false; }
        const before = this.currentInput.slice(0, this.cursorPos);
        const after  = this.currentInput.slice(this.cursorPos);
        this.currentInput = before + '^()' + after;
        this.cursorPos += 2; // cursor inside ^(|)
        this.renderDisplay();
    }

    insertAbs() {
        if (this.resultShown) { this.currentInput = ''; this.cursorPos = 0; this.resultShown = false; }
        const before = this.currentInput.slice(0, this.cursorPos);
        const after  = this.currentInput.slice(this.cursorPos);
        this.currentInput = before + 'abs()' + after;
        this.cursorPos += 4; // inside abs(|)
        this.renderDisplay();
    }

    moveCursorPastDelimiter() {
        const str = this.currentInput;
        let depth = 0;
        for (let i = this.cursorPos; i < str.length; i++) {
            if (str[i] === '(') depth++;
            else if (str[i] === ')') {
                if (depth === 0) { this.cursorPos = i + 1; this.renderDisplay(); return; }
                depth--;
            } else if (str[i] === ',' && depth === 0) {
                this.cursorPos = i + 1; this.renderDisplay(); return;
            }
        }
    }

    toggleSign() {
        if (!this.currentInput) return;
        if (this.currentInput.startsWith('-')) {
            this.currentInput = this.currentInput.slice(1);
            this.cursorPos = Math.max(0, this.cursorPos - 1);
        } else {
            this.currentInput = '-' + this.currentInput;
            this.cursorPos++;
        }
        this.renderDisplay();
    }

    // ── Calculate ─────────────────────────────────────────────
    calculate() {
        try {
            if (!this.currentInput) return;
            const expression = this.currentInput;

            const scope = { frac: (a, b) => a / b };
            if (this.angleMode === 'deg') {
                Object.assign(scope, {
                    sin:  x => Math.sin(x * Math.PI / 180),
                    cos:  x => Math.cos(x * Math.PI / 180),
                    tan:  x => Math.tan(x * Math.PI / 180),
                    asin: x => Math.asin(x) * 180 / Math.PI,
                    acos: x => Math.acos(x) * 180 / Math.PI,
                    atan: x => Math.atan(x) * 180 / Math.PI,
                });
            } else {
                scope.frac = (a, b) => a / b;
            }

            let result = math.evaluate(expression, scope);

            const prevEl = document.getElementById('display-prev');
            if (prevEl) prevEl.textContent = expression + ' =';

            this.currentInput = String(result);
            this.cursorPos    = this.currentInput.length;
            this.lastAnswer   = result;
            this.resultShown  = true;
            this.renderDisplay();

            const ansEl = document.getElementById('display-ans');
            if (ansEl) ansEl.textContent = `Ans = ${result}`;

            this.addToCalcHistory(expression, result);

        } catch {
            const el = document.getElementById('display');
            if (el) { el.textContent = 'Error'; el.classList.add('result-mode'); }
            setTimeout(() => this.clear(), 1500);
        }
    }

    // ── Memory ────────────────────────────────────────────────
    memoryClear() { this.memoryValue = 0; this.updateMemoryDisplay(); }

    memoryRecall() { this.appendToDisplay(String(this.memoryValue)); }

    memoryAdd() {
        const v = this.resultShown ? parseFloat(this.currentInput) : 0;
        this.memoryValue += (isNaN(v) ? 0 : v);
        this.updateMemoryDisplay();
    }

    memorySubtract() {
        const v = this.resultShown ? parseFloat(this.currentInput) : 0;
        this.memoryValue -= (isNaN(v) ? 0 : v);
        this.updateMemoryDisplay();
    }

    updateMemoryDisplay() {
        const el = document.getElementById('memory-display');
        if (!el) return;
        el.textContent = `M: ${this.memoryValue}`;
        el.classList.toggle('has-value', this.memoryValue !== 0);
        el.classList.add('flash');
        setTimeout(() => el.classList.remove('flash'), 400);
    }

    // ── Angle mode ────────────────────────────────────────────
    setAngleMode(mode) {
        this.angleMode = mode;
        document.getElementById('deg-btn')?.classList.toggle('active', mode === 'deg');
        document.getElementById('rad-btn')?.classList.toggle('active', mode === 'rad');
    }

    // ── Clipboard ─────────────────────────────────────────────
    copyResult() {
        if (!this.resultShown || !this.currentInput) return;
        navigator.clipboard.writeText(this.currentInput).then(() => {
            const btn = document.getElementById('copy-btn');
            if (btn) { const o = btn.textContent; btn.textContent = '✓ Copied!'; setTimeout(() => btn.textContent = o, 2000); }
        }).catch(() => {});
    }

    // ── History ───────────────────────────────────────────────
    addToCalcHistory(expression, result) {
        this.calcHistory.unshift({ expression, result });
        if (this.calcHistory.length > 50) this.calcHistory.pop();
        this.renderHistory();
    }

    clearHistory() { this.calcHistory = []; this.renderHistory(); }

    renderHistory() {
        const list  = document.getElementById('history-list');
        const count = document.getElementById('history-count');
        if (!list) return;
        const n = this.calcHistory.length;
        if (count) count.textContent = `${n} ${n === 1 ? 'entry' : 'entries'}`;
        if (n === 0) {
            list.innerHTML = `<div class="hist-empty"><div class="empty-icon">📈</div><p>No calculations yet</p><p class="empty-sub">Results appear here</p></div>`;
            return;
        }
        list.innerHTML = this.calcHistory.map((item, i) => `
            <div class="history-item" onclick="calculator.loadFromHistory(${i})">
                <div class="history-expr">${this.escapeHtml(String(item.expression))}</div>
                <div class="history-result">= ${item.result}</div>
            </div>`).join('');
    }

    escapeHtml(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    loadFromHistory(index) {
        const item = this.calcHistory[index];
        if (!item) return;
        this.currentInput = String(item.result);
        this.cursorPos    = this.currentInput.length;
        this.resultShown  = false;
        this.renderDisplay();
        const prev = document.getElementById('display-prev');
        if (prev) prev.textContent = item.expression + ' =';
    }

    // ── Solver math keyboard helpers ──────────────────────────
    appendToInput(value) {
        const input = this.activeInput;
        if (!input) return;
        const start = input.selectionStart ?? input.value.length;
        const end   = input.selectionEnd   ?? input.value.length;
        input.value = input.value.slice(0, start) + value + input.value.slice(end);
        const pos = start + value.length;
        input.focus(); input.setSelectionRange(pos, pos);
    }

    appendAnsToInput() {
        if (this.lastAnswer === null || this.lastAnswer === undefined) return;
        this.appendToInput(String(this.lastAnswer));
    }

    backspaceInput() {
        const input = this.activeInput;
        if (!input) return;
        const s = input.selectionStart, e = input.selectionEnd;
        if (s !== e) {
            input.value = input.value.slice(0, s) + input.value.slice(e);
            input.focus(); input.setSelectionRange(s, s);
        } else if (s > 0) {
            input.value = input.value.slice(0, s - 1) + input.value.slice(s);
            input.focus(); input.setSelectionRange(s - 1, s - 1);
        } else { input.focus(); }
    }

    clearInput() {
        const input = this.activeInput;
        if (!input) return;
        input.value = ''; input.focus();
    }

    // ── Equation Solver ───────────────────────────────────────
    solveEquation() {
        const equationInput = document.getElementById('equation-input').value.trim();
        const solutionDiv   = document.getElementById('equation-solution');
        if (!equationInput) { this.showError(solutionDiv, 'Please enter an equation'); return; }
        try {
            let equation = equationInput.replace(/\s/g, '');
            const parts = equation.split('=');
            if (parts.length !== 2) throw new Error('Equation must contain exactly one = sign');
            const leftSide = parts[0], rightSide = parts[1];
            const expression = `${leftSide} - (${rightSide})`;
            const variables = this.findVariables(expression);
            if (variables.length === 0) throw new Error('No variable found in equation');
            const variable = variables[0];
            let solutions = [];
            const steps = [];
            steps.push(`Original equation: ${leftSide} = ${rightSide}`);
            steps.push(`Rearranged: ${expression} = 0`);
            const simplified = math.simplify(expression);
            steps.push(`Simplified: ${simplified.toString()} = 0`);
            if (this.isLinear(expression, variable)) {
                const sol = this.solveLinear(leftSide, rightSide, variable);
                solutions.push(sol);
                steps.push(`Solving for ${variable}: ${variable} = ${sol}`);
            } else {
                const foundSolutions = new Set();
                for (const start of [-10, -1, 0, 1, 10]) {
                    try {
                        const sol = this.newtonRaphson(expression, variable, start);
                        if (sol !== null && !isNaN(sol)) foundSolutions.add(Math.round(sol * 1e10) / 1e10);
                    } catch {}
                }
                solutions = Array.from(foundSolutions);
                if (solutions.length > 0) steps.push('Found solution(s) using numerical methods:');
            }
            if (solutions.length === 0) throw new Error('No solutions found');
            this.displaySolution(solutionDiv, solutions, steps, variable);
        } catch (error) { this.showError(solutionDiv, error.message); }
    }

    // ── Quadratic Solver ──────────────────────────────────────
    solveQuadratic() {
        const solutionDiv = document.getElementById('quadratic-solution');
        let a, b, c;
        const equationInput = document.getElementById('quad-equation').value.trim();
        if (equationInput) {
            try { const coeffs = this.parseQuadratic(equationInput); a = coeffs.a; b = coeffs.b; c = coeffs.c; }
            catch (error) { this.showError(solutionDiv, error.message); return; }
        } else {
            a = parseFloat(document.getElementById('quad-a').value) || 0;
            b = parseFloat(document.getElementById('quad-b').value) || 0;
            c = parseFloat(document.getElementById('quad-c').value) || 0;
        }
        if (a === 0) { this.showError(solutionDiv, 'Coefficient a cannot be 0 for a quadratic equation'); return; }
        const steps = [];
        steps.push(`Equation: ${a}x² + ${b}x + ${c} = 0`);
        steps.push('Using quadratic formula: x = (-b ± √(b² - 4ac)) / 2a');
        const discriminant = b * b - 4 * a * c;
        steps.push(`Discriminant: Δ = ${b}² - 4(${a})(${c}) = ${discriminant}`);
        const solutions = [];
        if (discriminant > 0) {
            steps.push('Δ > 0: Two distinct real solutions');
            const x1 = (-b + Math.sqrt(discriminant)) / (2 * a);
            const x2 = (-b - Math.sqrt(discriminant)) / (2 * a);
            steps.push(`x₁ = ${x1}`); steps.push(`x₂ = ${x2}`);
            solutions.push(x1, x2);
        } else if (discriminant === 0) {
            steps.push('Δ = 0: One repeated real solution');
            const x = -b / (2 * a);
            steps.push(`x = ${x}`); solutions.push(x);
        } else {
            steps.push('Δ < 0: Two complex solutions');
            const r = -b / (2 * a), im = Math.sqrt(-discriminant) / (2 * a);
            steps.push(`x₁ = ${r} + ${im}i`); steps.push(`x₂ = ${r} - ${im}i`);
            solutions.push(`${r} + ${im}i`, `${r} - ${im}i`);
        }
        const h = -b / (2 * a), k = a * h * h + b * h + c;
        steps.push(`Vertex: (${h}, ${k})`);
        this.displaySolution(solutionDiv, solutions, steps, 'x');
    }

    // ── Simultaneous Equations ────────────────────────────────
    solveSimultaneous() {
        const eq1 = document.getElementById('sim-eq1').value.trim();
        const eq2 = document.getElementById('sim-eq2').value.trim();
        const solutionDiv = document.getElementById('simultaneous-solution');
        if (!eq1 || !eq2) { this.showError(solutionDiv, 'Please enter both equations'); return; }
        try {
            const steps = [];
            steps.push(`Equation 1: ${eq1}`); steps.push(`Equation 2: ${eq2}`);
            const p1 = this.parseLinearEquation(eq1), p2 = this.parseLinearEquation(eq2);
            steps.push('Standard form:');
            steps.push(`${p1.xCoeff}x + ${p1.yCoeff}y = ${p1.constant}`);
            steps.push(`${p2.xCoeff}x + ${p2.yCoeff}y = ${p2.constant}`);
            const [a1,b1,c1] = [p1.xCoeff,p1.yCoeff,p1.constant];
            const [a2,b2,c2] = [p2.xCoeff,p2.yCoeff,p2.constant];
            const det = a1*b2 - a2*b1;
            if (det === 0) throw new Error('System has no unique solution (lines are parallel or coincident)');
            steps.push("Using Cramer's Rule:");
            steps.push(`D = (${a1})(${b2}) - (${a2})(${b1}) = ${det}`);
            const x = (c1*b2 - c2*b1)/det, y = (a1*c2 - a2*c1)/det;
            steps.push(`x = ${x}`); steps.push(`y = ${y}`);
            if (Math.abs(a1*x + b1*y - c1) < 0.0001 && Math.abs(a2*x + b2*y - c2) < 0.0001)
                steps.push('Verification: Solution satisfies both equations ✓');
            this.displaySolution(solutionDiv, [`x = ${x}`, `y = ${y}`], steps);
        } catch (error) { this.showError(solutionDiv, error.message); }
    }

    // ── Function Evaluation ───────────────────────────────────
    evaluateFunction() {
        const funcDef = document.getElementById('function-def').value.trim();
        const xValue  = document.getElementById('function-x').value.trim();
        const solutionDiv = document.getElementById('function-solution');
        if (!funcDef || !xValue) { this.showError(solutionDiv, 'Please enter both function and x value'); return; }
        try {
            const x = parseFloat(xValue);
            if (isNaN(x)) throw new Error('Invalid x value');
            const steps = [];
            steps.push(`Function: f(x) = ${funcDef}`);
            steps.push(`Evaluate at x = ${x}`);
            const result = math.evaluate(funcDef, { x });
            steps.push(`Result: f(${x}) = ${result}`);
            this.displaySolution(solutionDiv, [result], steps);
        } catch (error) { this.showError(solutionDiv, error.message); }
    }

    solveFunctionEquation() {
        const funcDef     = document.getElementById('function-def').value.trim();
        const targetValue = document.getElementById('function-value').value.trim();
        const solutionDiv = document.getElementById('function-solution');
        if (!funcDef || targetValue === '') { this.showError(solutionDiv, 'Please enter both function and target value'); return; }
        try {
            const target = parseFloat(targetValue);
            if (isNaN(target)) throw new Error('Invalid target value');
            const steps = [];
            steps.push(`Solve: ${funcDef} = ${target}`);
            steps.push(`Rearrange: ${funcDef} - ${target} = 0`);
            const expression = `(${funcDef}) - ${target}`;
            const foundSolutions = new Set();
            for (const start of [-100,-10,-1,0,1,10,100]) {
                const sol = this.newtonRaphson(expression, 'x', start);
                if (sol !== null && !isNaN(sol)) foundSolutions.add(Math.round(sol * 1e10) / 1e10);
            }
            const solutions = Array.from(foundSolutions);
            if (solutions.length === 0) throw new Error('No solutions found');
            steps.push(`Found ${solutions.length} solution(s):`);
            solutions.forEach((sol, i) => {
                steps.push(`x${i+1} = ${sol}`);
                steps.push(`  Verify: f(${sol}) = ${math.evaluate(funcDef, { x: sol })} ≈ ${target}`);
            });
            this.displaySolution(solutionDiv, solutions, steps, 'x');
        } catch (error) { this.showError(solutionDiv, error.message); }
    }

    // ── Maths helpers ─────────────────────────────────────────
    findVariables(expression) {
        const vars = new Set();
        const matches = expression.match(/[a-z]/gi);
        if (matches) matches.forEach(v => vars.add(v));
        return Array.from(vars);
    }

    isLinear(expression, variable) {
        return !new RegExp(`${variable}\\s*\\^\\s*[2-9]`, 'i').test(expression) &&
               !['sin','cos','tan'].some(f => expression.includes(f));
    }

    solveLinear(leftSide, rightSide, variable) {
        leftSide = leftSide.replace(/\s/g,''); rightSide = rightSide.replace(/\s/g,'');
        const expr = `${leftSide} - (${rightSide})`;
        try {
            const val1 = math.evaluate(expr, {[variable]:1});
            const val0 = math.evaluate(expr, {[variable]:0});
            const coeff = val1 - val0;
            if (coeff === 0) throw new Error('Not a valid linear equation');
            return -val0 / coeff;
        } catch { throw new Error('Could not solve linear equation'); }
    }

    newtonRaphson(expression, variable, initialGuess, maxIterations = 50) {
        const tol = 1e-10;
        let x = initialGuess;
        for (let i = 0; i < maxIterations; i++) {
            try {
                const scope = {[variable]: x};
                const fx = math.evaluate(expression, scope);
                scope[variable] = x + 0.0001;
                const derivative = (math.evaluate(expression, scope) - fx) / 0.0001;
                if (Math.abs(derivative) < tol) break;
                const xNew = x - fx / derivative;
                if (Math.abs(xNew - x) < tol) return xNew;
                x = xNew;
                if (Math.abs(math.evaluate(expression, {[variable]:x})) < tol) return x;
            } catch { return null; }
        }
        try { if (Math.abs(math.evaluate(expression, {[variable]:x})) < 0.01) return x; } catch {}
        return null;
    }

    parseQuadratic(equation) {
        equation = equation.replace(/\s/g,'').toLowerCase();
        const parts = equation.split('=');
        if (parts.length !== 2) throw new Error('Equation must contain = sign');
        let expression = parts[0];
        if (parts[1] !== '0') expression = `${expression}-(${parts[1]})`;
        let a = 0, b = 0, c = 0;
        const x2 = expression.match(/([+-]?\d*\.?\d*)\*?x\^2|([+-]?\d*\.?\d*)x\*\*2/);
        if (x2) { const co = x2[1]||x2[2]; a = co===''||co==='+'?1:co==='-'?-1:parseFloat(co); }
        const xm = expression.match(/([+-]?\d*\.?\d*)\*?x(?!\^|\*\*)/);
        if (xm) { const co = xm[1]; b = co===''||co==='+'?1:co==='-'?-1:parseFloat(co); }
        try { c = math.evaluate(expression, {x:0}); } catch { c = 0; }
        return {a, b, c};
    }

    parseLinearEquation(equation) {
        equation = equation.replace(/\s/g,'').toLowerCase();
        const parts = equation.split('=');
        if (parts.length !== 2) throw new Error('Invalid equation format');
        const left = parts[0], constant = parseFloat(parts[1]) || 0;
        let xCoeff = 0, yCoeff = 0;
        const xm = left.match(/([+-]?\d*\.?\d*)\*?x/);
        if (xm) { const co = xm[1]; xCoeff = co===''||co==='+'?1:co==='-'?-1:parseFloat(co); }
        const ym = left.match(/([+-]?\d*\.?\d*)\*?y/);
        if (ym) { const co = ym[1]; yCoeff = co===''||co==='+'?1:co==='-'?-1:parseFloat(co); }
        return {xCoeff, yCoeff, constant};
    }

    displaySolution(solutionDiv, solutions, steps, variable = null) {
        solutionDiv.classList.add('show');
        let html = '<h3>Solution:</h3>';
        solutions.forEach((sol, i) => {
            html += variable && typeof sol === 'number'
                ? `<div class="result">${variable}${solutions.length>1?'₍'+(i+1)+'₎':''} = ${sol}</div>`
                : `<div class="result">${sol}</div>`;
        });
        if (steps?.length) {
            html += '<div class="steps"><h4>Step-by-step solution:</h4>';
            steps.forEach(step => { html += `<div class="step">${step}</div>`; });
            html += '</div>';
        }
        solutionDiv.innerHTML = html;
    }

    showError(solutionDiv, message) {
        solutionDiv.classList.add('show', 'error');
        solutionDiv.innerHTML = `<h3>Error:</h3><div class="result">${message}</div>`;
        setTimeout(() => solutionDiv.classList.remove('error'), 3000);
    }
}

// ── Init ──────────────────────────────────────────────────────
const calculator = new Calculator();

document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('keydown', e => {
        // Don't intercept when a solver text input is focused
        if (document.activeElement.classList.contains('solver-input')) return;

        if ((e.key >= '0' && e.key <= '9') || e.key === '.') {
            calculator.appendToDisplay(e.key);
        } else if (['+','-','*','/'].includes(e.key)) {
            calculator.appendToDisplay(e.key);
        } else if (e.key === 'Enter') {
            e.preventDefault(); calculator.calculate();
        } else if (e.key === 'Escape') {
            calculator.clear();
        } else if (e.key === 'Backspace') {
            e.preventDefault(); calculator.backspace();
        } else if (e.key.toLowerCase() === 'a') {
            calculator.appendAns();
        } else if (e.key === 'Tab') {
            e.preventDefault(); calculator.moveCursorPastDelimiter();
        } else if (e.key === 'ArrowLeft') {
            if (calculator.cursorPos > 0) { calculator.cursorPos--; calculator.renderDisplay(); }
        } else if (e.key === 'ArrowRight') {
            if (calculator.cursorPos < calculator.currentInput.length) { calculator.cursorPos++; calculator.renderDisplay(); }
        }
    });

    document.querySelectorAll('.solver-input').forEach(input => {
        input.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const mode = input.closest('.calculator-mode').id;
            if (mode === 'equation-mode')     calculator.solveEquation();
            else if (mode === 'quadratic-mode')    calculator.solveQuadratic();
            else if (mode === 'simultaneous-mode') calculator.solveSimultaneous();
            else if (mode === 'function-mode')     calculator.evaluateFunction();
        });
    });
});
