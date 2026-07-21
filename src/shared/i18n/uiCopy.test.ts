import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const USER_FACING_ATTRIBUTES = new Set(['alt', 'aria-label', 'label', 'placeholder', 'title']);
const ENGLISH_TEXT = /[A-Za-z]{2,}/;

function collectProductionTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectProductionTsxFiles(entryPath);
    return entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx') ? [entryPath] : [];
  });
}

function formatLocation(sourceFile: ts.SourceFile, node: ts.Node): string {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return `${path.relative(process.cwd(), sourceFile.fileName)}:${line + 1}:${character + 1}`;
}

function normalizeCopy(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function getStaticAttributeCopy(attribute: ts.JsxAttribute): string | null {
  if (!attribute.initializer) return null;
  if (ts.isStringLiteral(attribute.initializer)) return normalizeCopy(attribute.initializer.text);
  if (!ts.isJsxExpression(attribute.initializer)) return null;

  const expression = attribute.initializer.expression;
  if (expression && (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression))) {
    return normalizeCopy(expression.text);
  }

  return null;
}

function findHardcodedEnglishCopy(filePath: string, source = readFileSync(filePath, 'utf8')): string[] {
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const findings: string[] = [];

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      const copy = normalizeCopy(node.text);
      if (copy && ENGLISH_TEXT.test(copy)) findings.push(`${formatLocation(sourceFile, node)} JSX text: ${copy}`);
    }

    if (ts.isJsxExpression(node) && node.expression && (ts.isStringLiteral(node.expression) || ts.isNoSubstitutionTemplateLiteral(node.expression))) {
      const copy = normalizeCopy(node.expression.text);
      if (copy && ENGLISH_TEXT.test(copy)) findings.push(`${formatLocation(sourceFile, node)} JSX expression: ${copy}`);
    }

    if (ts.isJsxAttribute(node) && USER_FACING_ATTRIBUTES.has(node.name.getText(sourceFile))) {
      const copy = getStaticAttributeCopy(node);
      if (copy && ENGLISH_TEXT.test(copy)) findings.push(`${formatLocation(sourceFile, node)} ${node.name.getText(sourceFile)}: ${copy}`);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return findings;
}

describe('localized UI copy', () => {
  it('detects static English copy in React markup', () => {
    const source = `const view = <button aria-label="Save">Cancel{'Delete'}</button>;`;
    const findings = findHardcodedEnglishCopy('Example.tsx', source);

    expect(findings.some((finding) => finding.includes('aria-label: Save'))).toBe(true);
    expect(findings.some((finding) => finding.includes('JSX text: Cancel'))).toBe(true);
    expect(findings.some((finding) => finding.includes('JSX expression: Delete'))).toBe(true);
  });

  it('does not hardcode English copy in production React markup', () => {
    const sourceRoot = path.resolve(process.cwd(), 'src');
    const findings = collectProductionTsxFiles(sourceRoot).flatMap((filePath) => findHardcodedEnglishCopy(filePath));

    expect(findings, findings.join('\n')).toEqual([]);
  });
});
