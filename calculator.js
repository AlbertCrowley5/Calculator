class Calculator {
    constructor() {
        this.currentInput = '';
        this.history = '';
        this.previousAnswer = 0;
        this.lastResult = null; // Store exact numeric result
        this.isResultDisplayed = false; // Track if showing a result
        this.initializeModeSwitching();
    }

    initializeModeSwitching() {
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.getAttribute('data-mode');
                this.switchMode(mode);
            });
        });
    }

    switchMode(mode) {
        // Update active button
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');

        // Update active mode
        document.querySelectorAll('.calculator-mode').forEach(m => {
            m.classList.remove('active');
        });
        document.getElementById(`${mode}-mode`).classList.add('active');

        // Clear previous solutions
        this.clearSolutions();
    }

    clearSolutions() {
        const solutions = document.querySelectorAll('.solution-display');
        solutions.forEach(sol => {
            sol.classList.remove('show');
            sol.innerHTML = '';
        });
    }

    appendToDisplay(value) {
        // If a result is displayed and user types an operator, continue from result
        if (this.isResultDisplayed && (value === '+' || value === '-' || value === '*' || value === '/' || value === '^')) {
            this.currentInput = this.formatNumberForCalculation(this.lastResult) + value;
            this.isResultDisplayed = false;
        }
        // If a result is displayed and user types anything else, start fresh
        else if (this.isResultDisplayed) {
            this.currentInput = value;
            this.isResultDisplayed = false;
        }
        // Normal append
        else {
            this.currentInput += value;
        }
        document.getElementById('display').value = this.currentInput;
    }

    // Handle text input for function names
    handleTextInput(text) {
        this.currentInput += text;
        document.getElementById('display').value = this.currentInput;
    }

    clear() {
        this.currentInput = '';
        this.history = '';
        this.lastResult = null;
        this.isResultDisplayed = false;
        document.getElementById('display').value = '';
        document.getElementById('history').textContent = '';
    }

    // Format number for calculation (full precision)
    formatNumberForCalculation(num) {
        if (num === null || num === undefined) return '0';
        // Use maximum precision
        return num.toPrecision(15);
    }

    // Format number for display (rounded to remove floating point errors)
    formatNumberForDisplay(num) {
        if (num === null || num === undefined) return '0';

        // Round to 12 significant figures to remove floating point errors
        const rounded = parseFloat(num.toPrecision(12));

        // If the number is very close to an integer, show it as an integer
        if (Math.abs(rounded - Math.round(rounded)) < 1e-10) {
            return Math.round(rounded).toString();
        }

        return rounded.toString();
    }

    backspace() {
        // If showing a result, clear it completely on first backspace
        if (this.isResultDisplayed) {
            this.currentInput = '';
            this.isResultDisplayed = false;
        } else {
            this.currentInput = this.currentInput.slice(0, -1);
        }
        document.getElementById('display').value = this.currentInput;
    }

    calculate() {
        try {
            if (!this.currentInput) return;

            // Store history
            this.history = this.currentInput;

            // Evaluate expression using math.js (exact calculation)
            const result = math.evaluate(this.currentInput);

            // Store exact result
            this.lastResult = result;
            this.previousAnswer = result;
            this.isResultDisplayed = true;

            // Display rounded result
            const displayValue = this.formatNumberForDisplay(result);

            // Update display
            document.getElementById('history').textContent = this.history + ' =';
            document.getElementById('display').value = displayValue;

            // Store display value as current input (but we'll use lastResult for calculations)
            this.currentInput = displayValue;
        } catch (error) {
            document.getElementById('display').value = 'Error';
            this.isResultDisplayed = false;
            setTimeout(() => {
                this.clear();
            }, 1500);
        }
    }

    insertAns() {
        // Use full precision when inserting ANS
        const ansValue = this.formatNumberForCalculation(this.previousAnswer);
        this.appendToDisplay(ansValue);
    }

    // Equation Solver
    solveEquation() {
        const equationInput = document.getElementById('equation-input').value.trim();
        const solutionDiv = document.getElementById('equation-solution');

        if (!equationInput) {
            this.showError(solutionDiv, 'Please enter an equation');
            return;
        }

        try {
            // Parse the equation
            let equation = equationInput.replace(/\s/g, '');

            // Split by equals sign
            const parts = equation.split('=');
            if (parts.length !== 2) {
                throw new Error('Equation must contain exactly one = sign');
            }

            // Rearrange to form: leftSide - rightSide = 0
            const leftSide = parts[0];
            const rightSide = parts[1];
            const expression = `${leftSide} - (${rightSide})`;

            // Find the variable (assuming x, but could be other)
            const variables = this.findVariables(expression);
            if (variables.length === 0) {
                throw new Error('No variable found in equation');
            }
            const variable = variables[0];

            // Solve using nsolve for numerical solution
            let solutions = [];
            const steps = [];

            steps.push(`Original equation: ${leftSide} = ${rightSide}`);
            steps.push(`Rearranged: ${expression} = 0`);

            try {
                // Try symbolic solving first
                const symbolicSolution = math.simplify(expression);
                steps.push(`Simplified: ${symbolicSolution.toString()} = 0`);

                // Try to solve algebraically
                // For linear equations
                if (this.isLinear(expression, variable)) {
                    const solution = this.solveLinear(leftSide, rightSide, variable);
                    solutions.push(solution);
                    steps.push(`Solving for ${variable}: ${variable} = ${solution}`);
                } else {
                    // Try numerical solving for non-linear
                    // Try multiple starting points
                    const startPoints = [-10, -1, 0, 1, 10];
                    const foundSolutions = new Set();

                    for (let start of startPoints) {
                        try {
                            const scope = {};
                            scope[variable] = start;
                            const sol = this.newtonRaphson(expression, variable, start);
                            if (sol !== null && !isNaN(sol)) {
                                // Round to avoid duplicates
                                const rounded = Math.round(sol * 1e10) / 1e10;
                                foundSolutions.add(rounded);
                            }
                        } catch (e) {
                            // Continue to next starting point
                        }
                    }

                    solutions = Array.from(foundSolutions);
                    if (solutions.length > 0) {
                        steps.push(`Found solution(s) using numerical methods:`);
                    }
                }
            } catch (e) {
                throw new Error('Could not solve equation: ' + e.message);
            }

            if (solutions.length === 0) {
                throw new Error('No solutions found');
            }

            this.displaySolution(solutionDiv, solutions, steps, variable);

        } catch (error) {
            this.showError(solutionDiv, error.message);
        }
    }

    // Quadratic Solver
    solveQuadratic() {
        const solutionDiv = document.getElementById('quadratic-solution');
        let a, b, c;

        // Try to get from full equation first
        const equationInput = document.getElementById('quad-equation').value.trim();

        if (equationInput) {
            try {
                const coeffs = this.parseQuadratic(equationInput);
                a = coeffs.a;
                b = coeffs.b;
                c = coeffs.c;
            } catch (error) {
                this.showError(solutionDiv, error.message);
                return;
            }
        } else {
            // Get from individual inputs
            a = parseFloat(document.getElementById('quad-a').value) || 0;
            b = parseFloat(document.getElementById('quad-b').value) || 0;
            c = parseFloat(document.getElementById('quad-c').value) || 0;
        }

        if (a === 0) {
            this.showError(solutionDiv, 'Coefficient a cannot be 0 for a quadratic equation');
            return;
        }

        const steps = [];
        steps.push(`Equation: ${a}x² + ${b}x + ${c} = 0`);
        steps.push(`Using quadratic formula: x = (-b ± √(b² - 4ac)) / 2a`);

        const discriminant = b * b - 4 * a * c;
        steps.push(`Calculate discriminant: Δ = b² - 4ac = ${b}² - 4(${a})(${c}) = ${discriminant}`);

        const solutions = [];

        if (discriminant > 0) {
            steps.push(`Δ > 0: Two distinct real solutions`);
            const x1 = (-b + Math.sqrt(discriminant)) / (2 * a);
            const x2 = (-b - Math.sqrt(discriminant)) / (2 * a);
            steps.push(`x₁ = (-${b} + √${discriminant}) / ${2 * a} = ${x1}`);
            steps.push(`x₂ = (-${b} - √${discriminant}) / ${2 * a} = ${x2}`);
            solutions.push(x1, x2);
        } else if (discriminant === 0) {
            steps.push(`Δ = 0: One repeated real solution`);
            const x = -b / (2 * a);
            steps.push(`x = -${b} / ${2 * a} = ${x}`);
            solutions.push(x);
        } else {
            steps.push(`Δ < 0: Two complex solutions`);
            const realPart = -b / (2 * a);
            const imagPart = Math.sqrt(-discriminant) / (2 * a);
            steps.push(`x₁ = ${realPart} + ${imagPart}i`);
            steps.push(`x₂ = ${realPart} - ${imagPart}i`);
            solutions.push(`${realPart} + ${imagPart}i`, `${realPart} - ${imagPart}i`);
        }

        // Vertex calculation
        const h = -b / (2 * a);
        const k = a * h * h + b * h + c;
        steps.push(`Vertex: (${h}, ${k})`);

        this.displaySolution(solutionDiv, solutions, steps, 'x');
    }

    // Simultaneous Equations Solver
    solveSimultaneous() {
        const eq1 = document.getElementById('sim-eq1').value.trim();
        const eq2 = document.getElementById('sim-eq2').value.trim();
        const solutionDiv = document.getElementById('simultaneous-solution');

        if (!eq1 || !eq2) {
            this.showError(solutionDiv, 'Please enter both equations');
            return;
        }

        try {
            const steps = [];
            steps.push(`Equation 1: ${eq1}`);
            steps.push(`Equation 2: ${eq2}`);

            // Parse both equations
            const parsed1 = this.parseLinearEquation(eq1);
            const parsed2 = this.parseLinearEquation(eq2);

            steps.push(`Standard form:`);
            steps.push(`${parsed1.xCoeff}x + ${parsed1.yCoeff}y = ${parsed1.constant}`);
            steps.push(`${parsed2.xCoeff}x + ${parsed2.yCoeff}y = ${parsed2.constant}`);

            // Solve using Cramer's rule or elimination
            const a1 = parsed1.xCoeff, b1 = parsed1.yCoeff, c1 = parsed1.constant;
            const a2 = parsed2.xCoeff, b2 = parsed2.yCoeff, c2 = parsed2.constant;

            const determinant = a1 * b2 - a2 * b1;

            if (determinant === 0) {
                throw new Error('System has no unique solution (lines are parallel or coincident)');
            }

            steps.push(`Using Cramer's Rule:`);
            steps.push(`D = (${a1})(${b2}) - (${a2})(${b1}) = ${determinant}`);

            const x = (c1 * b2 - c2 * b1) / determinant;
            const y = (a1 * c2 - a2 * c1) / determinant;

            steps.push(`Dx = (${c1})(${b2}) - (${c2})(${b1}) = ${c1 * b2 - c2 * b1}`);
            steps.push(`Dy = (${a1})(${c2}) - (${a2})(${c1}) = ${a1 * c2 - a2 * c1}`);
            steps.push(`x = Dx / D = ${x}`);
            steps.push(`y = Dy / D = ${y}`);

            // Verify solution
            const check1 = Math.abs(a1 * x + b1 * y - c1) < 0.0001;
            const check2 = Math.abs(a2 * x + b2 * y - c2) < 0.0001;

            if (check1 && check2) {
                steps.push(`Verification: Solution satisfies both equations ✓`);
            }

            const solutions = [`x = ${x}`, `y = ${y}`];
            this.displaySolution(solutionDiv, solutions, steps);

        } catch (error) {
            this.showError(solutionDiv, error.message);
        }
    }

    // Function Evaluation
    evaluateFunction() {
        const funcDef = document.getElementById('function-def').value.trim();
        const xValue = document.getElementById('function-x').value.trim();
        const solutionDiv = document.getElementById('function-solution');

        if (!funcDef || !xValue) {
            this.showError(solutionDiv, 'Please enter both function and x value');
            return;
        }

        try {
            const x = parseFloat(xValue);
            if (isNaN(x)) {
                throw new Error('Invalid x value');
            }

            const steps = [];
            steps.push(`Function: f(x) = ${funcDef}`);
            steps.push(`Evaluate at x = ${x}`);
            steps.push(`Substitute: f(${x}) = ${funcDef.replace(/x/g, `(${x})`)}`);

            const result = math.evaluate(funcDef, { x: x });
            steps.push(`Result: f(${x}) = ${result}`);

            this.displaySolution(solutionDiv, [result], steps);

        } catch (error) {
            this.showError(solutionDiv, error.message);
        }
    }

    // Solve Function Equation
    solveFunctionEquation() {
        const funcDef = document.getElementById('function-def').value.trim();
        const targetValue = document.getElementById('function-value').value.trim();
        const solutionDiv = document.getElementById('function-solution');

        if (!funcDef || targetValue === '') {
            this.showError(solutionDiv, 'Please enter both function and target value');
            return;
        }

        try {
            const target = parseFloat(targetValue);
            if (isNaN(target)) {
                throw new Error('Invalid target value');
            }

            const steps = [];
            steps.push(`Solve: ${funcDef} = ${target}`);
            steps.push(`Rearrange: ${funcDef} - ${target} = 0`);

            const expression = `(${funcDef}) - ${target}`;

            // Try multiple starting points for numerical solution
            const startPoints = [-100, -10, -1, 0, 1, 10, 100];
            const foundSolutions = new Set();

            for (let start of startPoints) {
                const sol = this.newtonRaphson(expression, 'x', start);
                if (sol !== null && !isNaN(sol)) {
                    const rounded = Math.round(sol * 1e10) / 1e10;
                    foundSolutions.add(rounded);
                }
            }

            const solutions = Array.from(foundSolutions);

            if (solutions.length === 0) {
                throw new Error('No solutions found');
            }

            steps.push(`Found ${solutions.length} solution(s) using numerical methods:`);
            solutions.forEach((sol, i) => {
                steps.push(`x${i + 1} = ${sol}`);
                // Verify
                const check = math.evaluate(funcDef, { x: sol });
                steps.push(`  Verify: f(${sol}) = ${check} ≈ ${target}`);
            });

            this.displaySolution(solutionDiv, solutions, steps, 'x');

        } catch (error) {
            this.showError(solutionDiv, error.message);
        }
    }

    // Helper Functions
    findVariables(expression) {
        const vars = new Set();
        const matches = expression.match(/[a-z]/gi);
        if (matches) {
            matches.forEach(v => vars.add(v));
        }
        return Array.from(vars);
    }

    isLinear(expression, variable) {
        // Check if expression contains x^2, x^3, etc.
        const pattern = new RegExp(`${variable}\\s*\\^\\s*[2-9]`, 'i');
        return !pattern.test(expression) && !expression.includes('sin') &&
               !expression.includes('cos') && !expression.includes('tan');
    }

    solveLinear(leftSide, rightSide, variable) {
        // Parse coefficients for ax + b = c form
        leftSide = leftSide.replace(/\s/g, '');
        rightSide = rightSide.replace(/\s/g, '');

        // Simple linear solver
        const expr = `${leftSide} - (${rightSide})`;

        // Get coefficient of x and constant
        let coeff = 0;
        let constant = 0;

        try {
            // Evaluate with x=1 and x=0 to find slope and intercept
            const val1 = math.evaluate(expr, { [variable]: 1 });
            const val0 = math.evaluate(expr, { [variable]: 0 });

            coeff = val1 - val0;
            constant = val0;

            if (coeff === 0) {
                throw new Error('Not a valid linear equation');
            }

            return -constant / coeff;
        } catch (e) {
            throw new Error('Could not solve linear equation');
        }
    }

    newtonRaphson(expression, variable, initialGuess, maxIterations = 50) {
        const tolerance = 1e-10;
        let x = initialGuess;

        for (let i = 0; i < maxIterations; i++) {
            try {
                // Evaluate function at x
                const scope = {};
                scope[variable] = x;
                const fx = math.evaluate(expression, scope);

                // Calculate derivative numerically
                const h = 0.0001;
                scope[variable] = x + h;
                const fxh = math.evaluate(expression, scope);
                const derivative = (fxh - fx) / h;

                if (Math.abs(derivative) < tolerance) {
                    break;
                }

                const xNew = x - fx / derivative;

                if (Math.abs(xNew - x) < tolerance) {
                    return xNew;
                }

                x = xNew;

                // Check if we found a solution
                scope[variable] = x;
                const check = math.evaluate(expression, scope);
                if (Math.abs(check) < tolerance) {
                    return x;
                }

            } catch (e) {
                return null;
            }
        }

        // Verify final answer
        try {
            const scope = {};
            scope[variable] = x;
            const check = math.evaluate(expression, scope);
            if (Math.abs(check) < 0.01) {
                return x;
            }
        } catch (e) {
            return null;
        }

        return null;
    }

    parseQuadratic(equation) {
        // Remove spaces and convert to lowercase
        equation = equation.replace(/\s/g, '').toLowerCase();

        // Split by equals
        const parts = equation.split('=');
        if (parts.length !== 2) {
            throw new Error('Equation must contain = sign');
        }

        let expression = parts[0];
        const rightSide = parts[1];

        // Move right side to left
        if (rightSide !== '0') {
            expression = `${expression}-(${rightSide})`;
        }

        // Try to extract coefficients
        let a = 0, b = 0, c = 0;

        // Find x^2 coefficient
        const x2Match = expression.match(/([+-]?\d*\.?\d*)\*?x\^2|([+-]?\d*\.?\d*)x\*\*2|([+-]?\d*\.?\d*)x²/);
        if (x2Match) {
            const coeff = x2Match[1] || x2Match[2] || x2Match[3];
            a = coeff === '' || coeff === '+' ? 1 : coeff === '-' ? -1 : parseFloat(coeff);
        }

        // Find x coefficient (but not x^2)
        const xMatch = expression.match(/([+-]?\d*\.?\d*)\*?x(?!\^|²|\*\*)/);
        if (xMatch) {
            const coeff = xMatch[1];
            b = coeff === '' || coeff === '+' ? 1 : coeff === '-' ? -1 : parseFloat(coeff);
        }

        // Find constant by evaluating at x=0
        try {
            c = math.evaluate(expression, { x: 0 });
        } catch (e) {
            c = 0;
        }

        return { a, b, c };
    }

    parseLinearEquation(equation) {
        // Parse equation of form ax + by = c
        equation = equation.replace(/\s/g, '').toLowerCase();

        const parts = equation.split('=');
        if (parts.length !== 2) {
            throw new Error('Invalid equation format');
        }

        const leftSide = parts[0];
        const constant = parseFloat(parts[1]) || 0;

        // Extract x coefficient
        let xCoeff = 0;
        const xMatch = leftSide.match(/([+-]?\d*\.?\d*)\*?x/);
        if (xMatch) {
            const coeff = xMatch[1];
            xCoeff = coeff === '' || coeff === '+' ? 1 : coeff === '-' ? -1 : parseFloat(coeff);
        }

        // Extract y coefficient
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

        // Display results
        solutions.forEach((sol, index) => {
            if (variable && typeof sol === 'number') {
                html += `<div class="result">${variable}${solutions.length > 1 ? '₍' + (index + 1) + '₎' : ''} = ${sol}</div>`;
            } else {
                html += `<div class="result">${sol}</div>`;
            }
        });

        // Display steps
        if (steps && steps.length > 0) {
            html += '<div class="steps"><h4>Step-by-step solution:</h4>';
            steps.forEach(step => {
                html += `<div class="step">${step}</div>`;
            });
            html += '</div>';
        }

        solutionDiv.innerHTML = html;
    }

    showError(solutionDiv, message) {
        solutionDiv.classList.add('show', 'error');
        solutionDiv.innerHTML = `<h3>Error:</h3><div class="result">${message}</div>`;

        setTimeout(() => {
            solutionDiv.classList.remove('error');
        }, 3000);
    }
}

