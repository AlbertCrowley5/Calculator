class Calculator {
    constructor() {
        this.currentInput  = '';
        this.lastAnswer    = null;
        this.shiftActive   = false;
        this.resultShown   = false;
        this.activeInput   = null;
        this.showComplex   = false;
        this.calcHistory   = [];
        this.memoryValue   = 0;
        this.angleMode     = 'deg';
        this.currentMode   = 'basic';
        this.initializeTheme();
        this.setupSolverInputTracking();
    }

    // ── Theme ────────────────────────────────────────────────
    initializeTheme() {
        const html = document.documentElement;
        try {
            const saved = localStorage.getItem('mathics-theme');
            if (saved) { html.setAttribute('data-theme', saved); }
        } catch {}
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            toggle.querySelector('.theme-icon').textContent = html.getAttribute('data-theme') === 'dark' ? '☀️' : '🌙';
            toggle.addEventListener('click', () => {
                const isDark = html.getAttribute('data-theme') === 'dark';
                html.setAttribute('data-theme', isDark ? 'light' : 'dark');
                toggle.querySelector('.theme-icon').textContent = isDark ? '🌙' : '☀️';
                try { localStorage.setItem('mathics-theme', isDark ? 'light' : 'dark'); } catch {}
            });
        }
    }

    // ── Mode switching ───────────────────────────────────────
    switchMode(mode, clickedBtn) {
        this.currentMode = mode;

        document.querySelectorAll('.mode-tab').forEach(b => b.classList.remove('active'));
        if (clickedBtn) clickedBtn.classList.add('active');

        document.querySelectorAll('.calc-panel').forEach(m => m.classList.remove('active'));
        const modeEl = document.getElementById(`${mode}-mode`);
        if (modeEl) modeEl.classList.add('active');

        // Toggle context-button labels: algebra modes show x/y/= instead of π/e/±
        document.getElementById('calc-app')?.classList.toggle('algebra-mode', mode !== 'basic');

        this.clearSolutions();

        if (mode !== 'basic') {
            setTimeout(() => {
                const firstInput = modeEl?.querySelector('.solver-input');
                if (firstInput) { firstInput.focus(); this.activeInput = firstInput; }
            }, 60);
        } else {
            setTimeout(() => document.getElementById('display')?.focus(), 60);
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

    // ── Mode helpers ─────────────────────────────────────────
    getCurrentModeInput() {
        const map = {
            equations:    'equations-input',
            factorise:    'factorise-input',
            expand:       'expand-input',
            simultaneous: 'sim-eq1',
            function:     'function-def',
        };
        const id = map[this.currentMode];
        return id ? document.getElementById(id) : null;
    }

    // ── Display helpers ──────────────────────────────────────
    getDisplayInput() { return document.getElementById('display'); }

    getExpressionForEval(asciiMath) {
        const ansVal = this.lastAnswer !== null ? String(this.lastAnswer) : '0';
        return asciiMath
            .replace(/\bAns\b/g, ansVal)
            .replace(/\bA\s+n\s+s\b/g, ansVal)
            .replace(/\bA\s*\*\s*n\s*\*\s*s\b/g, ansVal)
            .replace(/arcsin/g, 'asin')
            .replace(/arccos/g, 'acos')
            .replace(/arctan/g, 'atan')
            .replace(/arcsinh/g, 'asinh')
            .replace(/arccosh/g, 'acosh')
            .replace(/arctanh/g, 'atanh')
            .replace(/\bln\b/g, 'log')
            .replace(/log_\(?\s*10\s*\)?/g, 'log10')
            .replace(/\bcbrt\(/g, 'nthRoot(')
            .replace(/\bnCr\s*\(/g, 'combinations(')
            .replace(/\bnPr\s*\(/g, 'permutations(')
            .replace(/Ran#/g, '(random())')
            .replace(/×10\^/g, '*10^')
            .replace(/\bxx\b/g, '*');
    }

    subAns(expr) {
        const v = this.lastAnswer !== null ? String(this.lastAnswer) : '0';
        return expr
            .replace(/\bAns\b/g, v)
            .replace(/\bA\s+n\s+s\b/g, v)
            .replace(/\bA\s*\*\s*n\s*\*\s*s\b/g, v);
    }

    // ── Universal keyboard routing ───────────────────────────

    keyPress(value) {
        if (this.currentMode === 'basic') {
            this.appendToDisplay(value);
        } else {
            this.appendToSolverInput(value);
        }
    }

    doBackspace() {
        if (this.currentMode === 'basic') {
            this.backspace();
        } else {
            this.backspaceInput();
        }
    }

    doClear() {
        if (this.currentMode === 'basic') {
            this.clear();
        } else {
            this.clearInput();
            const modeEl = document.getElementById(`${this.currentMode}-mode`);
            const sol = modeEl?.querySelector('.solution-display');
            if (sol) { sol.classList.remove('show'); sol.innerHTML = ''; }
        }
    }

    doAns() {
        if (this.currentMode === 'basic') {
            this.appendAns();
        } else {
            this.appendAnsToInput();
        }
    }

    execute() {
        const mode = this.currentMode;
        if (mode === 'basic')           { this.calculate(); return; }
        if (mode === 'equations')       { this.solveUnified(); return; }
        if (mode === 'factorise')       { this.factorise(); return; }
        if (mode === 'expand')          { this.expand(); return; }
        if (mode === 'simultaneous')    { this.solveSimultaneous(); return; }
        if (mode === 'function') {
            const target = document.getElementById('function-value')?.value.trim();
            if (target) this.solveFunctionEquation();
            else this.evaluateFunction();
        }
    }

    contextPress(calcValue, algebraValue) {
        if (this.currentMode === 'basic') {
            this.appendToDisplay(calcValue);
        } else {
            this.appendToSolverInput(algebraValue);
        }
    }

    contextSignOrEquals() {
        if (this.currentMode === 'basic') {
            this.toggleSign();
        } else {
            this.appendToSolverInput('=');
        }
    }

    pressFunctionUnified(fn) {
        if (this.currentMode === 'basic') {
            this.pressFunction(fn);
            return;
        }
        const s = this.shiftActive;
        const map = {
            sin:  s ? 'arcsin(' : 'sin(',
            cos:  s ? 'arccos(' : 'cos(',
            tan:  s ? 'arctan(' : 'tan(',
            log:  s ? '10^('    : 'log(',
            ln:   s ? 'e^('     : 'ln(',
            sqrt: s ? 'cbrt('   : 'sqrt(',
            sinh: s ? 'arcsinh(' : 'sinh(',
            cosh: s ? 'arccosh(' : 'cosh(',
            tanh: s ? 'arctanh(' : 'tanh(',
        };
        const text = map[fn];
        if (!text) return;
        if (this.shiftActive) this.toggleShift();
        this.appendToSolverInput(text);
    }

    pressFunctionInverse(fn) {
        if (this.currentMode === 'basic') {
            const invLatex = {
                sin: '\\arcsin\\left(#?\\right)',
                cos: '\\arccos\\left(#?\\right)',
                tan: '\\arctan\\left(#?\\right)',
                log: '10^{#?}',
                ln:  'e^{#?}',
            };
            const latex = invLatex[fn];
            if (!latex) return;
            const mf = this.getDisplayInput();
            if (!mf) return;
            if (this.resultShown) { mf.setValue(''); mf.classList.remove('result-mode'); this.resultShown = false; }
            mf.insert(latex, { focus: true });
            this.currentInput = mf.getValue();
        } else {
            const invText = {
                sin: 'arcsin(',
                cos: 'arccos(',
                tan: 'arctan(',
                log: '10^(',
                ln:  'e^(',
            };
            const text = invText[fn];
            if (!text) return;
            this.appendToSolverInput(text);
        }
    }

    insertFractionUnified() {
        if (this.currentMode === 'basic') {
            this.insertFraction();
        } else {
            // Insert ( which signals fraction intent in plain-text mode
            this.appendToSolverInput('(');
        }
    }

    insertPowerUnified() {
        if (this.currentMode === 'basic') {
            this.insertPower();
        } else {
            this.appendToSolverInput('^(');
        }
    }

    insertAbsUnified() {
        if (this.currentMode === 'basic') {
            this.insertAbs();
        } else {
            this.appendToSolverInput('abs(');
        }
    }

    insertFactorial() {
        if (this.currentMode === 'basic') {
            const mf = this.getDisplayInput();
            if (mf) mf.executeCommand?.(['insert', '!']);
        } else {
            this.appendToSolverInput('!');
        }
    }

    insertNCr() {
        if (this.currentMode === 'basic') {
            const mf = this.getDisplayInput();
            if (mf) mf.insert('nCr(', { focus: true });
        } else {
            this.appendToSolverInput('nCr(');
        }
    }

    insertNPr() {
        if (this.currentMode === 'basic') {
            const mf = this.getDisplayInput();
            if (mf) mf.insert('nPr(', { focus: true });
        } else {
            this.appendToSolverInput('nPr(');
        }
    }

    insertImaginary() {
        if (this.currentMode === 'basic') {
            const mf = this.getDisplayInput();
            if (mf) mf.insert('i', { focus: true });
        } else {
            this.appendToSolverInput('i');
        }
    }

    insertRandom() {
        if (this.currentMode === 'basic') {
            const mf = this.getDisplayInput();
            if (mf) mf.insert('Ran#', { focus: true });
        } else {
            this.appendToSolverInput('Ran#');
        }
    }

    insertEXP() {
        if (this.currentMode === 'basic') {
            const mf = this.getDisplayInput();
            if (mf) mf.insert('\\times10^{#?}', { focus: true });
        } else {
            this.appendToSolverInput('×10^(');
        }
    }

    goToMode(mode) {
        if (mode !== 'basic') {
            this.setUIMode('advanced');
            const chk = document.getElementById('calc-mode-chk');
            if (chk) chk.checked = true;
        }
        const delay = mode !== 'basic' ? 120 : 0;
        setTimeout(() => {
            document.getElementById('calculator')?.scrollIntoView({ behavior: 'smooth' });
            const btn = document.querySelector(`[data-mode="${mode}"]`);
            if (btn) this.switchMode(mode, btn);
        }, delay);
    }

    squareUnified() {
        const mf = this.getDisplayInput();
        if (this.currentMode !== 'basic') {
            this.appendToSolverInput(this.shiftActive ? '^3' : '^2');
            if (this.shiftActive) this.toggleShift();
            return;
        }
        if (!mf) return;
        mf.executeCommand?.(['insert', this.shiftActive ? '^{3}' : '^{2}']);
        if (this.shiftActive) this.toggleShift();
    }

    // ── UI Mode (Simple / Advanced) ───────────────────────────
    setUIMode(mode) {
        const app = document.getElementById('calc-app');
        if (!app) return;
        app.setAttribute('data-ui', mode);
        const chk = document.getElementById('calc-mode-chk');
        if (chk) chk.checked = mode === 'advanced';
        if (mode === 'simple') {
            if (this.shiftActive) this.toggleShift();
            this.switchMode('basic', document.querySelector('[data-mode="basic"]'));
        }
        try { localStorage.setItem('mathics-ui-mode', mode); } catch {}
    }

    // Inserts plain text into the currently focused solver input
    appendToSolverInput(value) {
        const input = this.activeInput || this.getCurrentModeInput();
        if (!input) return;
        if (!this.activeInput) {
            this.activeInput = input;
            input.focus();
        }
        const start = input.selectionStart ?? input.value.length;
        const end   = input.selectionEnd   ?? input.value.length;
        input.value = input.value.slice(0, start) + value + input.value.slice(end);
        const pos = start + value.length;
        input.setSelectionRange(pos, pos);
        input.focus();
    }

    // ── Core display operations ──────────────────────────────
    appendToDisplay(value) {
        const mf = this.getDisplayInput();
        if (!mf) return;

        if (this.resultShown) {
            const isChainOp = /^[+\-*/^]/.test(value);
            if (isChainOp) {
                mf.setValue('\\operatorname{Ans}');
            } else {
                mf.setValue('');
            }
            mf.classList.remove('result-mode');
            this.resultShown = false;
        }

        const latexMap = {
            'pi':     '\\pi',
            '*':      '\\times',
            '/':      '\\frac{#@}{#?}',
            'sqrt(':  '\\sqrt{#?}',
            'sin(':   '\\sin\\left(#?\\right)',
            'cos(':   '\\cos\\left(#?\\right)',
            'tan(':   '\\tan\\left(#?\\right)',
            'asin(':  '\\arcsin\\left(#?\\right)',
            'acos(':  '\\arccos\\left(#?\\right)',
            'atan(':  '\\arctan\\left(#?\\right)',
            'log(':   '\\ln\\left(#?\\right)',
            'log10(': '\\log_{10}\\left(#?\\right)',
            'ln(':    '\\ln\\left(#?\\right)',
            'abs(':   '\\left|#?\\right|',
            'EXP':    '\\times10^{#?}',
        };

        const latex = latexMap[value] ?? value;
        mf.insert(latex, { focus: true });
        this.currentInput = mf.getValue();
    }

    clear() {
        const mf = this.getDisplayInput();
        if (mf) { mf.setValue(''); mf.classList.remove('result-mode'); mf.focus(); }
        this.currentInput = '';
        this.resultShown  = false;
        const prev = document.getElementById('display-prev');
        if (prev) prev.textContent = '';
    }

    backspace() {
        const mf = this.getDisplayInput();
        if (!mf) return;
        if (this.resultShown) { this.clear(); return; }
        mf.executeCommand('deleteBackward');
        this.currentInput = mf.getValue();
    }

    // ── ANS ──────────────────────────────────────────────────
    appendAns() {
        const mf = this.getDisplayInput();
        if (!mf) return;
        if (this.resultShown) {
            mf.setValue('\\operatorname{Ans}');
            mf.classList.remove('result-mode');
            this.resultShown = false;
        } else {
            mf.insert('\\operatorname{Ans}', { focus: true });
        }
        this.currentInput = mf.getValue();
    }

    // ── 2nd / Shift ───────────────────────────────────────────
    toggleShift() {
        this.shiftActive = !this.shiftActive;
        document.getElementById('shift-btn')?.classList.toggle('active', this.shiftActive);
        document.getElementById('keyboard-wrap')?.classList.toggle('shifted', this.shiftActive);
    }

    pressFunction(fn) {
        const s = this.shiftActive;
        const latexMap = {
            sin:  s ? '\\arcsin\\left(#?\\right)'           : '\\sin\\left(#?\\right)',
            cos:  s ? '\\arccos\\left(#?\\right)'           : '\\cos\\left(#?\\right)',
            tan:  s ? '\\arctan\\left(#?\\right)'           : '\\tan\\left(#?\\right)',
            log:  s ? '10^{#?}'                             : '\\log_{10}\\left(#?\\right)',
            ln:   s ? 'e^{#?}'                              : '\\ln\\left(#?\\right)',
            sqrt: s ? '\\sqrt[3]{#?}'                       : '\\sqrt{#?}',
            sinh: s ? '\\operatorname{arcsinh}\\left(#?\\right)' : '\\sinh\\left(#?\\right)',
            cosh: s ? '\\operatorname{arccosh}\\left(#?\\right)' : '\\cosh\\left(#?\\right)',
            tanh: s ? '\\operatorname{arctanh}\\left(#?\\right)' : '\\tanh\\left(#?\\right)',
        };
        const latex = latexMap[fn];
        if (!latex) return;
        if (this.shiftActive) this.toggleShift();
        const mf = this.getDisplayInput();
        if (!mf) return;
        if (this.resultShown) { mf.setValue(''); mf.classList.remove('result-mode'); this.resultShown = false; }
        mf.insert(latex, { focus: true });
        this.currentInput = mf.getValue();
    }

    insertFraction() {
        const mf = this.getDisplayInput();
        if (!mf) return;
        if (this.resultShown) { mf.setValue(''); mf.classList.remove('result-mode'); this.resultShown = false; }
        mf.insert('\\frac{#@}{#?}', { focus: true });
        this.currentInput = mf.getValue();
    }

    insertPower() {
        const mf = this.getDisplayInput();
        if (!mf) return;
        if (this.resultShown) { mf.setValue(''); mf.classList.remove('result-mode'); this.resultShown = false; }
        mf.insert('^{#?}', { focus: true });
        this.currentInput = mf.getValue();
    }

    insertAbs() {
        const mf = this.getDisplayInput();
        if (!mf) return;
        if (this.resultShown) { mf.setValue(''); mf.classList.remove('result-mode'); this.resultShown = false; }
        mf.insert('\\left|#?\\right|', { focus: true });
        this.currentInput = mf.getValue();
    }

    toggleSign() {
        const mf = this.getDisplayInput();
        if (!mf) return;
        const latex = mf.getValue('latex').trim();
        if (!latex) { mf.insert('-', { focus: true }); return; }
        if (latex.startsWith('-')) {
            mf.setValue(latex.slice(1));
        } else {
            mf.setValue('-' + latex);
        }
        this.currentInput = mf.getValue();
        mf.focus();
    }

    // ── Calculate ─────────────────────────────────────────────
    calculate() {
        const mf = this.getDisplayInput();
        if (!mf) return;
        const asciiMath = mf.getValue('ascii-math').trim();
        if (!asciiMath) return;
        const latexExpr = mf.getValue('latex');

        try {
            const raw = this.getExpressionForEval(asciiMath);
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
            }

            let result = math.evaluate(raw, scope);

            const prevEl = document.getElementById('display-prev');
            if (prevEl) prevEl.textContent = asciiMath + ' =';

            mf.setValue(String(result));
            mf.classList.add('result-mode');
            this.lastAnswer  = result;
            this.resultShown = true;
            this.currentInput = String(result);

            const ansEl = document.getElementById('display-ans');
            if (ansEl) ansEl.textContent = `Ans = ${result}`;

            this.addToCalcHistory(latexExpr, asciiMath, result);

        } catch {
            const prevEl = document.getElementById('display-prev');
            if (prevEl) {
                const saved = prevEl.textContent;
                prevEl.textContent = 'Check your expression and try again';
                setTimeout(() => { prevEl.textContent = saved; }, 2000);
            }
            mf.focus();
        }
    }

    // ── Memory ────────────────────────────────────────────────
    memoryClear() { this.memoryValue = 0; this.updateMemoryDisplay(); }

    memoryRecall() { this.appendToDisplay(String(this.memoryValue)); }

    memoryAdd() {
        const mf = this.getDisplayInput();
        const v = this.resultShown && mf ? parseFloat(mf.getValue('ascii-math') || '0') : 0;
        this.memoryValue += (isNaN(v) ? 0 : v);
        this.updateMemoryDisplay();
    }

    memorySubtract() {
        const mf = this.getDisplayInput();
        const v = this.resultShown && mf ? parseFloat(mf.getValue('ascii-math') || '0') : 0;
        this.memoryValue -= (isNaN(v) ? 0 : v);
        this.updateMemoryDisplay();
    }

    updateMemoryDisplay() {
        const el = document.getElementById('memory-display');
        if (!el) return;
        el.textContent = String(this.memoryValue);
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
        const mf = this.getDisplayInput();
        if (!this.resultShown || !mf) return;
        const val = mf.getValue('ascii-math');
        if (!val) return;
        navigator.clipboard.writeText(val).then(() => {
            const btn = document.getElementById('copy-btn');
            if (btn) { const o = btn.textContent; btn.textContent = '✓'; setTimeout(() => btn.textContent = o, 2000); }
        }).catch(() => {});
    }

    // ── Memory panel toggle ───────────────────────────────────
    toggleMemory() {
        document.getElementById('memory-panel')?.classList.toggle('visible');
    }

    // ── History ───────────────────────────────────────────────
    toggleHistory() {
        document.getElementById('history-strip')?.classList.toggle('visible');
    }

    addToCalcHistory(latexExpr, asciiExpr, result) {
        this.calcHistory.unshift({ latex: latexExpr, expression: asciiExpr, result });
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
            list.innerHTML = `<div class="hist-empty"><div class="empty-icon">📈</div><p>No calculations yet</p></div>`;
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
        const mf = this.getDisplayInput();
        if (!mf) return;
        mf.setValue(item.latex || String(item.result));
        mf.classList.remove('result-mode');
        this.currentInput = item.expression || '';
        this.resultShown  = false;
        mf.focus();
        const prev = document.getElementById('display-prev');
        if (prev) prev.textContent = (item.expression || '') + ' =';
    }

    // ── Solver input helpers (used by solver panels directly) ─
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
        this.appendToInput('Ans');
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

    // ── Equation Solver stubs ────────────────────────────────
    solveEquation()  { this.solveUnified(); }
    solveQuadratic() { this.solveUnified(); }

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
            steps.push(`D = (${a1})(${b2}) − (${a2})(${b1}) = ${det}`);
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
        if (!funcDef || !xValue) { this.showError(solutionDiv, 'Enter both f(x) and a value for x'); return; }
        try {
            const x = parseFloat(xValue);
            if (isNaN(x)) throw new Error('Invalid x value');
            const steps = [`f(x) = ${funcDef}`, `x = ${x}`];
            const result = math.evaluate(funcDef, { x });
            steps.push(`f(${x}) = ${result}`);
            this.displaySolution(solutionDiv, [result], steps);
        } catch (error) { this.showError(solutionDiv, error.message); }
    }

    solveFunctionEquation() {
        const funcDef     = document.getElementById('function-def').value.trim();
        const targetValue = document.getElementById('function-value').value.trim();
        const solutionDiv = document.getElementById('function-solution');
        if (!funcDef || targetValue === '') { this.showError(solutionDiv, 'Enter both f(x) and the target value'); return; }
        try {
            const target = parseFloat(targetValue);
            if (isNaN(target)) throw new Error('Invalid target value');
            const steps = [`Solve: ${funcDef} = ${target}`];
            const expression = `(${funcDef}) - ${target}`;
            const foundSolutions = new Set();
            for (const start of [-100,-10,-1,0,1,10,100]) {
                const sol = this.newtonRaphson(expression, 'x', start);
                if (sol !== null && !isNaN(sol)) foundSolutions.add(Math.round(sol * 1e10) / 1e10);
            }
            const solutions = Array.from(foundSolutions);
            if (solutions.length === 0) throw new Error('No solutions found in the search range');
            solutions.forEach((sol, i) => steps.push(`x${solutions.length>1?i+1:''} = ${sol}`));
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
        let html = '<h3>Solution</h3>';
        solutions.forEach((sol, i) => {
            html += variable && typeof sol === 'number'
                ? `<div class="result">${variable}${solutions.length>1?'<sub>'+(i+1)+'</sub>':''} = ${sol}</div>`
                : `<div class="result">${sol}</div>`;
        });
        if (steps?.length) {
            html += '<details class="steps-details"><summary>Step-by-step</summary><div class="steps">';
            steps.forEach(step => { html += `<div class="step">${step}</div>`; });
            html += '</div></details>';
        }
        solutionDiv.innerHTML = html;
    }

    showError(solutionDiv, message) {
        if (!solutionDiv) return;
        solutionDiv.classList.add('show', 'error');
        solutionDiv.innerHTML = `<h3>Oops!</h3><div class="result error-msg">${message}</div>`;
        setTimeout(() => solutionDiv.classList.remove('error'), 3000);
    }

    // ── Complex mode ─────────────────────────────────────────
    setComplexMode(showComplex) {
        this.showComplex = showComplex;
        document.getElementById('pill-real')?.classList.toggle('active', !showComplex);
        document.getElementById('pill-complex')?.classList.toggle('active', showComplex);
    }

    // ── Unified Equation Solver ──────────────────────────────
    solveUnified() {
        const input = document.getElementById('equations-input').value.trim();
        const solutionDiv = document.getElementById('equations-solution');
        if (!input) { this.showError(solutionDiv, 'Please enter an equation'); return; }
        try {
            const eq = input.replace(/\s/g, '');
            const parts = eq.split('=');
            if (parts.length !== 2) throw new Error('Equation must contain exactly one = sign');
            const left = parts[0], right = parts[1];
            const expr = `(${left})-(${right})`;
            const vars = this.findVariables(expr);
            if (vars.length === 0) throw new Error('No variable found in equation');
            const v = vars[0];
            const steps = [`Equation: ${left} = ${right}`];

            if (/[a-z]\^2|\*\*2/i.test(expr)) {
                try {
                    const { a, b, c } = this.parsePolynomial(expr, v);
                    const ra = Math.round(a * 1e9) / 1e9;
                    const rb = Math.round(b * 1e9) / 1e9;
                    const rc = Math.round(c * 1e9) / 1e9;
                    if (Math.abs(ra) > 1e-9) {
                        this.solveQuadraticCoeffs(ra, rb, rc, solutionDiv);
                        return;
                    }
                } catch {}
            }
            if (this.isLinear(expr, v)) {
                const sol = this.solveLinear(left, right, v);
                steps.push(`${v} = ${this.fmtNum(sol)}`);
                this.displaySolution(solutionDiv, [sol], steps, v);
            } else {
                const found = new Set();
                for (const start of [-10, -1, 0, 1, 10]) {
                    const sol = this.newtonRaphson(expr, v, start);
                    if (sol !== null && !isNaN(sol)) found.add(Math.round(sol * 1e10) / 1e10);
                }
                const solutions = Array.from(found);
                if (solutions.length === 0) throw new Error('No solutions found');
                this.displaySolution(solutionDiv, solutions, steps, v);
            }
        } catch (e) { this.showError(document.getElementById('equations-solution'), e.message); }
    }

    parsePolynomial(expr, variable = 'x') {
        const ev = v => math.evaluate(expr, { [variable]: v });
        const c = ev(0), f1 = ev(1), fm = ev(-1);
        const a = (f1 + fm - 2 * c) / 2;
        const b = (f1 - fm) / 2;
        return { a, b, c };
    }

    solveQuadraticCoeffs(a, b, c, solutionDiv) {
        const steps = [];
        const aStr = a === 1 ? '' : a === -1 ? '-' : String(a);
        const bAbs = Math.abs(b), cAbs = Math.abs(c);
        steps.push(`${aStr}x² ${b >= 0 ? '+' : '−'} ${bAbs}x ${c >= 0 ? '+' : '−'} ${cAbs} = 0`);
        steps.push('Using quadratic formula: x = (−b ± √(b²−4ac)) / 2a');
        const disc = b * b - 4 * a * c;
        steps.push(`Discriminant Δ = ${this.fmtNum(disc)}`);

        if (disc > 1e-12) {
            steps.push('Δ > 0 → two real solutions');
            const x1 = (-b + Math.sqrt(disc)) / (2 * a);
            const x2 = (-b - Math.sqrt(disc)) / (2 * a);
            steps.push(`x₁ = ${this.fmtNum(x1)}`);
            steps.push(`x₂ = ${this.fmtNum(x2)}`);
            this.displaySolution(solutionDiv, [x1, x2], steps, 'x');
        } else if (Math.abs(disc) <= 1e-12) {
            steps.push('Δ = 0 → one repeated solution');
            const x = -b / (2 * a);
            steps.push(`x = ${this.fmtNum(x)}`);
            this.displaySolution(solutionDiv, [x], steps, 'x');
        } else {
            const r = -b / (2 * a), im = Math.sqrt(-disc) / (2 * a);
            if (this.showComplex) {
                steps.push('Δ < 0 → two complex solutions');
                const s1 = `${this.fmtNum(r)} + ${this.fmtNum(im)}i`;
                const s2 = `${this.fmtNum(r)} − ${this.fmtNum(im)}i`;
                steps.push(`x₁ = ${s1}`); steps.push(`x₂ = ${s2}`);
                this.displaySolution(solutionDiv, [s1, s2], steps);
            } else {
                steps.push('Δ < 0 → no real solutions');
                this.displayNoSolution(solutionDiv, steps);
            }
        }
    }

    fmtNum(n) { return String(Math.round(n * 1e10) / 1e10); }

    displayNoSolution(solutionDiv, steps) {
        solutionDiv.classList.add('show');
        let html = '<div class="no-solution">No real solutions</div>';
        if (steps?.length) {
            html += '<details class="steps-details"><summary>Step-by-step</summary><div class="steps">';
            steps.forEach(s => { html += `<div class="step">${s}</div>`; });
            html += '</div></details>';
        }
        solutionDiv.innerHTML = html;
    }

    // ── Factorise ────────────────────────────────────────────
    factorise() {
        const input = document.getElementById('factorise-input').value.trim();
        const sol   = document.getElementById('factorise-solution');
        if (!input) { this.showError(sol, 'Please enter an expression'); return; }
        try {
            if (!/x/i.test(input)) throw new Error('Enter a polynomial with the variable x');
            const steps = [`Expression: ${input}`];
            let { a, b, c } = this.parsePolynomial(input.replace(/\s/g, ''), 'x');
            a = Math.round(a * 1e9) / 1e9;
            b = Math.round(b * 1e9) / 1e9;
            c = Math.round(c * 1e9) / 1e9;

            if (Math.abs(a) < 1e-9) {
                const ib = Math.round(b), ic = Math.round(c);
                const g = this.gcd(Math.abs(ib), Math.abs(ic));
                if (g > 1) {
                    const rb = ib / g, rc = ic / g;
                    const sign = rc >= 0 ? `+ ${rc}` : `− ${-rc}`;
                    const result = `${g}(${rb === 1 ? '' : rb}x ${sign})`;
                    steps.push(`Result: ${result}`);
                    this.displaySolution(sol, [result], steps);
                } else {
                    this.displaySolution(sol, ['Already in simplest form'], steps);
                }
                return;
            }

            steps.push(`Quadratic: ${a}x² + ${b}x + ${c}`);

            if (Math.abs(c) < 1e-9) {
                const ia = Math.round(a), ib = Math.round(b);
                const g = this.gcd(Math.abs(ia), Math.abs(ib));
                const ra = ia / g, rb = ib / g;
                const sign = rb >= 0 ? `+ ${rb}` : `− ${-rb}`;
                const inner = ra === 1 ? `x ${sign}` : `${ra}x ${sign}`;
                const result = g > 1 ? `${g}x(${inner})` : `x(${inner})`;
                steps.push(`Result: ${result}`);
                this.displaySolution(sol, [result], steps);
                return;
            }

            let prefix = '';
            let ra = a, rb = b, rc = c;
            const g = this.gcd3(Math.abs(Math.round(a)), Math.abs(Math.round(b)), Math.abs(Math.round(c)));
            if (g > 1) {
                prefix = `${g}`;
                ra /= g; rb /= g; rc /= g;
                steps.push(`Common factor: ${g}(${ra}x² + ${rb}x + ${rc})`);
            }

            const factored = this.factoriseQuadratic(Math.round(ra), Math.round(rb), Math.round(rc));
            if (factored === null) {
                const disc = rb * rb - 4 * ra * rc;
                steps.push(`Δ = ${this.fmtNum(disc)} — not a perfect square`);
                this.displaySolution(sol, [`Cannot factorise over ℚ`], steps);
                return;
            }
            const result = `${prefix}${factored}`;
            steps.push(`Result: ${result}`);
            this.displaySolution(sol, [result], steps);
        } catch (e) { this.showError(document.getElementById('factorise-solution'), e.message); }
    }

    gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
    gcd3(a, b, c) { return this.gcd(this.gcd(a, b), c); }

    reduceFrac(num, den) {
        if (den < 0) { num = -num; den = -den; }
        const g = this.gcd(Math.abs(num), den);
        return { p: Math.round(num / g), q: Math.round(den / g) };
    }

    factoriseQuadratic(a, b, c) {
        if (a === 0) return null;
        const disc = b * b - 4 * a * c;
        if (disc < 0) return null;
        const sqrtD = Math.sqrt(disc);
        if (Math.abs(sqrtD - Math.round(sqrtD)) > 1e-6) return null;
        const isd = Math.round(sqrtD);
        const f1 = this.reduceFrac(-b + isd, 2 * a);
        const f2 = this.reduceFrac(-b - isd, 2 * a);
        const fmtBracket = ({ p, q }) => {
            if (q < 0) { p = -p; q = -q; }
            const xPart = q === 1 ? 'x' : `${q}x`;
            if (p === 0) return `(${xPart})`;
            const sign = p <= 0 ? `+ ${-p}` : `− ${p}`;
            return `(${xPart} ${sign})`;
        };
        return isd === 0 ? `${fmtBracket(f1)}²` : `${fmtBracket(f1)}${fmtBracket(f2)}`;
    }

    // ── Expand ───────────────────────────────────────────────
    expand() {
        const raw   = document.getElementById('expand-input').value.trim();
        const sol   = document.getElementById('expand-solution');
        if (!raw) { this.showError(sol, 'Please enter an expression'); return; }
        try {
            // Insert * for implicit multiplication: )( → )*( , 3( → 3*( , )x → )*x , 3x → 3*x
            const processed = raw
                .replace(/\)\s*\(/g, ')*(')
                .replace(/(\d)\s*\(/g, '$1*(')
                .replace(/\)\s*([a-zA-Z])/g, ')*$1')
                .replace(/(\d)\s*([a-zA-Z])/g, '$1*$2');
            const steps = [`Expression: ${raw}`];
            const expanded = math.simplify(processed).toString();
            if (expanded === processed || expanded === raw) {
                steps.push('Already fully expanded');
                this.displaySolution(sol, [this.formatExpanded(expanded)], steps);
            } else {
                const formatted = this.formatExpanded(expanded);
                steps.push(`Expanded: ${formatted}`);
                this.displaySolution(sol, [formatted], steps);
            }
        } catch (e) { this.showError(sol, e.message); }
    }

    formatExpanded(str) {
        return str.replace(/\s*\*\*\s*/g, '^').replace(/\s*\^\s*/g, '^')
                  .replace(/\s*\*\s*/g, '').replace(/\bx\^2\b/g, 'x²')
                  .replace(/\bx\^3\b/g, 'x³').replace(/\^1\b/g, '').trim();
    }
}

// ── Init ──────────────────────────────────────────────────────
const calculator = new Calculator();

// Globally suppress MathLive virtual keyboard before it can mount
window.addEventListener('math-virtual-keyboard-open', e => { e.preventDefault(); }, true);
if (window.mathVirtualKeyboard) window.mathVirtualKeyboard.visible = false;

document.addEventListener('DOMContentLoaded', () => {
    // ── Non-MathLive init (runs immediately) ──────────────────

    // Restore persisted UI mode (default: simple)
    const savedMode = (() => { try { return localStorage.getItem('mathics-ui-mode'); } catch { return null; } })();
    calculator.setUIMode(savedMode === 'advanced' ? 'advanced' : 'simple');

    // Wire up mode tabs
    document.querySelectorAll('.mode-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            calculator.switchMode(btn.getAttribute('data-mode'), btn);
        });
    });

    // Solver input Enter key → execute
    document.querySelectorAll('.solver-input').forEach(input => {
        input.addEventListener('keydown', e => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            calculator.execute();
        });
    });

    // Load formula from formulas.html if one was queued
    try {
        const formulaLoad = localStorage.getItem('mathics-formula-load');
        if (formulaLoad) {
            localStorage.removeItem('mathics-formula-load');
            const { mode, expression, inputId, expression2, inputId2 } = JSON.parse(formulaLoad);
            calculator.goToMode(mode || 'equations');
            setTimeout(() => {
                if (inputId) {
                    const el = document.getElementById(inputId);
                    if (el) { el.value = expression || ''; calculator.activeInput = el; el.focus(); }
                }
                if (inputId2) {
                    const el2 = document.getElementById(inputId2);
                    if (el2) el2.value = expression2 || '';
                }
            }, 350);
        }
    } catch {}

    // ── MathLive-dependent init (waits for custom element) ────
    customElements.whenDefined('math-field').then(() => {
        if (window.mathVirtualKeyboard) {
            window.mathVirtualKeyboard.visible = false;
            window.mathVirtualKeyboard.hide?.();
        }

        const display = document.getElementById('display');

        if (display) {
            display.smartFence = false;
            display.virtualKeyboardMode = 'off';

            // Pierce the shadow DOM to force our selection colours
            const injectShadowStyles = () => {
                const sr = display.shadowRoot;
                if (!sr) return;
                if (sr.querySelector('#mathics-sel-override')) return;
                const s = document.createElement('style');
                s.id = 'mathics-sel-override';
                s.textContent = `
                    .ML__selected { background: rgba(99,102,241,0.5) !important; border-radius: 2px; }
                    .ML__selected * { background: transparent !important; }
                    ::selection { background: rgba(99,102,241,0.5) !important; color: inherit !important; }
                `;
                sr.appendChild(s);
            };
            injectShadowStyles();
            setTimeout(injectShadowStyles, 500);

            const suppressNativeKb = () => {
                const ta = display.shadowRoot?.querySelector('textarea');
                if (ta) ta.setAttribute('inputmode', 'none');
            };
            suppressNativeKb();
            setTimeout(suppressNativeKb, 500);

            display.addEventListener('keydown', e => {
                if (e.key === 'Enter')  { e.preventDefault(); e.stopPropagation(); calculator.calculate(); }
                if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); calculator.clear(); }
            });

            display.addEventListener('input', () => {
                calculator.currentInput = display.getValue ? display.getValue() : '';
                if (calculator.resultShown) {
                    display.classList.remove('result-mode');
                    calculator.resultShown = false;
                }
            });

            display.focus();
        }

        // Physical keyboard redirect to display (calculator mode only)
        document.addEventListener('keydown', e => {
            const display = document.getElementById('display');
            if (calculator.currentMode !== 'basic') return;
            if (document.activeElement.classList.contains('solver-input')) return;
            if (document.activeElement !== display && display) {
                if (/^[0-9+\-*/.^()e]$/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                    display.executeCommand?.(['insert', e.key]);
                    display.focus();
                }
            }
        });
    });
});
