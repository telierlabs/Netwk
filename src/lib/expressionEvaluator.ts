/**
 * ============================================================================
 * SAFE EXPRESSION EVALUATOR
 * ============================================================================
 *
 * Mengevaluasi string ekspresi matematis (mis. "sin(t * speed) * amplitude")
 * yang berasal dari AI-generated SimulationSpec, TANPA eval() atau
 * new Function(). Parser recursive-descent kecil yang cuma paham angka,
 * variabel dari scope, operator matematika dasar, dan fungsi matematika
 * standar — tidak bisa mengakses apapun di luar itu.
 *
 * `simulationSchema.ts` sudah membatasi karakter yang boleh ada di string
 * expr (regex whitelist), jadi ini lapis kedua yang benar-benar mengontrol
 * apa yang dieksekusi, bukan cuma bentuk stringnya.
 * ============================================================================
 */

export type ExpressionScope = Record<string, number>;

const FUNCTIONS: Record<string, (...args: number[]) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sqrt: Math.sqrt,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
  exp: Math.exp,
  log: Math.log,
  atan2: Math.atan2,
};

const CONSTANTS: ExpressionScope = {
  pi: Math.PI,
  e: Math.E,
};

// ----------------------------------------------------------------------------
// Tokenizer
// ----------------------------------------------------------------------------

type TokenType = 'number' | 'identifier' | 'operator' | 'lparen' | 'rparen' | 'comma';

interface Token {
  type: TokenType;
  value: string;
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        num += expr[i];
        i++;
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        ident += expr[i];
        i++;
      }
      tokens.push({ type: 'identifier', value: ident });
      continue;
    }

    if ('+-*/%^'.includes(ch)) {
      tokens.push({ type: 'operator', value: ch });
      i++;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen', value: ch });
      i++;
      continue;
    }

    if (ch === ')') {
      tokens.push({ type: 'rparen', value: ch });
      i++;
      continue;
    }

    if (ch === ',') {
      tokens.push({ type: 'comma', value: ch });
      i++;
      continue;
    }

    throw new Error(`Karakter tidak dikenal dalam ekspresi: "${ch}"`);
  }

  return tokens;
}

// ----------------------------------------------------------------------------
// Parser (recursive descent, precedence: + - < * / % < ^ < unary < atom)
// ----------------------------------------------------------------------------

class Parser {
  private tokens: Token[];
  private pos = 0;
  private scope: ExpressionScope;

  constructor(tokens: Token[], scope: ExpressionScope) {
    this.tokens = tokens;
    this.scope = scope;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    const tok = this.tokens[this.pos];
    if (!tok) throw new Error('Ekspresi berakhir tiba-tiba (token tidak lengkap).');
    this.pos++;
    return tok;
  }

  parse(): number {
    const result = this.parseAddSub();
    if (this.pos < this.tokens.length) {
      throw new Error(`Token tak terduga tersisa di ekspresi: "${this.peek()?.value}"`);
    }
    return result;
  }

  private parseAddSub(): number {
    let left = this.parseMulDiv();
    while (this.peek()?.type === 'operator' && (this.peek()!.value === '+' || this.peek()!.value === '-')) {
      const op = this.consume().value;
      const right = this.parseMulDiv();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  private parseMulDiv(): number {
    let left = this.parsePow();
    while (
      this.peek()?.type === 'operator' &&
      (this.peek()!.value === '*' || this.peek()!.value === '/' || this.peek()!.value === '%')
    ) {
      const op = this.consume().value;
      const right = this.parsePow();
      if (op === '*') left = left * right;
      else if (op === '/') left = left / right;
      else left = left % right;
    }
    return left;
  }

  private parsePow(): number {
    const base = this.parseUnary();
    if (this.peek()?.type === 'operator' && this.peek()!.value === '^') {
      this.consume();
      const exponent = this.parsePow(); // right-associative
      return Math.pow(base, exponent);
    }
    return base;
  }

  private parseUnary(): number {
    if (this.peek()?.type === 'operator' && this.peek()!.value === '-') {
      this.consume();
      return -this.parseUnary();
    }
    if (this.peek()?.type === 'operator' && this.peek()!.value === '+') {
      this.consume();
      return this.parseUnary();
    }
    return this.parseAtom();
  }

  private parseAtom(): number {
    const tok = this.peek();
    if (!tok) throw new Error('Ekspresi berakhir tiba-tiba.');

    if (tok.type === 'number') {
      this.consume();
      return parseFloat(tok.value);
    }

    if (tok.type === 'lparen') {
      this.consume();
      const value = this.parseAddSub();
      if (this.peek()?.type !== 'rparen') throw new Error('Kurung tidak seimbang dalam ekspresi.');
      this.consume();
      return value;
    }

    if (tok.type === 'identifier') {
      this.consume();
      const name = tok.value;

      // Function call: identifier(
      if (this.peek()?.type === 'lparen') {
        this.consume();
        const args: number[] = [];
        if (this.peek()?.type !== 'rparen') {
          args.push(this.parseAddSub());
          while (this.peek()?.type === 'comma') {
            this.consume();
            args.push(this.parseAddSub());
          }
        }
        if (this.peek()?.type !== 'rparen') throw new Error(`Kurung tidak ditutup untuk fungsi "${name}".`);
        this.consume();

        const fn = FUNCTIONS[name];
        if (!fn) throw new Error(`Fungsi tidak dikenal: "${name}". Fungsi yang tersedia: ${Object.keys(FUNCTIONS).join(', ')}.`);
        return fn(...args);
      }

      // Variable lookup
      if (name in this.scope) return this.scope[name];
      if (name in CONSTANTS) return CONSTANTS[name];
      throw new Error(`Variabel tidak dikenal: "${name}". Pastikan variabel ini ada di parameters/state.`);
    }

    throw new Error(`Token tak terduga: "${tok.value}"`);
  }
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * Evaluasi string ekspresi matematis dengan scope variabel yang diberikan.
 * Selalu mengembalikan number yang finite — kalau hasil NaN/Infinity atau
 * ekspresi gagal di-parse, lempar Error (biar pemanggil bisa fallback ke
 * nilai default, bukan merender NaN ke Three.js).
 */
export function evaluateExpression(expr: string, scope: ExpressionScope = {}): number {
  const tokens = tokenize(expr);
  const parser = new Parser(tokens, scope);
  const result = parser.parse();

  if (!Number.isFinite(result)) {
    throw new Error(`Hasil evaluasi ekspresi "${expr}" bukan angka valid (NaN/Infinity).`);
  }

  return result;
}

/**
 * Helper untuk DynamicValue dari simulation.ts: bisa berupa number langsung
 * atau { expr: string }. Selalu mengembalikan number, dengan fallback aman
 * kalau evaluasi gagal (supaya render loop tidak crash karena 1 ekspresi
 * bermasalah).
 */
export function resolveDynamicValue(
  value: number | { expr: string },
  scope: ExpressionScope = {},
  fallback = 0
): number {
  if (typeof value === 'number') return value;
  try {
    return evaluateExpression(value.expr, scope);
  } catch {
    return fallback;
  }
}