// Initialize calculator
const calculator = new Calculator();

// Keyboard support for basic calculator
document.addEventListener('DOMContentLoaded', () => {
    const display = document.getElementById('display');

    document.addEventListener('keydown', (e) => {
        if (document.activeElement.tagName === 'INPUT' && document.activeElement.id !== 'display') {
            return;
        }

        // Ignore modifier keys and special keys
        if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta' ||
            e.key === 'CapsLock' || e.key === 'Tab' || e.key.startsWith('Arrow') ||
            e.key === 'Insert' || e.key === 'Delete' || e.key === 'Home' || e.key === 'End' ||
            e.key === 'PageUp' || e.key === 'PageDown' || e.key.startsWith('F')) {
            return;
        }

        // Enter to calculate
        if (e.key === 'Enter') {
            e.preventDefault();
            calculator.calculate();
        }
        // Escape to clear
        else if (e.key === 'Escape') {
            calculator.clear();
        }
        // Backspace to delete
        else if (e.key === 'Backspace') {
            e.preventDefault();
            calculator.backspace();
        }
        // Numbers and decimal point
        else if ((e.key >= '0' && e.key <= '9') || e.key === '.') {
            calculator.appendToDisplay(e.key);
        }
        // Single letter characters only (for function names like sin, cos, log, etc.)
        else if (e.key.length === 1 && ((e.key >= 'a' && e.key <= 'z') || (e.key >= 'A' && e.key <= 'Z'))) {
            calculator.appendToDisplay(e.key.toLowerCase());
        }
        // Basic operators
        else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
            calculator.appendToDisplay(e.key);
        }
        // Parentheses and brackets
        else if (e.key === '(' || e.key === ')' || e.key === '[' || e.key === ']' || e.key === '{' || e.key === '}') {
            calculator.appendToDisplay(e.key);
        }
        // Power/exponent
        else if (e.key === '^') {
            calculator.appendToDisplay(e.key);
        }
        // Comma (for function arguments like nthRoot(8, 3))
        else if (e.key === ',') {
            calculator.appendToDisplay(e.key);
        }
        // Percentage
        else if (e.key === '%') {
            calculator.appendToDisplay(e.key);
        }
        // Space (optional, for readability)
        else if (e.key === ' ') {
            calculator.appendToDisplay(e.key);
        }
    });

    // Add Enter key support for equation inputs
    const equationInputs = document.querySelectorAll('.equation-input');
    equationInputs.forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const mode = input.closest('.calculator-mode').id;

                if (mode === 'equation-mode') {
                    calculator.solveEquation();
                } else if (mode === 'quadratic-mode') {
                    calculator.solveQuadratic();
                } else if (mode === 'simultaneous-mode') {
                    calculator.solveSimultaneous();
                }
            }
        });
    });
});
