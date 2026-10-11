/**
 * Safe Math & Expression Evaluator for Signage BOM Formulas.
 * Zero-eval, AST recursive-descent parser designed for engineering calculations.
 * Supports:
 * - Arithmetic operators: +, -, *, /, %
 * - Parentheses: ( )
 * - Built-in functions: ceil, floor, round, max, min, abs
 * - Comparison & logic: ==, !=, >, <, >=, <=, &&, ||, !
 * - Dynamic variables: w, h, d, grid_cm, faces, is_lit, quantity, etc.
 */

type TokenType =
  | 'NUMBER'
  | 'BOOLEAN'
  | 'IDENTIFIER'
  | 'OP'
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string | number | boolean;
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    const ch = input[i];

    // Bỏ qua khoảng trắng
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Dấu ngoặc và dấu phẩy
    if (ch === '(') {
      tokens.push({ type: 'LPAREN', value: '(' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'RPAREN', value: ')' });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'COMMA', value: ',' });
      i++;
      continue;
    }

    // Toán tử so sánh 2 ký tự: ==, !=, >=, <=, &&, ||
    if (i + 1 < n) {
      const two = input.slice(i, i + 2);
      if (['==', '!=', '>=', '<=', '&&', '||'].includes(two)) {
        tokens.push({ type: 'OP', value: two });
        i += 2;
        continue;
      }
    }

    // Toán tử 1 ký tự: +, -, *, /, %, >, <, !
    if (['+', '-', '*', '/', '%', '>', '<', '!'].includes(ch)) {
      tokens.push({ type: 'OP', value: ch });
      i++;
      continue;
    }

    // Chữ số (số thực hoặc nguyên)
    if (/\d/.test(ch) || (ch === '.' && i + 1 < n && /\d/.test(input[i + 1]))) {
      let numStr = '';
      while (i < n && (/[\d.]/.test(input[i]))) {
        numStr += input[i];
        i++;
      }
      tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
      continue;
    }

    // Tên biến hoặc hàm (chữ cái, gạch dưới)
    if (/[a-zA-Z_]/.test(ch)) {
      let idStr = '';
      while (i < n && /[a-zA-Z0-9_]/.test(input[i])) {
        idStr += input[i];
        i++;
      }
      if (idStr === 'true') {
        tokens.push({ type: 'BOOLEAN', value: true });
      } else if (idStr === 'false') {
        tokens.push({ type: 'BOOLEAN', value: false });
      } else {
        tokens.push({ type: 'IDENTIFIER', value: idStr });
      }
      continue;
    }

    // Ký tự không hợp lệ, bỏ qua
    i++;
  }

  tokens.push({ type: 'EOF', value: '' });
  return tokens;
}

class Parser {
  private tokens: Token[];
  private pos = 0;
  private variables: Record<string, number | boolean | string>;

  constructor(tokens: Token[], variables: Record<string, number | boolean | string>) {
    this.tokens = tokens;
    this.variables = variables;
  }

  private peek(): Token {
    return this.tokens[this.pos] || { type: 'EOF', value: '' };
  }

  private consume(expected?: TokenType | string): Token {
    const t = this.peek();
    if (expected && t.type !== expected && t.value !== expected) {
      // syntax warning, continue gracefully
    }
    this.pos++;
    return t;
  }

  public parseExpression(): any {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): any {
    let left = this.parseLogicalAnd();
    while (this.peek().type === 'OP' && this.peek().value === '||') {
      this.consume();
      const right = this.parseLogicalAnd();
      left = Boolean(left || right);
    }
    return left;
  }

  private parseLogicalAnd(): any {
    let left = this.parseEquality();
    while (this.peek().type === 'OP' && this.peek().value === '&&') {
      this.consume();
      const right = this.parseEquality();
      left = Boolean(left && right);
    }
    return left;
  }

  private parseEquality(): any {
    let left = this.parseRelational();
    while (this.peek().type === 'OP' && ['==', '!='].includes(this.peek().value as string)) {
      const op = this.consume().value;
      const right = this.parseRelational();
      if (op === '==') left = left == right;
      else left = left != right;
    }
    return left;
  }

  private parseRelational(): any {
    let left = this.parseAdditive();
    while (
      this.peek().type === 'OP' &&
      ['<', '>', '<=', '>='].includes(this.peek().value as string)
    ) {
      const op = this.consume().value;
      const right = this.parseAdditive();
      if (op === '<') left = left < right;
      else if (op === '>') left = left > right;
      else if (op === '<=') left = left <= right;
      else if (op === '>=') left = left >= right;
    }
    return left;
  }

  private parseAdditive(): any {
    let left = this.parseMultiplicative();
    while (this.peek().type === 'OP' && ['+', '-'].includes(this.peek().value as string)) {
      const op = this.consume().value;
      const right = this.parseMultiplicative();
      if (op === '+') left = Number(left) + Number(right);
      else left = Number(left) - Number(right);
    }
    return left;
  }

