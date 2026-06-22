import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FutureFeaturePlaceholders } from "@/features/cases/components/forms";

describe("case placeholder components", () => {
  it("renders disabled future workflow cards", () => {
    const html = renderToStaticMarkup(<FutureFeaturePlaceholders />);

    expect(html).toContain("Questionnaire");
    expect(html).toContain("Evidence");
    expect(html).toContain("PDF Generation");
  });
});
