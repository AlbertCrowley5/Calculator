class Calculator {
    constructor() {
        this.currentInput = '';
        this.history = '';
        this.previousAnswer = 0;
        this.lastResult = null; // Store exact numeric result for backward compatibility
        this.lastResultExpression = null; // Store exact symbolic expression
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
        // If a result is displayed and user types an operator, continue from exact result
        if (this.isResultDisplayed && (value === '+' || value === '-' || value === '*' || value === '/' || value === '^')) {
            // Use the exact symbolic expression if available
            if (this.lastResultExpression) {
                this.currentInput = '(' + this.lastResultExpression + ')' + value;
            } else {
                this.currentInput = this.formatNumberForCalculation(this.lastResult) + value;
            }
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
        this.lastResultExpression = null;
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

            // Try to simplify symbolically first to keep exact form
            let symbolicResult;
            try {
                symbolicResult = math.simplify(this.currentInput);
                // Store the exact symbolic expression as a string
                this.lastResultExpression = symbolicResult.toString();
            } catch (e) {
                // If symbolic simplification fails, we'll just use the original expression
                this.lastResultExpression = this.currentInput;
            }

            // Evaluate to numeric for display
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

            // Store display value as current input (but we'll use symbolic expression for calculations)
            this.currentInput = displayValue;
        } catch (error) {
            document.getElementById('display').value = 'Error';
            this.isResultDisplayed = false;
            this.lastResultExpression = null;
            setTimeout(() => {
                this.clear();
            }, 1500);
        }
    }

    insertAns() {
        // Use exact symbolic expression if available, otherwise use numeric value
        if (this.lastResultExpression) {
            this.appendToDisplay('(' + this.lastResultExpression + ')');
        } else {
            const ansValue = this.formatNumberForCalculation(this.previousAnswer);
            this.appendToDisplay(ansValue);
        }
    }

    // Unified Equation Solver — handles linear, quadratic, cubic, and higher-degree equations
    solveEquation() {
        const equationInput = document.getElementById('equation-input').value.trim();
        const solutionDiv = document.getElementById('equation-solution');

        if (!equationInput) {
            this.showError(solutionDiv, 'Please enter an equation');
            return;
        }

        try {
            let equation = equationInput.replace(/\s/g, '');

            const parts = equation.split('=');
            if (parts.length !== 2) {
                throw new Error('Equation must contain exactly one = sign');
            }

            const leftSide = parts[0];
            const rightSide = parts[1];
            const expression = `${leftSide} - (${rightSide})`;

            const variables = this.findVariables(expression);
            if (variables.length === 0) {
                throw new Error('No variable found in equation');
            }
            const variable = variables[0];

            const steps = [];
            let solutions = [];

            steps.push(`📝 Original Equation: ${leftSide} = ${rightSide}`);
            steps.push(`🔄 Rearranged: ${leftSide} - (${rightSide}) = 0`);

            if (this.isLinear(expression, variable)) {
                // Linear equation: ax + b = 0
                steps.push(`📊 Equation Type: Linear`);
                const solution = this.solveLinear(leftSide, rightSide, variable);
                solutions.push(solution);
                steps.push(`✅ Solution: ${variable} = ${this.formatNumberForDisplay(solution)}`);

            } else if (this.isQuadratic(expression, variable)) {
                // Quadratic: ax² + bx + c = 0
                steps.push(`📊 Equation Type: Quadratic`);
                const coeffs = this.extractQuadraticCoeffs(expression, variable);
                const { a, b, c } = coeffs;

                steps.push(`📐 Standard form: ${this.formatCoeff(a)}${variable}² + ${this.formatCoeff(b, true)}${variable} + ${this.formatCoeff(c, true)} = 0`);
                steps.push(`📐 Coefficients: a = ${this.formatNumberForDisplay(a)}, b = ${this.formatNumberForDisplay(b)}, c = ${this.formatNumberForDisplay(c)}`);
                steps.push(`📋 Quadratic formula: ${variable} = (-b ± √(b² - 4ac)) / (2a)`);

                const discriminant = b * b - 4 * a * c;
                steps.push(`🔢 Discriminant: Δ = b² - 4ac = (${this.formatNumberForDisplay(b)})² - 4(${this.formatNumberForDisplay(a)})(${this.formatNumberForDisplay(c)}) = ${this.formatNumberForDisplay(discriminant)}`);

                if (discriminant > 0) {
                    steps.push(`✅ Δ > 0: Two distinct real solutions`);
                    const x1 = (-b + Math.sqrt(discriminant)) / (2 * a);
                    const x2 = (-b - Math.sqrt(discriminant)) / (2 * a);
                    steps.push(`🎯 ${variable}₁ = (-${this.formatNumberForDisplay(b)} + √${this.formatNumberForDisplay(discriminant)}) / (2·${this.formatNumberForDisplay(a)}) = ${this.formatNumberForDisplay(x1)}`);
                    steps.push(`🎯 ${variable}₂ = (-${this.formatNumberForDisplay(b)} - √${this.formatNumberForDisplay(discriminant)}) / (2·${this.formatNumberForDisplay(a)}) = ${this.formatNumberForDisplay(x2)}`);
                    solutions.push(x1, x2);
                } else if (discriminant === 0) {
                    steps.push(`✅ Δ = 0: One repeated real solution`);
                    const x = -b / (2 * a);
                    steps.push(`🎯 ${variable} = -${this.formatNumberForDisplay(b)} / (2·${this.formatNumberForDisplay(a)}) = ${this.formatNumberForDisplay(x)}`);
                    solutions.push(x);
                } else {
                    steps.push(`❌ Δ < 0: No real solutions (two complex solutions)`);
                    const realPart = this.formatNumberForDisplay(-b / (2 * a));
                    const imagPart = this.formatNumberForDisplay(Math.sqrt(-discriminant) / (2 * a));
                    steps.push(`🔢 Complex solutions:`);
                    steps.push(`   ${variable}₁ = ${realPart} + ${imagPart}i`);
                    steps.push(`   ${variable}₂ = ${realPart} - ${imagPart}i`);
                    solutions.push(`${realPart} + ${imagPart}i`, `${realPart} - ${imagPart}i`);
                }

                // Vertex
                const h = this.formatNumberForDisplay(-b / (2 * a));
                const k = this.formatNumberForDisplay(a * (-b / (2 * a)) ** 2 + b * (-b / (2 * a)) + c);
                steps.push(`📍 Vertex: (${h}, ${k})`);

            } else if (this.isCubic(expression, variable)) {
                // Cubic: ax³ + bx² + cx + d = 0
                steps.push(`📊 Equation Type: Cubic`);
                const result = this.solveCubic(expression, variable, steps);
                solutions = result.solutions;

            } else {
                // Higher-degree / transcendental — numerical methods
                steps.push(`📊 Equation Type: Higher-degree (using numerical methods)`);
                steps.push(`🔍 Searching for real solutions...`);
                const startPoints = [-100, -10, -5, -2, -1, -0.5, 0, 0.5, 1, 2, 5, 10, 100];
                const foundSolutions = new Set();

                for (const start of startPoints) {
                    const sol = this.newtonRaphson(expression, variable, start);
                    if (sol !== null && !isNaN(sol) && isFinite(sol)) {
                        foundSolutions.add(Math.round(sol * 1e10) / 1e10);
                    }
                }

                solutions = Array.from(foundSolutions);
                if (solutions.length === 0) {
                    steps.push(`❌ No real solutions found`);
                    throw new Error('No real solutions found');
                }
                steps.push(`✅ Found ${solutions.length} real solution(s)`);
            }

            this.displaySolution(solutionDiv, solutions, steps, variable);

        } catch (error) {
            this.showError(solutionDiv, error.message);
        }
    }

    // Helper to format coefficient with sign
    formatCoeff(val, includeSign = false) {
        const num = this.formatNumberForDisplay(val);
        if (includeSign) {
            return val >= 0 ? `+ ${num}` : `- ${Math.abs(val)}`;
        }
        return num;
    }

    // Extract a, b, c coefficients directly from a quadratic expression
    extractQuadraticCoeffs(expression, variable) {
        // Evaluate at three points to determine a, b, c from ax²+bx+c
        const f = (v) => math.evaluate(expression, { [variable]: v });
        const f0 = f(0);  // c
        const f1 = f(1);  // a + b + c
        const fm1 = f(-1); // a - b + c
        const a = (f1 + fm1 - 2 * f0) / 2;
        const b = (f1 - fm1) / 2;
        const c = f0;
        return { a, b, c };
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
        const quadraticOrHigher = new RegExp(`${variable}\\s*\\^\\s*[2-9]`, 'i');
        return !quadraticOrHigher.test(expression) &&
               !expression.includes('sin') && !expression.includes('cos') && !expression.includes('tan');
    }

    isQuadratic(expression, variable) {
        // Has x^2 but not x^3 or higher, and no trig/log functions
        const quadratic = new RegExp(`${variable}\\s*\\^\\s*2`, 'i');
        const cubic = new RegExp(`${variable}\\s*\\^\\s*[3-9]`, 'i');
        return quadratic.test(expression) && !cubic.test(expression) &&
               !expression.includes('sin') && !expression.includes('cos') &&
               !expression.includes('tan') && !expression.includes('log') &&
               !expression.includes('sqrt');
    }

    isCubic(expression, variable) {
        // Has x^3 but not x^4 or higher, and no trig/log functions
        const cubic = new RegExp(`${variable}\\s*\\^\\s*3`, 'i');
        const quartic = new RegExp(`${variable}\\s*\\^\\s*[4-9]`, 'i');
        return cubic.test(expression) && !quartic.test(expression) &&
               !expression.includes('sin') && !expression.includes('cos') &&
               !expression.includes('tan') && !expression.includes('log') &&
               !expression.includes('sqrt');
    }

    // Solve cubic equation ax³ + bx² + cx + d = 0
    solveCubic(expression, variable, steps) {
        const coeffs = this.extractCubicCoeffs(expression, variable);
        const { a, b, c, d } = coeffs;

        steps.push(`📐 Standard form: ${this.formatCoeff(a)}${variable}³ + ${this.formatCoeff(b, true)}${variable}² + ${this.formatCoeff(c, true)}${variable} + ${this.formatCoeff(d, true)} = 0`);
        steps.push(`📐 Coefficients: a = ${this.formatNumberForDisplay(a)}, b = ${this.formatNumberForDisplay(b)}, c = ${this.formatNumberForDisplay(c)}, d = ${this.formatNumberForDisplay(d)}`);

        // Normalize to x³ + px + q form using substitution x = t - b/(3a)
        const p = (3 * a * c - b * b) / (3 * a * a);
        const q = (2 * b * b * b - 9 * a * b * c + 27 * a * a * d) / (27 * a * a * a);

        steps.push(`🔄 Reducing to depressed cubic: t³ + pt + q = 0`);
        steps.push(`   where ${variable} = t - ${this.formatNumberForDisplay(b / (3 * a))}`);
        steps.push(`   p = ${this.formatNumberForDisplay(p)}, q = ${this.formatNumberForDisplay(q)}`);

        // Calculate discriminant
        const discriminant = -(4 * p * p * p + 27 * q * q);
        steps.push(`🔢 Discriminant: Δ = -(4p³ + 27q²) = ${this.formatNumberForDisplay(discriminant)}`);

        const solutions = [];

        if (Math.abs(discriminant) < 1e-10) {
            // One or two real roots
            if (Math.abs(p) < 1e-10 && Math.abs(q) < 1e-10) {
                steps.push(`✅ Triple root (all three roots are equal)`);
                const x = -b / (3 * a);
                solutions.push(x);
                steps.push(`🎯 ${variable} = ${this.formatNumberForDisplay(x)}`);
            } else {
                steps.push(`✅ Δ = 0: One single root and one double root`);
                const t1 = (3 * q) / p;
                const t2 = (-3 * q) / (2 * p);
                const x1 = t1 - b / (3 * a);
                const x2 = t2 - b / (3 * a);
                solutions.push(x1, x2, x2);
                steps.push(`🎯 ${variable}₁ = ${this.formatNumberForDisplay(x1)}`);
                steps.push(`🎯 ${variable}₂ = ${variable}₃ = ${this.formatNumberForDisplay(x2)}`);
            }
        } else if (discriminant > 0) {
            // Three distinct real roots (use trigonometric method)
            steps.push(`✅ Δ > 0: Three distinct real solutions`);
            const m = 2 * Math.sqrt(-p / 3);
            const theta = Math.acos((3 * q) / (p * m)) / 3;

            for (let k = 0; k < 3; k++) {
                const t = m * Math.cos(theta - (2 * Math.PI * k) / 3);
                const x = t - b / (3 * a);
                solutions.push(x);
                steps.push(`🎯 ${variable}${k + 1} = ${this.formatNumberForDisplay(x)}`);
            }
        } else {
            // One real root and two complex conjugate roots
            steps.push(`❌ Δ < 0: One real solution, two complex solutions`);

            // Cardano's formula for the real root
            const sqrtD = Math.sqrt(-discriminant / 108);
            const u = Math.cbrt(-q / 2 + sqrtD);
            const v = Math.cbrt(-q / 2 - sqrtD);
            const t = u + v;
            const x_real = t - b / (3 * a);

            solutions.push(x_real);
            steps.push(`🎯 Real solution: ${variable} = ${this.formatNumberForDisplay(x_real)}`);

            // Complex roots
            const realPart = this.formatNumberForDisplay(-(u + v) / 2 - b / (3 * a));
            const imagPart = this.formatNumberForDisplay(Math.sqrt(3) * (u - v) / 2);
            steps.push(`🔢 Complex solutions:`);
            steps.push(`   ${variable}₂ = ${realPart} + ${imagPart}i`);
            steps.push(`   ${variable}₃ = ${realPart} - ${imagPart}i`);
            solutions.push(`${realPart} + ${imagPart}i`, `${realPart} - ${imagPart}i`);
        }

        return { solutions };
    }

    // Extract a, b, c, d coefficients from cubic expression
    extractCubicCoeffs(expression, variable) {
        const f = (v) => math.evaluate(expression, { [variable]: v });

        // Evaluate at four points to determine a, b, c, d from ax³+bx²+cx+d
        const f0 = f(0);   // d
        const f1 = f(1);   // a + b + c + d
        const fm1 = f(-1); // -a + b - c + d
        const f2 = f(2);   // 8a + 4b + 2c + d

        const d = f0;
        const a = (f2 - 3*f1 + 3*f0 - fm1) / 6;
        const b = (f1 + fm1 - 2*f0) / 2 - 3*a;
        const c = f1 - a - b - d;

        return { a, b, c, d };
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
                } else if (mode === 'simultaneous-mode') {
                    calculator.solveSimultaneous();
                }
            }
        });
    });
});
