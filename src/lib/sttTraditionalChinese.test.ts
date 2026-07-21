import { describe, expect, it } from "vitest";

import { normalizeTaiwanUiText } from "@/lib/normalizeTaiwanUiText";
import { toTraditionalChineseForDisplay } from "@/lib/sttTraditionalChinese";

describe("normalizeTaiwanUiText", () => {
  it("maps official 臺* place forms to common 台*", () => {
    expect(normalizeTaiwanUiText("請介紹臺灣")).toBe("請介紹台灣");
    expect(normalizeTaiwanUiText("臺北 臺中 臺南 臺東")).toBe(
      "台北 台中 台南 台東",
    );
  });

  it("leaves English unchanged", () => {
    expect(normalizeTaiwanUiText("Taiwan is beautiful.")).toBe(
      "Taiwan is beautiful.",
    );
  });
});

describe("toTraditionalChineseForDisplay", () => {
  it("runs OpenCC then Taiwan UI localization", () => {
    expect(toTraditionalChineseForDisplay("请介绍台湾")).toBe("請介紹台灣");
    expect(toTraditionalChineseForDisplay("电脑软件 里面")).toBe(
      "電腦軟件 裡面",
    );
  });

  it("leaves English unchanged", () => {
    expect(toTraditionalChineseForDisplay("Taiwan is beautiful.")).toBe(
      "Taiwan is beautiful.",
    );
  });

  it("converts Chinese in mixed text and keeps Latin", () => {
    const out = toTraditionalChineseForDisplay("Taiwan 电脑");
    expect(out).toContain("Taiwan");
    expect(out).toContain("電腦");
    expect(out).not.toContain("电脑");
  });
});
