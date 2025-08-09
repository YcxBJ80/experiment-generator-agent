/**
 * JavaScript语法检查器
 * 用于检测和修复常见的JavaScript语法错误
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fixedCode?: string;
  suggestions: string[];
}

export class JavaScriptValidator {
  
  /**
   * 检查JavaScript代码的语法错误
   */
  static validateSyntax(code: string): ValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let fixedCode = code;
    
    // 1. 检查括号匹配
    const bracketResult = this.checkBracketMatching(code);
    if (!bracketResult.isValid) {
      errors.push(...bracketResult.errors);
      suggestions.push(...bracketResult.suggestions);
    }
    
    // 2. 检查if语句完整性
    const ifResult = this.checkIfStatements(code);
    if (!ifResult.isValid) {
      errors.push(...ifResult.errors);
      suggestions.push(...ifResult.suggestions);
      fixedCode = ifResult.fixedCode || fixedCode;
    }
    
    // 3. 检查比较操作符
    const operatorResult = this.checkComparisonOperators(code);
    if (!operatorResult.isValid) {
      errors.push(...operatorResult.errors);
      suggestions.push(...operatorResult.suggestions);
      fixedCode = operatorResult.fixedCode || fixedCode;
    }
    
    // 4. 检查箭头函数语法
    const arrowResult = this.checkArrowFunctions(code);
    if (!arrowResult.isValid) {
      errors.push(...arrowResult.errors);
      suggestions.push(...arrowResult.suggestions);
      fixedCode = arrowResult.fixedCode || fixedCode;
    }
    
    // 5. 检查变量声明
    const varResult = this.checkVariableDeclarations(code);
    if (!varResult.isValid) {
      errors.push(...varResult.errors);
      suggestions.push(...varResult.suggestions);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      fixedCode: errors.length > 0 ? fixedCode : undefined,
      suggestions
    };
  }
  
  /**
   * 检查括号匹配
   */
  private static checkBracketMatching(code: string): ValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    
    const brackets = {
      '(': ')',
      '[': ']',
      '{': '}'
    };
    
    const stack: string[] = [];
    const openBrackets = Object.keys(brackets);
    const closeBrackets = Object.values(brackets);
    
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      
      if (openBrackets.includes(char)) {
        stack.push(char);
      } else if (closeBrackets.includes(char)) {
        const lastOpen = stack.pop();
        if (!lastOpen || brackets[lastOpen as keyof typeof brackets] !== char) {
          errors.push(`第${i + 1}个字符处括号不匹配: 期望 ${lastOpen ? brackets[lastOpen as keyof typeof brackets] : '无'}, 实际 ${char}`);
        }
      }
    }
    
    if (stack.length > 0) {
      errors.push(`未闭合的括号: ${stack.join(', ')}`);
      suggestions.push('检查所有开放的括号是否都有对应的闭合括号');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      suggestions
    };
  }
  
  /**
   * 检查if语句完整性
   */
  private static checkIfStatements(code: string): ValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let fixedCode = code;
    
    // 检查不完整的if语句
    const incompleteIfPattern = /if\s*\([^)]*[^)]\s*\{/g;
    const matches = [...code.matchAll(incompleteIfPattern)];
    
    for (const match of matches) {
      if (!match[0].includes(')')) {
        errors.push(`不完整的if语句: ${match[0]}`);
        suggestions.push('确保if条件有完整的括号和比较操作符');
        
        // 尝试修复
        const fixed = match[0].replace(/\{$/, ' < 0){');
        fixedCode = fixedCode.replace(match[0], fixed);
      }
    }
    
    // 检查缺少比较操作符的if条件
    const missingOperatorPattern = /if\s*\([^)]*\w+\s+\w+[^)]*\)/g;
    const operatorMatches = [...code.matchAll(missingOperatorPattern)];
    
    for (const match of operatorMatches) {
      if (!/[><=!]=?/.test(match[0])) {
        errors.push(`if条件缺少比较操作符: ${match[0]}`);
        suggestions.push('在变量之间添加比较操作符 (>, <, >=, <=, ==, !=)');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      suggestions,
      fixedCode: errors.length > 0 ? fixedCode : undefined
    };
  }
  
  /**
   * 检查比较操作符
   */
  private static checkComparisonOperators(code: string): ValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let fixedCode = code;
    
    // 检查错误的语法模式，如 "const >" 或 "const <"
    const invalidSyntaxPattern = /(const|let|var)\s*[<>]/g;
    const invalidMatches = [...code.matchAll(invalidSyntaxPattern)];
    
    for (const match of invalidMatches) {
      errors.push(`发现 "${match[0]}" 语法错误`);
      suggestions.push(`修复变量声明语法错误`);
      
      // 修复：移除错误的操作符
      const fixed = match[0].replace(/\s*[<>]/, ' ');
      fixedCode = fixedCode.replace(match[0], fixed);
    }
    
    // 检查if条件中缺少操作符的情况
    const ifMissingOpPattern = /if\s*\([^)]*\b(\w+)\s+(\w+)\b[^)]*\)/g;
    const ifMatches = [...code.matchAll(ifMissingOpPattern)];
    
    for (const match of ifMatches) {
      // 检查是否真的缺少比较操作符
      if (!/[><=!]=?/.test(match[0])) {
        errors.push(`if条件缺少比较操作符: ${match[0]}`);
        suggestions.push(`在 "${match[1]}" 和 "${match[2]}" 之间添加比较操作符`);
        
        // 尝试智能修复
        const fixed = match[0].replace(`${match[1]} ${match[2]}`, `${match[1]} < ${match[2]}`);
        fixedCode = fixedCode.replace(match[0], fixed);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      suggestions,
      fixedCode: errors.length > 0 ? fixedCode : undefined
    };
  }
  
  /**
   * 检查箭头函数语法
   */
  private static checkArrowFunctions(code: string): ValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let fixedCode = code;
    
    // 检查错误的箭头函数语法 () = {
    const wrongArrowPattern = /\(\s*\)\s*=\s*\{/g;
    const matches = [...code.matchAll(wrongArrowPattern)];
    
    for (const match of matches) {
      errors.push(`错误的箭头函数语法: ${match[0]}`);
      suggestions.push('箭头函数应该使用 => 而不是 =');
      
      fixedCode = fixedCode.replace(match[0], '() => {');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      suggestions,
      fixedCode: errors.length > 0 ? fixedCode : undefined
    };
  }
  
  /**
   * 检查变量声明
   */
  private static checkVariableDeclarations(code: string): ValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    
    // 检查未声明的变量赋值
    const undeclaredVarPattern = /^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*=/gm;
    const matches = [...code.matchAll(undeclaredVarPattern)];
    
    for (const match of matches) {
      const varName = match[0].split('=')[0].trim();
      if (!code.includes(`const ${varName}`) && !code.includes(`let ${varName}`) && !code.includes(`var ${varName}`)) {
        errors.push(`可能未声明的变量: ${varName}`);
        suggestions.push(`使用 const, let 或 var 声明变量 ${varName}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      suggestions
    };
  }
  
  /**
   * 生成修复建议的提示词
   */
  static generateFixPrompt(originalCode: string, validationResult: ValidationResult): string {
    if (validationResult.isValid) {
      return '';
    }
    
    const errorList = validationResult.errors.map((error, index) => `${index + 1}. ${error}`).join('\n');
    const suggestionList = validationResult.suggestions.map((suggestion, index) => `${index + 1}. ${suggestion}`).join('\n');
    
    return `
检测到JavaScript代码中存在以下语法错误：

错误列表：
${errorList}

修复建议：
${suggestionList}

请修复这些错误并重新生成完整的JavaScript代码。确保：
- 所有if语句都有完整的条件和括号
- 所有比较操作符都明确写出
- 箭头函数使用正确的 => 语法
- 所有括号都正确匹配
- 变量都正确声明

原始代码：
\`\`\`javascript
${originalCode}
\`\`\`

请返回修复后的完整JavaScript代码。
`;
  }
}