  private parseMultiplicative(): any {
    let left = this.parseUnary();
    while (this.peek().type === 'OP' && ['*', '/', '%'].includes(this.peek().value as string)) {
      const op = this.consume().value;
      const right = this.parseUnary();
      if (op === '*') left = Number(left) * Number(right);
      else if (op === '/') {
        const denom = Number(right);
        left = denom === 0 ? 0 : Number(left) / denom;
      } else if (op === '%') {
        const denom = Number(right);
        left = denom === 0 ? 0 : Number(left) % denom;
      }
    }
    return left;
  }

  private parseUnary(): any {
    const t = this.peek();
    if (t.type === 'OP' && t.value === '-') {
      this.consume();
      return -Number(this.parseUnary());
    }
    if (t.type === 'OP' && t.value === '!') {
      this.consume();
      return !this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): any {
    const t = this.peek();

    if (t.type === 'NUMBER') {
      this.consume();
      return t.value as number;
    }

    if (t.type === 'BOOLEAN') {
      this.consume();
      return t.value as boolean;
    }

    if (t.type === 'LPAREN') {
      this.consume();
      const val = this.parseExpression();
      if (this.peek().type === 'RPAREN') {
        this.consume();
      }
      return val;
    }

    if (t.type === 'IDENTIFIER') {
      const name = String(t.value);
      this.consume();

      // Kiểm tra xem có phải là gọi hàm: ceil(), max(), min(), ...
      if (this.peek().type === 'LPAREN') {
        this.consume('LPAREN');
        const args: any[] = [];
        if (this.peek().type !== 'RPAREN') {
          args.push(this.parseExpression());
          while (this.peek().type === 'COMMA') {
            this.consume('COMMA');
            args.push(this.parseExpression());
          }
        }
        if (this.peek().type === 'RPAREN') {
          this.consume('RPAREN');
        }

        switch (name.toLowerCase()) {
          case 'ceil':
            return Math.ceil(Number(args[0] || 0));
          case 'floor':
            return Math.floor(Number(args[0] || 0));
          case 'round':
            return Math.round(Number(args[0] || 0));
          case 'max':
            return Math.max(...args.map((a) => Number(a) || 0));
          case 'min':
            return Math.min(...args.map((a) => Number(a) || 0));
          case 'abs':
            return Math.abs(Number(args[0] || 0));
          default:
            return Number(args[0] || 0);
        }
      }

      // Biến số
      if (name in this.variables) {
        return this.variables[name];
      }

      // Biến alias thường gặp
      const lower = name.toLowerCase();
      if (lower in this.variables) {
        return this.variables[lower];
      }

      if (lower === 'area') {
        const w = Number(this.variables.w || this.variables.width || 0);
        const h = Number(this.variables.h || this.variables.height || 0);
        return w * h;
      }
      if (lower === 'perimeter') {
        const w = Number(this.variables.w || this.variables.width || 0);
        const h = Number(this.variables.h || this.variables.height || 0);
        return 2 * (w + h);
      }

      return 0;
    }

    this.consume();
    return 0;
  }
}

/**
 * Tính giá trị công thức định mức số học an toàn.
 * @param formula Chuỗi công thức, ví dụ: "ceil((2 * (w + h) + (w / 0.4) * h) * 1.08 / 6)"
 * @param variables Biến đầu vào: { w: 6.0, h: 2.0, grid_cm: 40, ... }
 */
export function evaluateFormula(
  formula: string,
  variables: Record<string, number | boolean | string> = {}
): number {
  if (!formula || !formula.trim()) return 0;
  try {
    const tokens = tokenize(formula);
    const parser = new Parser(tokens, variables);
    const res = parser.parseExpression();
    const num = Number(res);
    return isNaN(num) || !isFinite(num) ? 0 : Math.max(0, num);
  } catch (err) {
    console.warn(`Formula evaluation error on "${formula}":`, err);
    return 0;
  }
}

/**
 * Đánh giá điều kiện bật/tắt của dòng định mức.
 * @param condition Chuỗi điều kiện, ví dụ: "is_lit == true", "faces > 1"
 * @param variables Biến đầu vào: { is_lit: true, faces: 2, ... }
 */
export function evaluateCondition(
  condition: string,
  variables: Record<string, number | boolean | string> = {}
): boolean {
  if (!condition || !condition.trim()) return true; // Mặc định không có điều kiện => luôn bật
  try {
    const tokens = tokenize(condition);
    const parser = new Parser(tokens, variables);
    const res = parser.parseExpression();
    return Boolean(res);
  } catch (err) {
    console.warn(`Condition evaluation error on "${condition}":`, err);
    return true;
  }
}
