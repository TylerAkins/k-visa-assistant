import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

const PDF_STORAGE_ROOT = "pdf";
const PDF_TEMPLATE_DIR = "templates";
const PDF_GENERATED_DIR = "generated";
const I129F_TEMPLATE_DIR = "i-129f";
const I129F_TEMPLATE_FILE = "uscis-i-129f-01-20-25.pdf";

export class PdfTemplateLoadError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PdfTemplateLoadError";
  }
}

function getWorkspaceRelativePath(...segments: string[]): string {
  return path.join(process.cwd(), ...segments);
}

export function getPdfTemplateRoot(): string {
  return getWorkspaceRelativePath(PDF_STORAGE_ROOT, PDF_TEMPLATE_DIR);
}

export function getPdfGeneratedRoot(): string {
  return getWorkspaceRelativePath(PDF_STORAGE_ROOT, PDF_GENERATED_DIR);
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}

export function resolvePdfTemplatePath(relativeTemplatePath: string): string {
  const templateRoot = path.resolve(getPdfTemplateRoot());
  const resolvedPath = path.resolve(templateRoot, relativeTemplatePath);
  const relativePath = path.relative(templateRoot, resolvedPath);

  if (
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath) ||
    resolvedPath === templateRoot
  ) {
    throw new PdfTemplateLoadError(
      `Invalid PDF template path "${relativeTemplatePath}". Templates must stay within ${templateRoot}.`,
    );
  }

  return resolvedPath;
}

export async function loadPdfTemplate(
  relativeTemplatePath: string,
): Promise<Buffer> {
  const templatePath = resolvePdfTemplatePath(relativeTemplatePath);

  try {
    return await readFile(templatePath);
  } catch (error) {
    if (isMissingFileError(error)) {
      throw new PdfTemplateLoadError(
        `Missing PDF template at ${templatePath}. Store official templates under ${getPdfTemplateRoot()} before generating PDFs.`,
        { cause: error },
      );
    }

    throw new PdfTemplateLoadError(
      `Unable to read PDF template at ${templatePath}.`,
      { cause: error },
    );
  }
}

export function getI129fTemplatePath(): string {
  return resolvePdfTemplatePath(path.join(I129F_TEMPLATE_DIR, I129F_TEMPLATE_FILE));
}

export async function loadI129fTemplate(): Promise<Buffer> {
  return loadPdfTemplate(path.join(I129F_TEMPLATE_DIR, I129F_TEMPLATE_FILE));
}
