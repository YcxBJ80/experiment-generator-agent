/**
 * Code syntax checker for HTML, CSS, and JavaScript
 * Used to detect and fix common syntax errors in generated code
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fixedCode?: string;
  suggestions: string[];
}

export interface LinterResult {
  html: ValidationResult;
  css: ValidationResult;
  js: ValidationResult;
  overall: {
    isValid: boolean;
    totalErrors: number;
    fixedHtml?: string;
    fixedCss?: string;
    fixedJs?: string;
  };
}

export class CodeLinter {
  
  /**
   * Comprehensive linter check for HTML, CSS, and JavaScript
   */
  static lintCode(htmlContent: string, cssContent: string, jsContent: string): LinterResult {
    const htmlResult = this.validateHTML(htmlContent);
    const cssResult = this.validateCSS(cssContent);
    const jsResult = JavaScriptValidator.validateSyntax(jsContent);
    
    const totalErrors = htmlResult.errors.length + cssResult.errors.length + jsResult.errors.length;
    
    return {
      html: htmlResult,
      css: cssResult,
      js: jsResult,
      overall: {
        isValid: totalErrors === 0,
        totalErrors,
        fixedHtml: htmlResult.fixedCode,
        fixedCss: cssResult.fixedCode,
        fixedJs: jsResult.fixedCode
      }
    };
  }
  
  /**
   * Validate HTML content
   */
  static validateHTML(html: string): ValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let fixedCode = html;
    
    // Check for unclosed tags
    const tagResult = this.checkHTMLTags(html);
    if (!tagResult.isValid) {
      errors.push(...tagResult.errors);
      suggestions.push(...tagResult.suggestions);
      fixedCode = tagResult.fixedCode || fixedCode;
    }
    
    // Check for invalid attributes
    const attrResult = this.checkHTMLAttributes(html);
    if (!attrResult.isValid) {
      errors.push(...attrResult.errors);
      suggestions.push(...attrResult.suggestions);
      fixedCode = attrResult.fixedCode || fixedCode;
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      fixedCode: errors.length > 0 ? fixedCode : undefined,
      suggestions
    };
  }
  
  /**
   * Validate CSS content
   */
  static validateCSS(css: string): ValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    let fixedCode = css;
    
    // Check for missing semicolons
    const semicolonResult = this.checkCSSSemicolons(css);
    if (!semicolonResult.isValid) {
      errors.push(...semicolonResult.errors);
      suggestions.push(...semicolonResult.suggestions);
      fixedCode = semicolonResult.fixedCode || fixedCode;
    }
    
    // Check for invalid property values
    const propertyResult = this.checkCSSProperties(css);
    if (!propertyResult.isValid) {
      errors.push(...propertyResult.errors);
      suggestions.push(...propertyResult.suggestions);
      fixedCode = propertyResult.fixedCode || fixedCode;
    }
    
    // Check for bracket matching
    const bracketResult = this.checkCSSBrackets(css);
    if (!bracketResult.isValid) {
      errors.push(...bracketResult.errors);
      suggestions.push(...bracketResult.suggestions);
    }
    
    return {
    isValid: errors.length === 0,
    errors,
    fixedCode: errors.length > 0 ? fixedCode : undefined,
    suggestions
  };
}

/**
 * Check HTML tags for proper opening and closing
 */
