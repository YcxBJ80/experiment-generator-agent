/**
 * JavaScript syntax checker
 * Used to detect and fix common JavaScript syntax errors
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fixedCode?: string;
  suggestions: string[];
}

export class JavaScriptValidator {
  
  /**
   * Check JavaScript code for syntax errors
   */
  static validateSyntax(code: string): ValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let fixedCode = code;
    
    // 1. Check bracket matching
    const bracketResult = this.checkBracketMatching(code);
    if (!bracketResult.isValid) {
      errors.push(...bracketResult.errors);
      suggestions.push(...bracketResult.suggestions);
    }
    
    // 2. Check if statement completeness
    const ifResult = this.checkIfStatements(code);
    if (!ifResult.isValid) {
      errors.push(...ifResult.errors);
      suggestions.push(...ifResult.suggestions);
      fixedCode = ifResult.fixedCode || fixedCode;
    }
    
    // 3. Check comparison operators
    const operatorResult = this.checkComparisonOperators(code);
    if (!operatorResult.isValid) {
      errors.push(...operatorResult.errors);
      suggestions.push(...operatorResult.suggestions);
      fixedCode = operatorResult.fixedCode || fixedCode;
    }
    
    // 4. Check arrow function syntax
    const arrowResult = this.checkArrowFunctions(code);
    if (!arrowResult.isValid) {
      errors.push(...arrowResult.errors);
      suggestions.push(...arrowResult.suggestions);
      fixedCode = arrowResult.fixedCode || fixedCode;
    }
    
    // 5. Check variable declarations
    const varResult = this.checkVariableDeclarations(code);
    if (!varResult.isValid) {
      errors.push(...varResult.errors);
      suggestions.push(...varResult.suggestions);
    }
    
    // 6. Check Canvas color format
    const colorResult = this.checkCanvasColors(code);
    if (!colorResult.isValid) {
      errors.push(...colorResult.errors);
      suggestions.push(...colorResult.suggestions);
      fixedCode = colorResult.fixedCode || fixedCode;
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      fixedCode: errors.length > 0 ? fixedCode : undefined,
      suggestions
    };
  }
  
  /**
   * Check bracket matching
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
          errors.push(`Bracket mismatch at character ${i + 1}: expected ${lastOpen ? brackets[lastOpen as keyof typeof brackets] : 'none'}, actual ${char}`);
        }
      }
    }
    
    if (stack.length > 0) {
      errors.push(`Unclosed brackets: ${stack.join(', ')}`);
      suggestions.push('Check that all opening brackets have corresponding closing brackets');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      suggestions
    };
  }
  
  /**
   * Check if statement completeness
   */
  private static checkIfStatements(code: string): ValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let fixedCode = code;
    
    // Check incomplete if statements
    const incompleteIfPattern = /if\s*\([^)]*[^)]\s*\{/g;
    const matches = [...code.matchAll(incompleteIfPattern)];
    
    for (const match of matches) {
      if (!match[0].includes(')')) {
        errors.push(`Incomplete if statement: ${match[0]}`);
        suggestions.push('Ensure if conditions have complete parentheses and comparison operators');
        
        // Try to fix
        const fixed = match[0].replace(/\{$/, ' < 0){');
        fixedCode = fixedCode.replace(match[0], fixed);
      }
    }
    
    // Check if conditions missing comparison operators
    const missingOperatorPattern = /if\s*\([^)]*\w+\s+\w+[^)]*\)/g;
    const operatorMatches = [...code.matchAll(missingOperatorPattern)];
    
    for (const match of operatorMatches) {
      if (!/[><=!]=?/.test(match[0])) {
        errors.push(`If condition missing comparison operator: ${match[0]}`);
        suggestions.push('Add comparison operators between variables (>, <, >=, <=, ==, !=)');
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
   * Check comparison operators
   */
  private static checkComparisonOperators(code: string): ValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let fixedCode = code;
    
    // Check for incorrect syntax patterns like "const >" or "const <"
    const invalidSyntaxPattern = /(const|let|var)\s*[<>]/g;
    const invalidMatches = [...code.matchAll(invalidSyntaxPattern)];
    
    for (const match of invalidMatches) {
      errors.push(`Found "${match[0]}" syntax error`);
      suggestions.push(`Fix variable declaration syntax error`);
      
      // Fix: remove incorrect operator
      const fixed = match[0].replace(/\s*[<>]/, ' ');
      fixedCode = fixedCode.replace(match[0], fixed);
    }
    
    // Check for missing operators in if conditions
    const ifMissingOpPattern = /if\s*\([^)]*\b(\w+)\s+(\w+)\b[^)]*\)/g;
    const ifMatches = [...code.matchAll(ifMissingOpPattern)];
    
    for (const match of ifMatches) {
      // Check if comparison operators are really missing
      if (!/[><=!]=?/.test(match[0])) {
        errors.push(`If condition missing comparison operator: ${match[0]}`);
        suggestions.push(`Add comparison operator between "${match[1]}" and "${match[2]}"`);
        
        // Try smart fix
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
   * Check arrow function syntax
   */
  private static checkArrowFunctions(code: string): ValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let fixedCode = code;
    
    // Check for incorrect arrow function syntax () = {
    const wrongArrowPattern = /\(\s*\)\s*=\s*\{/g;
    const matches = [...code.matchAll(wrongArrowPattern)];
    
    for (const match of matches) {
      errors.push(`Incorrect arrow function syntax: ${match[0]}`);
      suggestions.push('Arrow functions should use => instead of =');
      
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
   * Check variable declarations
   */
  private static checkVariableDeclarations(code: string): ValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    
    // Check for undeclared variable assignments
    const undeclaredVarPattern = /^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*=/gm;
    const matches = [...code.matchAll(undeclaredVarPattern)];
    
    for (const match of matches) {
      const varName = match[0].split('=')[0].trim();
      if (!code.includes(`const ${varName}`) && !code.includes(`let ${varName}`) && !code.includes(`var ${varName}`)) {
        errors.push(`Possibly undeclared variable: ${varName}`);
        suggestions.push(`Declare variable ${varName} using const, let or var`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      suggestions
    };
  }
  
  /**
   * Check Canvas color format
   */
  private static checkCanvasColors(code: string): ValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let fixedCode = code;
    
    // Check RGBA color format errors - find rgba() with 5 or more parameters
    const invalidRgbaPattern = /rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)[^)]*\)/g;
    const matches = [...code.matchAll(invalidRgbaPattern)];
    
    for (const match of matches) {
      const [fullMatch, r, g, b, alpha1, alpha2] = match;
      errors.push(`Invalid RGBA color format: ${fullMatch} - RGBA can only have 4 parameters`);
      suggestions.push('RGBA format should be rgba(red, green, blue, alpha), alpha value between 0-1');
      
      // Fix: use first alpha value, remove extra parameters
      const fixedColor = `rgba(${r},${g},${b},${alpha1})`;
      fixedCode = fixedCode.replace(fullMatch, fixedColor);
    }
    
    // Check RGB color format errors - find rgb() with 4 or more parameters
    const invalidRgbPattern = /rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)[^)]*\)/g;
    const rgbMatches = [...code.matchAll(invalidRgbPattern)];
    
    for (const match of rgbMatches) {
      const [fullMatch, r, g, b, extra] = match;
      errors.push(`Invalid RGB color format: ${fullMatch} - RGB can only have 3 parameters`);
      suggestions.push('RGB format should be rgb(red, green, blue), or use rgba(red, green, blue, alpha)');
      
      // Fix: remove extra parameters, or convert to RGBA
      const fixedColor = `rgb(${r},${g},${b})`;
      fixedCode = fixedCode.replace(fullMatch, fixedColor);
    }
    
    // Check color value ranges
    const colorRangePattern = /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+))?\s*\)/g;
    const rangeMatches = [...code.matchAll(colorRangePattern)];
    
    for (const match of rangeMatches) {
      const [fullMatch, r, g, b, alpha] = match;
      const rVal = parseInt(r);
      const gVal = parseInt(g);
      const bVal = parseInt(b);
      const alphaVal = alpha ? parseFloat(alpha) : null;
      
      let needsFix = false;
      let fixedR = rVal;
      let fixedG = gVal;
      let fixedB = bVal;
      let fixedAlpha = alphaVal;
      
      // Check RGB value range (0-255)
      if (rVal > 255) { fixedR = 255; needsFix = true; }
      if (gVal > 255) { fixedG = 255; needsFix = true; }
      if (bVal > 255) { fixedB = 255; needsFix = true; }
      
      // Check alpha value range (0-1)
      if (alphaVal !== null && alphaVal > 1) {
        fixedAlpha = 1;
        needsFix = true;
      }
      
      if (needsFix) {
        errors.push(`Color value out of range: ${fullMatch}`);
        suggestions.push('RGB values should be between 0-255, alpha value should be between 0-1');
        
        const fixedColor = alphaVal !== null 
          ? `rgba(${fixedR},${fixedG},${fixedB},${fixedAlpha})`
          : `rgb(${fixedR},${fixedG},${fixedB})`;
        fixedCode = fixedCode.replace(fullMatch, fixedColor);
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
   * Generate fix suggestion prompt
   */
  static generateFixPrompt(originalCode: string, validationResult: ValidationResult): string {
    if (validationResult.isValid) {
      return '';
    }
    
    const errorList = validationResult.errors.map((error, index) => `${index + 1}. ${error}`).join('\n');
    const suggestionList = validationResult.suggestions.map((suggestion, index) => `${index + 1}. ${suggestion}`).join('\n');
    
    return `
 The following syntax errors were detected in the JavaScript code:
 
 Error list:
 ${errorList}
 
 Fix suggestions:
 ${suggestionList}
 
 Please fix these errors and regenerate the complete JavaScript code. Ensure:
 - All if statements have complete conditions and parentheses
 - All comparison operators are explicitly written
 - Arrow functions use correct => syntax
 - All brackets are properly matched
 - Variables are properly declared
 
 Original code:
 \`\`\`javascript
 ${originalCode}
 \`\`\`
 
 Please return the fixed complete JavaScript code.
 `;
  }
}