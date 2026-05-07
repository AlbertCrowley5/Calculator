class Calculator {
    constructor() {
        this.currentInput  = '';
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
            basic:        'Standard Calculator',
            equation:     'Equation Solver',
            quadratic:    'Quadratic Solver',
            simultaneous: 'Simultaneous Equations',
            function:     'Function Evaluator'
        };
        const indicator = document.getElementById('mode-indicator');
        if (indicator) indicator.textContent = names[mode] || mode;

        this.clearSolutions();

        // Auto-focus first solver input when switching to a solver mode
        if (mode !== 'basic') {
            setTimeout(() => {
                const firstInput = modeEl?.querySelector('.solver-input');
                if (firstInput) {
                    firstInput.focus();
                    this.activeInput = firstInput;
                }
            }, 60);
        }
    }

    clearSolutions() {
        document.querySelectorAll('.solution-display').forEach(sol => {
            sol.classList.remove('show');
            sol.innerHTML = '';
        });
    }

    // ── Solver input tracking (for math keyboard) ────────────
    setupSolverInputTracking() {
        document.querySelectorAll('.solver-input').forEach(input => {
            input.addEventListener('focus', () => {
                this.activeInput = input;
            });
        });
    }

    // ── Display helpers ──────────────────────────────────────
    updateDisplay() {
        const el = document.getElementById('display');
        if (!el) return;
        el.textContent = this.currentInput || '0';
        el.classList.toggle('result-mode', this.resultShown);
    }

    // ── Main keyboard: append to expression ─────────────────
    appendToDisplay(value) {
        if (this.resultShown) {
            // Digits/functions start fresh; operators chain onto the result
            const isChainOp = /^[+\-*/^]/.test(value) || value === 'mod ';
            if (!isChainOp) this.currentInput = '';
            this.resultShown = false;
        }
        this.currentInput += value;
        this.updateDisplay();
    }

    clear() {
        this.currentInput = '';
        this.resultShown  = false;
        document.getElementById('display')?.classList.remove('result-mode');
        this.updateDisplay();
        document.getElementById('display-prev') && (document.getElementById('display-prev').textContent = '');
    }

    backspace() {
        if (this.resultShown) { this.clear(); return; }
        this.currentInput = this.currentInput.slice(0, -1);
        this.updateDisplay();
    }

    // ── ANS ──────────────────────────────────────────────────
    appendAns() {
        if (this.lastAnswer === null || this.lastAnswer === undefined) return;
        const ansStr = String(this.lastAnswer);
        if (this.resultShown) {
            this.currentInput = ansStr;
            this.resultShown  = false;
        } else {
            this.currentInput += ansStr;
        }
        this.updateDisplay();
    }

    // ── 2nd / Shift ──────────────────────────────────────────
    toggleShift() {
        this.shiftActive = !this.shiftActive;
        document.getElementById('shift-btn')?.classList.toggle('active', this.shiftActive);
        document.getElementById('keyboard-wrap')?.classList.toggle('shifted', this.shiftActive);
    }

    pressFunction(fn) {
        const s = this.shiftActive;
        const map = {
            sin:  s ? 'asin('  : 'sin(',
            cos:  s ? 'acos('  : 'cos(',
            tan:  s ? 'atan('  : 'tan(',
            log:  s ? '10^('   : 'log10(',
            ln:   s ? 'e^('    : 'log(',
            sqrt: s ? '^2'     : 'sqrt(',
        };
        const value = map[fn];
        if (!value) return;
        if (this.shiftActive) this.toggleShift();
        this.appendToDisplay(value);
    }

    toggleSign() {
        if (!this.currentInput) return;
        if (this.resultShown) {
            this.currentInput = this.currentInput.startsWith('-')
                ? this.currentInput.slice(1)
                : '-' + this.currentInput;
            this.updateDisplay();
            return;
        }
        this.currentInput = this.currentInput.startsWith('-')
            ? this.currentInput.slice(1)
            : '-' + this.currentInput;
        this.updateDisplay();
    }

    // ── Calculate ────────────────────────────────────────────
    calculate() {
        try {
            if (!this.currentInput) return;
            const expression = this.currentInput;
            let result;

            if (this.angleMode === 'deg') {
                const scope = {
                    sin:  x => Math.sin(x * Math.PI / 180),
                    cos:  x => Math.cos(x * Math.PI / 180),
                    tan:  x => Math.tan(x * Math.PI / 180),
                    asin: x => Math.asin(x) * 180 / Math.PI,
                    acos: x => Math.acos(x) * 180 / Math.PI,
                    atan: x => Math.atan(x) * 180 / Math.PI,
                };
                result = math.evaluate(expression, scope);
            } else {
                result = math.evaluate(expression);
            }

            const prevEl = document.getElementById('display-prev');
            if (prevEl) prevEl.textContent = expression + ' =';

            this.currentInput = String(result);
            this.lastAnswer   = result;
            this.resultShown  = true;
            this.updateDisplay();

            const ansEl = document.getElementById('display-ans');
            if (ansEl) ansEl.textContent = `Ans = ${result}`;

            this.addToCalcHistory(expression, result);

        } catch {
            const el = document.getElementById('display');
            if (el) { el.textContent = 'Error'; el.classList.add('result-mode'); }
            setTimeout(() => this.clear(), 1500);
        }
    }

    // ── Memory ──────────────────────────────────────────────
    memoryClear() {
        this.memoryValue = 0;
        this.updateMemoryDisplay();
    }

    memoryRecall() {
        this.appendToDisplay(String(this.memoryValue));
    }

    memoryAdd() {
        const current = parseFloat(document.getElementById('display')?.textContent) || 0;
        this.memoryValue += current;
        this.updateMemoryDisplay();
    }

    memorySubtract() {
        const current = parseFloat(document.getElementById('display')?.textContent) || 0;
        this.memoryValue -= current;
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

    // ── Angle mode ───────────────────────────────────────────
    setAngleMode(mode) {
        this.angleMode = mode;
        document.getElementById('deg-btn')?.classList.toggle('active', mode === 'deg');
        document.getElementById('rad-btn')?.classList.toggle('active', mode === 'rad');
    }

    // ── Clipboard ────────────────────────────────────────────
    copyResult() {
        const value = document.getElementById('display')?.textContent;
        if (!value || value === 'Error' || value === '0') return;
        navigator.clipboard.writeText(value).then(() => {
            const btn = document.getElementById('copy-btn');
            if (btn) {
                const orig = btn.textContent;
                btn.textContent = '✓ Copied!';
                setTimeout(() => btn.textContent = orig, 2000);
            }
        }).catch(() => {});
    }

    // ── History ──────────────────────────────────────────────
    addToCalcHistory(expression, result) {
        this.calcHistory.unshift({ expression, result });
        if (this.calcHistory.length > 50) this.calcHistory.pop();
        this.renderHistory();
    }

    clearHistory() {
        this.calcHistory = [];
        this.renderHistory();
    }

    renderHistory() {
        const list  = document.getElementById('history-list');
        const count = document.getElementById('history-count');
        if (!list) return;

        const n = this.calcHistory.length;
        if (count) count.textContent = `${n} ${n === 1 ? 'entry' : 'entries'}`;

        if (n === 0) {
            list.innerHTML = `
                <div class="hist-empty">
                    <div class="empty-icon">📈</div>
                    <p>No calculations yet</p>
                    <p class="empty-sub">Results appear here</p>
                </div>`;
            return;
        }

        list.innerHTML = this.calcHistory.map((item, i) => `
            <div class="history-item" onclick="calculator.loadFromHistory(${i})">
                <div class="history-expr">${this.escapeHtml(String(item.expression))}</div>
                <div class="history-result">= ${item.result}</div>
            </div>`).join('');
    }

    escapeHtml(str) {
        return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    loadFromHistory(index) {
        const item = this.calcHistory[index];
        if (!item) return;
        this.currentInput = String(item.result);
        this.resultShown  = false;
        this.updateDisplay();
        const prevEl = document.getElementById('display-prev');
        if (prevEl) prevEl.textContent = item.expression + ' =';
    }

    // ── Solver math keyboard helpers ─────────────────────────
    appendToInput(value) {
        const input = this.activeInput;
        if (!input) return;
        const start = input.selectionStart ?? input.value.length;
        const end   = input.selectionEnd   ?? input.value.length;
        input.value = input.value.slice(0, start) + value + input.value.slice(end);
        const newPos = start + value.length;
        input.focus();
        input.setSelectionRange(newPos, newPos);
    }

    appendAnsToInput() {
        if (this.lastAnswer === null || this.lastAnswer === undefined) return;
        this.appendToInput(String(this.lastAnswer));
    }

    backspaceInput() {
        const input = this.activeInput;
        if (!input) return;
        const start = input.selectionStart;
        const end   = input.selectionEnd;
        if (start !== end) {
            input.value = input.value.slice(0, start) + input.value.slice(end);
            input.focus();
            input.setSelectionRange(start, start);
        } else if (start > 0) {
            input.value = input.value.slice(0, start - 1) + input.value.slice(start);
            input.focus();
            input.setSelectionRange(start - 1, start - 1);
        } else {
            input.focus();
        }
    }

    clearInput() {
        const input = this.activeInput;
        if (!input) return;
        input.value = '';
        input.focus();
    }

    // ── Equation Solver ──────────────────────────────────────
    solveEquation() {
        const equationInput = document.getElementById('equation-input').value.trim();
        const solutionDiv   = document.getElementById('equation-solution');

        if (!equationInput) { this.showError(solutionDiv, 'Please enter an equation'); return; }

        try {
            let equation = equationInput.replace(/\s/g, '');
            const parts = equation.split('=');
            if (parts.length !== 2) throw new Error('Equation must contain exactly one = sign');

            const leftSide  = parts[0];
            const rightSide = parts[1];
            const expression = `${leftSide} - (${rightSide})`;

            const variables = this.findVariables(expression);
            if (variables.length === 0) throw new Error('No variable found in equation');
            const variable = variables[0];

            let solutions = [];
            const steps = [];

            steps.push(`Original equation: ${leftSide} = ${rightSide}`);
            steps.push(`Rearranged: ${expression} = 0`);

            const symbolicSolution = math.simplify(expression);
            steps.push(`Simplified: ${symbolicSolution.toString()} = 0`);

            if (this.isLinear(expression, variable)) {
                const solution = this.solveLinear(leftSide, rightSide, variable);
                solutions.push(solution);
                steps.push(`Solving for ${variable}: ${variable} = ${solution}`);
            } else {
                const startPoints = [-10, -1, 0, 1, 10];
                const foundSolutions = new Set();
                for (let start of startPoints) {
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

        } catch (error) {
            this.showError(solutionDiv, error.message);
        }
    }

    // ── Quadratic Solver ─────────────────────────────────────
    solveQuadratic() {
        const solutionDiv = document.getElementById('quadratic-solution');
        let a, b, c;

        const equationInput = document.getElementById('quad-equation').value.trim();
        if (equationInput) {
            try {
                const coeffs = this.parseQuadratic(equationInput);
                a = coeffs.a; b = coeffs.b; c = coeffs.c;
            } catch (error) { this.showError(solutionDiv, error.message); return; }
        } else {
            a = parseFloat(document.getElementById('quad-a').value) || 0;
            b = parseFloat(document.getElementById('quad-b').value) || 0;
            c = parseFloat(document.getElementById('quad-c').value) || 0;
        }

        if (a === 0) { this.showError(solutionDiv, 'Coefficient a cannot be 0 for a quadratic equation'); return; }

        const steps = [];
        steps.push(`Equation: ${a}x² + ${b}x + ${c} = 0`);
        steps.push(`Using quadratic formula: x = (-b ± √(b² - 4ac)) / 2a`);

        const discriminant = b * b - 4 * a * c;
        steps.push(`Discriminant: Δ = ${b}² - 4(${a})(${c}) = ${discriminant}`);

        const solutions = [];

        if (discriminant > 0) {
            steps.push('Δ > 0: Two distinct real solutions');
            const x1 = (-b + Math.sqrt(discriminant)) / (2 * a);
            const x2 = (-b - Math.sqrt(discriminant)) / (2 * a);
            steps.push(`x₁ = (-${b} + √${discriminant}) / ${2 * a} = ${x1}`);
            steps.push(`x₂ = (-${b} - √${discriminant}) / ${2 * a} = ${x2}`);
            solutions.push(x1, x2);
        } else if (discriminant === 0) {
            steps.push('Δ = 0: One repeated real solution');
            const x = -b / (2 * a);
            steps.push(`x = -${b} / ${2 * a} = ${x}`);
            solutions.push(x);
        } else {
            steps.push('Δ < 0: Two complex solutions');
            const realPart = -b / (2 * a);
            const imagPart = Math.sqrt(-discriminant) / (2 * a);
            steps.push(`x₁ = ${realPart} + ${imagPart}i`);
            steps.push(`x₂ = ${realPart} - ${imagPart}i`);
            solutions.push(`${realPart} + ${imagPart}i`, `${realPart} - ${imagPart}i`);
        }

        const h = -b / (2 * a);
        const k = a * h * h + b * h + c;
        steps.push(`Vertex: (${h}, ${k})`);

        this.displaySolution(solutionDiv, solutions, steps, 'x');
    }

    // ── Simultaneous Equations ───────────────────────────────
    solveSimultaneous() {
        const eq1 = document.getElementById('sim-eq1').value.trim();
        const eq2 = document.getElementById('sim-eq2').value.trim();
        const solutionDiv = document.getElementById('simultaneous-solution');

        if (!eq1 || !eq2) { this.showError(solutionDiv, 'Please enter both equations'); return; }

        try {
            const steps = [];
            steps.push(`Equation 1: ${eq1}`);
            steps.push(`Equation 2: ${eq2}`);

            const parsed1 = this.parseLinearEquation(eq1);
            const parsed2 = this.parseLinearEquation(eq2);

            steps.push('Standard form:');
            steps.push(`${parsed1.xCoeff}x + ${parsed1.yCoeff}y = ${parsed1.constant}`);
            steps.push(`${parsed2.xCoeff}x + ${parsed2.yCoeff}y = ${parsed2.constant}`);

            const a1 = parsed1.xCoeff, b1 = parsed1.yCoeff, c1 = parsed1.constant;
            const a2 = parsed2.xCoeff, b2 = parsed2.yCoeff, c2 = parsed2.constant;

            const determinant = a1 * b2 - a2 * b1;
            if (determinant === 0) throw new Error('System has no unique solution (lines are parallel or coincident)');

            steps.push("Using Cramer's Rule:");
            steps.push(`D = (${a1})(${b2}) - (${a2})(${b1}) = ${determinant}`);

            const x = (c1 * b2 - c2 * b1) / determinant;
            const y = (a1 * c2 - a2 * c1) / determinant;

            steps.push(`Dx = (${c1})(${b2}) - (${c2})(${b1}) = ${c1 * b2 - c2 * b1}`);
            steps.push(`Dy = (${a1})(${c2}) - (${a2})(${c1}) = ${a1 * c2 - a2 * c1}`);
            steps.push(`x = Dx / D = ${x}`);
            steps.push(`y = Dy / D = ${y}`);

            const check1 = Math.abs(a1 * x + b1 * y - c1) < 0.0001;
            const check2 = Math.abs(a2 * x + b2 * y - c2) < 0.0001;
            if (check1 && check2) steps.push('Verification: Solution satisfies both equations ✓');

            this.displaySolution(solutionDiv, [`x = ${x}`, `y = ${y}`], steps);

        } catch (error) {
            this.showError(solutionDiv, error.message);
        }
    }

    // ── Function Evaluation ──────────────────────────────────
    evaluateFunction() {
        const funcDef    = document.getElementById('function-def').value.trim();
        const xValue     = document.getElementById('function-x').value.trim();
        const solutionDiv = document.getElementById('function-solution');

        if (!funcDef || !xValue) { this.showError(solutionDiv, 'Please enter both function and x value'); return; }

        try {
            const x = parseFloat(xValue);
            if (isNaN(x)) throw new Error('Invalid x value');

            const steps = [];
            steps.push(`Function: f(x) = ${funcDef}`);
            steps.push(`Evaluate at x = ${x}`);
            steps.push(`Substitute: f(${x}) = ${funcDef.replace(/x/g, `(${x})`)}`);

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
            const startPoints = [-100, -10, -1, 0, 1, 10, 100];
            const foundSolutions = new Set();

            for (let start of startPoints) {
                const sol = this.newtonRaphson(expression, 'x', start);
                if (sol !== null && !isNaN(sol)) foundSolutions.add(Math.round(sol * 1e10) / 1e10);
            }

            const solutions = Array.from(foundSolutions);
            if (solutions.length === 0) throw new Error('No solutions found');

            steps.push(`Found ${solutions.length} solution(s) using numerical methods:`);
            solutions.forEach((sol, i) => {
                steps.push(`x${i + 1} = ${sol}`);
                const check = math.evaluate(funcDef, { x: sol });
                steps.push(`  Verify: f(${sol}) = ${check} ≈ ${target}`);
            });

            this.displaySolution(solutionDiv, solutions, steps, 'x');

        } catch (error) { this.showError(solutionDiv, error.message); }
    }

    // ── Math helpers ─────────────────────────────────────────
    findVariables(expression) {
        const vars = new Set();
        const matches = expression.match(/[a-z]/gi);
        if (matches) matches.forEach(v => vars.add(v));
        return Array.from(vars);
    }

    isLinear(expression, variable) {
        const pattern = new RegExp(`${variable}\\s*\\^\\s*[2-9]`, 'i');
        return !pattern.test(expression) &&
               !expression.includes('sin') &&
               !expression.includes('cos') &&
               !expression.includes('tan');
    }

    solveLinear(leftSide, rightSide, variable) {
        leftSide  = leftSide.replace(/\s/g, '');
        rightSide = rightSide.replace(/\s/g, '');
        const expr = `${leftSide} - (${rightSide})`;
        try {
            const val1 = math.evaluate(expr, { [variable]: 1 });
            const val0 = math.evaluate(expr, { [variable]: 0 });
            const coeff = val1 - val0;
            if (coeff === 0) throw new Error('Not a valid linear equation');
            return -val0 / coeff;
        } catch { throw new Error('Could not solve linear equation'); }
    }

    newtonRaphson(expression, variable, initialGuess, maxIterations = 50) {
        const tolerance = 1e-10;
        let x = initialGuess;

        for (let i = 0; i < maxIterations; i++) {
            try {
                const scope = { [variable]: x };
                const fx  = math.evaluate(expression, scope);
                const h   = 0.0001;
                scope[variable] = x + h;
                const fxh = math.evaluate(expression, scope);
                const derivative = (fxh - fx) / h;

                if (Math.abs(derivative) < tolerance) break;
                const xNew = x - fx / derivative;
                if (Math.abs(xNew - x) < tolerance) return xNew;
                x = xNew;

                scope[variable] = x;
                if (Math.abs(math.evaluate(expression, scope)) < tolerance) return x;
            } catch { return null; }
        }

        try {
            if (Math.abs(math.evaluate(expression, { [variable]: x })) < 0.01) return x;
        } catch {}

        return null;
    }

    parseQuadratic(equation) {
        equation = equation.replace(/\s/g, '').toLowerCase();
        const parts = equation.split('=');
        if (parts.length !== 2) throw new Error('Equation must contain = sign');

        let expression = parts[0];
        const rightSide = parts[1];
        if (rightSide !== '0') expression = `${expression}-(${rightSide})`;

        let a = 0, b = 0, c = 0;
        const x2Match = expression.match(/([+-]?\d*\.?\d*)\*?x\^2|([+-]?\d*\.?\d*)x\*\*2|([+-]?\d*\.?\d*)x²/);
        if (x2Match) {
            const coeff = x2Match[1] || x2Match[2] || x2Match[3];
            a = coeff === '' || coeff === '+' ? 1 : coeff === '-' ? -1 : parseFloat(coeff);
        }

        const xMatch = expression.match(/([+-]?\d*\.?\d*)\*?x(?!\^|²|\*\*)/);
        if (xMatch) {
            const coeff = xMatch[1];
            b = coeff === '' || coeff === '+' ? 1 : coeff === '-' ? -1 : parseFloat(coeff);
        }

        try { c = math.evaluate(expression, { x: 0 }); } catch { c = 0; }

        return { a, b, c };
    }

    parseLinearEquation(equation) {
        equation = equation.replace(/\s/g, '').toLowerCase();
        const parts = equation.split('=');
        if (parts.length !== 2) throw new Error('Invalid equation format');

        const leftSide = parts[0];
        const constant = parseFloat(parts[1]) || 0;

        let xCoeff = 0;
        const xMatch = leftSide.match(/([+-]?\d*\.?\d*)\*?x/);
        if (xMatch) {
            const coeff = xMatch[1];
            xCoeff = coeff === '' || coeff === '+' ? 1 : coeff === '-' ? -1 : parseFloat(coeff);
        }

        let yCoeff = 0;
        const yMatch = leftSide.match(/([+-]?\d*\.?\d*)\*?y/);
        if (yMatch) {
            const coeff = yMatch[1];
            yCoeff = coeff === '' || coeff === '+' ? 1 : coeff === '-' ? -1 : parseFloat(coeff);
        }

        return { xCoeff, yCoeff, constant };
    }

    displaySolution(solutionDiv, solutions, steps, variable = null) {
        solutionDiv.classList.add('show');

        let html = '<h3>Solution:</h3>';
        solutions.forEach((sol, index) => {
            if (variable && typeof sol === 'number') {
                html += `<div class="result">${variable}${solutions.length > 1 ? '₍' + (index + 1) + '₎' : ''} = ${sol}</div>`;
            } else {
                html += `<div class="result">${sol}</div>`;
            }
        });

        if (steps && steps.length > 0) {
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
    document.addEventListener('keydown', (e) => {
        // If a solver input has focus, let it handle typing normally
        if (document.activeElement.classList.contains('solver-input')) return;

        if ((e.key >= '0' && e.key <= '9') || e.key === '.') {
            calculator.appendToDisplay(e.key);
        } else if (['+', '-', '*', '/'].includes(e.key)) {
            calculator.appendToDisplay(e.key);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            calculator.calculate();
        } else if (e.key === 'Escape') {
            calculator.clear();
        } else if (e.key === 'Backspace') {
            calculator.backspace();
        } else if (e.key.toLowerCase() === 'a') {
            calculator.appendAns();
        }
    });

    // Enter key in solver inputs triggers the solve action
    document.querySelectorAll('.solver-input').forEach(input => {
        input.addEventListener('keydown', (e) => {
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