static checkHTMLTags(html: string): ValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let fixedCode = html;
  
  // Self-closing tags that don't need closing tags
  const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];
  
  // Find all opening tags
  const openingTags = html.match(/<([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g) || [];
  const closingTags = html.match(/<\/([a-zA-Z][a-zA-Z0-9]*)>/g) || [];
  
  const openStack: string[] = [];
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
  let match;
  
  while ((match = tagRegex.exec(html)) !== null) {
    const tagName = match[1].toLowerCase();
    const isClosing = match[0].startsWith('</');
    const isSelfClosing = selfClosingTags.includes(tagName) || match[0].endsWith('/>');
    
    if (!isClosing && !isSelfClosing) {
      openStack.push(tagName);
    } else if (isClosing) {
      if (openStack.length === 0) {
        errors.push(`Closing tag </${tagName}> without matching opening tag`);
        suggestions.push(`Remove the closing tag </${tagName}> or add an opening tag`);
      } else {
        const lastOpen = openStack.pop();
        if (lastOpen !== tagName) {
          errors.push(`Mismatched tags: expected </${lastOpen}> but found </${tagName}>`);
          suggestions.push(`Change </${tagName}> to </${lastOpen}> or fix the tag structure`);
        }
      }
    }
  }
  
  // Check for unclosed tags
  if (openStack.length > 0) {
    openStack.forEach(tag => {
      errors.push(`Unclosed tag: <${tag}>`);
      suggestions.push(`Add closing tag </${tag}>`);
      fixedCode = fixedCode + `</${tag}>`;
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    fixedCode: errors.length > 0 ? fixedCode : undefined,
    suggestions
  };
}

/**
 * Check HTML attributes for validity
 */
static checkHTMLAttributes(html: string): ValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let fixedCode = html;
  
  // Check for unquoted attribute values
  const unquotedAttrRegex = /\s([a-zA-Z-]+)=([^"'\s>]+)/g;
  let match;
  
  while ((match = unquotedAttrRegex.exec(html)) !== null) {
    const attrName = match[1];
    const attrValue = match[2];
    
    if (!/^[a-zA-Z0-9_-]+$/.test(attrValue)) {
      errors.push(`Unquoted attribute value: ${attrName}=${attrValue}`);
      suggestions.push(`Quote the attribute value: ${attrName}="${attrValue}"`);
      fixedCode = fixedCode.replace(match[0], ` ${attrName}="${attrValue}"`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    fixedCode: errors.length > 0 ? fixedCode : undefined,
    suggestions
  };
}

/**
 * Check CSS for missing semicolons
 */
static checkCSSSemicolons(css: string): ValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let fixedCode = css;
  
  // Find CSS rules
  const ruleRegex = /([^{]+)\{([^}]+)\}/g;
  let match;
  
  while ((match = ruleRegex.exec(css)) !== null) {
    const selector = match[1].trim();
    const declarations = match[2].trim();
    
    // Check each declaration
    const declarationLines = declarations.split('\n').map(line => line.trim()).filter(line => line);
    
    declarationLines.forEach((line, index) => {
      if (line && !line.endsWith(';') && !line.endsWith('}')) {
        errors.push(`Missing semicolon in CSS declaration: ${line}`);
        suggestions.push(`Add semicolon: ${line};`);
        fixedCode = fixedCode.replace(line, line + ';');
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    fixedCode: errors.length > 0 ? fixedCode : undefined,
    suggestions
  };
}

/**
 * Check CSS properties for validity
 */
static checkCSSProperties(css: string): ValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  let fixedCode = css;
  
  // Check for invalid color values
  const colorRegex = /(color|background-color|border-color)\s*:\s*([^;]+);/g;
  let match;
  
  while ((match = colorRegex.exec(css)) !== null) {
    const property = match[1];
    const value = match[2].trim();
    
    // Check if it's a valid color format
    if (!/^(#[0-9a-fA-F]{3,6}|rgb\(|rgba\(|hsl\(|hsla\(|[a-zA-Z]+)/.test(value)) {
      errors.push(`Invalid color value: ${property}: ${value}`);
      suggestions.push(`Use a valid color format like #000000, rgb(0,0,0), or color names`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    fixedCode: errors.length > 0 ? fixedCode : undefined,
    suggestions
  };
}

/**
 * Check CSS bracket matching
 */
static checkCSSBrackets(css: string): ValidationResult {
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  let braceCount = 0;
  let inString = false;
  let stringChar = '';
  
  for (let i = 0; i < css.length; i++) {
    const char = css[i];
    const prevChar = i > 0 ? css[i - 1] : '';
    
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = '';
      }
    }
    
    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount < 0) {
          errors.push('Extra closing brace } found');
          suggestions.push('Remove the extra closing brace or add an opening brace');
          break;
        }
      }
    }
  }
  
  if (braceCount > 0) {
    errors.push(`${braceCount} unclosed brace(s) { found`);
    suggestions.push('Add the missing closing brace(s) }');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    suggestions
  };
}
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
    
    // Check for variable usage before declaration (TDZ - Temporal Dead Zone)
    const variableUsageBeforeDeclaration = this.checkVariableUsageOrder(code);
    if (!variableUsageBeforeDeclaration.isValid) {
      errors.push(...variableUsageBeforeDeclaration.errors);
      suggestions.push(...variableUsageBeforeDeclaration.suggestions);
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      suggestions
    };
  }
  
  /**
   * Check for variable usage before declaration (Temporal Dead Zone issues)
   */
  private static checkVariableUsageOrder(code: string): ValidationResult {
    const errors: string[] = [];
    const suggestions: string[] = [];
    
    // Split code into lines for analysis
    const lines = code.split('\n');
    const declaredVariables = new Map<string, number>(); // variable name -> line number
    const usedVariables = new Map<string, number[]>(); // variable name -> array of line numbers
    
    // First pass: find all variable declarations
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Match const, let, var declarations
      const declPattern = /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s*=|\s*;|\s*,)/g;
      let match;
      while ((match = declPattern.exec(line)) !== null) {
        const varName = match[1];
        if (!declaredVariables.has(varName)) {
          declaredVariables.set(varName, i);
        }
      }
      
      // Match function declarations
      const funcPattern = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
      while ((match = funcPattern.exec(line)) !== null) {
        const funcName = match[1];
        if (!declaredVariables.has(funcName)) {
          declaredVariables.set(funcName, i);
        }
      }
    }
    
    // Second pass: find variable usage
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip lines that are declarations themselves
      if (/^\s*(?:const|let|var|function)\s/.test(line)) {
        continue;
      }
      
      // Find variable usage (excluding property access and string literals)
      for (const [varName] of declaredVariables) {
        // Create regex to match variable usage
        const usagePattern = new RegExp(`\\b${varName}\\b(?!\\s*:)`, 'g');
        
        // Skip if this line contains the variable in a string literal
        const stringLiteralPattern = /['"`][^'"\`]*['"`]/g;
        const cleanLine = line.replace(stringLiteralPattern, '');
        
        if (usagePattern.test(cleanLine)) {
          if (!usedVariables.has(varName)) {
            usedVariables.set(varName, []);
          }
          usedVariables.get(varName)!.push(i);
        }
      }
    }
    
    // Check for usage before declaration
    for (const [varName, usageLines] of usedVariables) {
      const declarationLine = declaredVariables.get(varName);
      if (declarationLine !== undefined) {
        for (const usageLine of usageLines) {
          if (usageLine < declarationLine) {
            errors.push(`Variable '${varName}' is used before declaration at line ${usageLine + 1}, but declared at line ${declarationLine + 1}`);
            suggestions.push(`Move the declaration of '${varName}' before its first usage, or move the usage after the declaration`);
          }
        }
      }
    }
    
    // Special check for common patterns that cause TDZ errors
    const statePattern = /\bstate\b/g;
    const stateMatches = [...code.matchAll(statePattern)];
    if (stateMatches.length > 0) {
      // Check if state is used in function calls before being declared
      const functionCallPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\bstate\b[^)]*\)/g;
      const funcCallMatches = [...code.matchAll(functionCallPattern)];
      
      for (const match of funcCallMatches) {
        const funcName = match[1];
        if (funcName === 'drawScene' || funcName === 'resizeCanvas') {
          errors.push(`Function '${funcName}' uses 'state' variable which may not be initialized yet`);
          suggestions.push(`Ensure 'state' variable is declared and initialized before calling '${funcName}' function`);
        }
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
