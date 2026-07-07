import { describe, it, expect } from "vitest";
import { INFO_JSON_URL, UpstreamError, extractVol } from "../utils/dataSource";

describe("INFO_JSON_URL", () => {
  it("移転先の genji.lib ドメインを指し、廃止された genji.dl.itc を指していない", () => {
    // 回帰テスト: 旧ドメイン (JS リダイレクト + HTTP 404) に戻すと collection が壊れる
    expect(INFO_JSON_URL).toContain("genji.lib.u-tokyo.ac.jp");
    expect(INFO_JSON_URL).not.toContain("genji.dl.itc");
  });
});

describe("extractVol", () => {
  it("vol の値を文字列として返す", () => {
    expect(extractVol({ metadata: [{ label: "vol", value: 3 }] })).toBe("3");
    expect(extractVol({ metadata: [{ label: "vol", value: "12" }] })).toBe("12");
  });

  it("metadata が無い / 不正な場合は null を返す (クラッシュしない)", () => {
    expect(extractVol(null)).toBeNull();
    expect(extractVol(undefined)).toBeNull();
    expect(extractVol({})).toBeNull();
    expect(extractVol({ metadata: [] })).toBeNull();
    expect(extractVol({ metadata: [{ label: "other", value: "x" }] })).toBeNull();
    expect(extractVol({ metadata: "not-an-array" })).toBeNull();
  });
});

describe("UpstreamError", () => {
  it("url と status を保持する Error である", () => {
    const err = new UpstreamError("boom", "https://example/info.json", 404);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("UpstreamError");
    expect(err.url).toBe("https://example/info.json");
    expect(err.status).toBe(404);
  });

  it("接続失敗時は status を省略できる", () => {
    const err = new UpstreamError("connection refused", "https://example/info.json");
    expect(err.status).toBeUndefined();
  });
});
