import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  getI129fTemplatePath,
  getPdfGeneratedRoot,
  getPdfTemplateRoot,
  loadI129fTemplate,
  resolvePdfTemplatePath,
} from "@/lib/pdf/templates";

const templateBytes = Buffer.from("template-bytes");

describe("PDF template storage", () => {
  let cwdSpy: ReturnType<typeof vi.spyOn> | undefined;
  let workspaceRoot = "";

  beforeEach(async () => {
    workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "k-visa-pdf-"));
    cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(workspaceRoot);

    await mkdir(path.join(workspaceRoot, "pdf", "templates", "i-129f"), {
      recursive: true,
    });
    await writeFile(
      path.join(
        workspaceRoot,
        "pdf",
        "templates",
        "i-129f",
        "uscis-i-129f-01-20-25.pdf",
      ),
      templateBytes,
    );
  });

  afterEach(async () => {
    cwdSpy?.mockRestore();
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it("loads the I-129F template from local development storage", async () => {
    await expect(loadI129fTemplate()).resolves.toEqual(templateBytes);
    expect(getPdfTemplateRoot()).toBe(path.join(workspaceRoot, "pdf", "templates"));
    expect(getI129fTemplatePath()).toBe(
      path.join(
        workspaceRoot,
        "pdf",
        "templates",
        "i-129f",
        "uscis-i-129f-01-20-25.pdf",
      ),
    );
  });

  it("fails clearly when the template is missing", async () => {
    await rm(
      path.join(
        workspaceRoot,
        "pdf",
        "templates",
        "i-129f",
        "uscis-i-129f-01-20-25.pdf",
      ),
    );

    await expect(loadI129fTemplate()).rejects.toThrow(
      `Missing PDF template at ${path.join(
        workspaceRoot,
        "pdf",
        "templates",
        "i-129f",
        "uscis-i-129f-01-20-25.pdf",
      )}.`,
    );
  });

  it("keeps generated PDFs separate from template storage", () => {
    expect(getPdfGeneratedRoot()).toBe(path.join(workspaceRoot, "pdf", "generated"));
    expect(path.relative(getPdfTemplateRoot(), getPdfGeneratedRoot())).toMatch(
      /^\.\./,
    );
  });

  it("rejects template paths that escape the storage root", () => {
    expect(() => resolvePdfTemplatePath("../escape.pdf")).toThrow(
      /Templates must stay within/,
    );
  });
});

describe("official I-129F template", () => {
  it("loads the checked-in 01/20/25 XFA form", async () => {
    const template = await loadI129fTemplate();

    expect(template.subarray(0, 5).toString()).toBe("%PDF-");
    expect(template.length).toBeGreaterThan(700_000);
  });
});
