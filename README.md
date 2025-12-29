# Advanced Calculator

A professional, feature-rich calculator application that can solve equations, quadratics, simultaneous equations, and perform advanced mathematical operations with step-by-step solutions.

## Features

### 1. Basic Calculator
- Standard arithmetic operations (+, -, ×, ÷)
- Parentheses support for complex expressions
- Power/exponent operations (^)
- Trigonometric functions (sin, cos, tan)
- Decimal support
- Clear and backspace functionality
- Keyboard support

### 2. Equation Solver
- Solves linear and non-linear equations
- Accepts multiple input formats
- Shows step-by-step solution
- Supports various equation formats:
  - `2x + 5 = 13`
  - `3x - 7 = 2x + 5`
  - `x^2 - 4 = 0`

### 3. Quadratic Equation Solver
- Solves equations in the form ax² + bx + c = 0
- Two input methods:
  - Individual coefficients (a, b, c)
  - Full equation format
- Handles all cases:
  - Two distinct real solutions
  - One repeated real solution
  - Complex solutions
- Calculates vertex of parabola
- Shows complete step-by-step solution using quadratic formula

### 4. Simultaneous Equations Solver
- Solves systems of two linear equations
- Uses Cramer's Rule
- Supports various formats:
  - `2x + 3y = 13`
  - `x - y = -1`
- Verifies solutions
- Shows detailed solving steps

### 5. Function Notation f(x)
- Define and evaluate functions
- Two modes:
  - **Evaluate**: Calculate f(x) for a given x value
  - **Solve**: Find x when f(x) = value
- Supports complex expressions
- Shows substitution steps

## Usage

### Opening the Calculator
Simply open `index.html` in any modern web browser.

### Basic Calculator Mode
1. Click number buttons or use keyboard
2. Use operator buttons or keyboard (+, -, *, /)
3. Press = or Enter to calculate
4. Press C or Escape to clear
5. Use trigonometric functions: sin, cos, tan

**Examples:**
- `2 + 2` → 4
- `sin(30)` → -0.988 (radians)
- `(5 + 3) * 2` → 16
- `2^8` → 256

### Equation Solver
1. Switch to "Equations" mode
2. Enter equation (e.g., `2x + 5 = 13`)
3. Click "Solve" or press Enter
4. View solution and steps

**Supported Formats:**
- `2x + 5 = 13`
- `3x - 7 = 2x + 5`
- `x/2 + 3 = 7`
- `x^2 = 16`

### Quadratic Solver
1. Switch to "Quadratic" mode
2. Either:
   - Enter coefficients a, b, c individually
   - Enter full equation (e.g., `x^2 + 5x + 6 = 0`)
3. Click "Solve Quadratic"
4. View solutions, discriminant, and vertex

**Example:**
- Input: `x^2 + 5x + 6 = 0`
- Output: x₁ = -2, x₂ = -3

### Simultaneous Equations
1. Switch to "Simultaneous" mode
2. Enter two equations:
   - `2x + 3y = 13`
   - `x - y = -1`
3. Click "Solve System"
4. View x and y values with steps

**Example:**
- Equation 1: `2x + 3y = 13`
- Equation 2: `x - y = -1`
- Solution: x = 2, y = 3

### Function f(x) Mode
1. Switch to "f(x)" mode
2. Define function (e.g., `x^2 + 2x + 1`)

**To Evaluate:**
- Enter x value (e.g., `5`)
- Click "Evaluate"
- See f(5) = result

**To Solve:**
- Enter target value (e.g., `0`)
- Click "Solve for x"
- Find x where f(x) = 0

## Keyboard Shortcuts

- **Numbers & Operators**: Type directly
- **Enter**: Calculate/Solve
- **Escape**: Clear
- **Backspace**: Delete last character

## Technical Details

### Technologies Used
- **HTML5**: Structure and layout
- **CSS3**: Professional styling with gradients and animations
- **JavaScript (ES6+)**: Core calculator logic
- **Math.js**: Advanced mathematical operations library

### Mathematical Methods
- **Linear Equations**: Algebraic solving
- **Non-linear Equations**: Newton-Raphson numerical method
- **Quadratic Equations**: Quadratic formula
- **Simultaneous Equations**: Cramer's Rule
- **Function Evaluation**: Direct substitution

### Browser Support
Works on all modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Features Highlights

✓ Multiple input format support
✓ Step-by-step solutions for all operations
✓ Professional, modern UI design
✓ Easy-to-use interface
✓ All standard and advanced operations
✓ Trigonometric functions
✓ Function notation support
✓ Keyboard shortcuts
✓ Responsive design
✓ Error handling with user-friendly messages

## Examples Gallery

### Basic Calculations
```
25 + 17 = 42
100 / 4 = 25
sin(90) = 0.894
2^10 = 1024
```

### Equations
```
2x + 5 = 13 → x = 4
3x - 7 = 2x + 5 → x = 12
```

### Quadratic
```
x^2 + 5x + 6 = 0 → x = -2, x = -3
x^2 - 4 = 0 → x = 2, x = -2
```

### Simultaneous
```
2x + 3y = 13
x - y = -1
→ x = 2, y = 3
```

### Functions
```
f(x) = x^2 + 2x + 1
f(5) = 36
Solve f(x) = 0 → x = -1
```

## Future Enhancements
- Graphing capabilities
- Matrix operations
- Calculus operations (derivatives, integrals)
- Equation history saving
- Export solutions to PDF
- Dark mode toggle

## License
MIT License - feel free to use and modify!

## Author
Created with precision and care for mathematical accuracy and user experience.
