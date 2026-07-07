import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import http from "http";

// info.json の取得だけをモックし、変換・エラーハンドリングは実物を使う。
// これによりネットワークに依存せず、成功系/404/上流障害を再現できる。
vi.mock("../utils/dataSource", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/dataSource")>();
  return { ...actual, fetchInfoJson: vi.fn() };
});

import { app } from "../index";
import { fetchInfoJson, UpstreamError } from "../utils/dataSource";

const mockFetch = vi.mocked(fetchInfoJson);

const PORT = 3500;
const BASE = `http://localhost:${PORT}`;
let server: http.Server;

// selections[].members[] の最小フィクスチャ。
// 3件目は vol メタデータが欠落しており、スキップされること (500 にならないこと) を検証する。
const FIXTURE = {
  selections: [
    {
      members: [
        { label: "桐壺", metadata: [{ label: "vol", value: "1" }] },
        { label: "帚木", metadata: [{ label: "vol", value: "2" }] },
        { label: "壊れたデータ", metadata: [{ label: "other", value: "x" }] },
      ],
    },
  ],
};

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(PORT, () => resolve());
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

beforeEach(() => {
  mockFetch.mockReset();
});

async function getJson(path: string) {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, body: await res.json() };
}

describe("v2 collection (上流をモック)", () => {
  it("ルートコレクションを返し、vol の無い member はスキップする", async () => {
    mockFetch.mockResolvedValue(FIXTURE);
    const { status, body } = await getJson("/api/v2/dts/collection");
    expect(status).toBe(200);
    expect(body["@type"]).toBe("Collection");
    expect(body.totalChildren).toBe(2); // 3件中 vol 欠落の1件を除外
    expect(body.member.map((m: any) => m["@id"])).toEqual([
      "urn:kouigenjimonogatari.1",
      "urn:kouigenjimonogatari.2",
    ]);
  });

  it("id 指定で該当リソースを返す", async () => {
    mockFetch.mockResolvedValue(FIXTURE);
    const { status, body } = await getJson(
      "/api/v2/dts/collection?id=urn:kouigenjimonogatari.2"
    );
    expect(status).toBe(200);
    expect(body["@type"]).toBe("Resource");
    expect(body["@id"]).toBe("urn:kouigenjimonogatari.2");
    expect(body.title).toBe("帚木");
    expect(body["@context"]).toBe("https://dtsapi.org/context/v1.0.json");
  });

  it("未知の id には分かりやすいメッセージ付きの 404 を返す", async () => {
    mockFetch.mockResolvedValue(FIXTURE);
    const { status, body } = await getJson(
      "/api/v2/dts/collection?id=urn:kouigenjimonogatari.999"
    );
    expect(status).toBe(404);
    expect(body.error).toBe("ResourceNotFound");
    expect(body.message).toContain("999");
  });

  it("上流が HTTP エラーを返したら source と upstreamStatus 付きで 502 を返す", async () => {
    mockFetch.mockRejectedValue(
      new UpstreamError(
        "情報ソースの取得に失敗しました (HTTP 404): https://example/info.json",
        "https://example/info.json",
        404
      )
    );
    const { status, body } = await getJson("/api/v2/dts/collection");
    expect(status).toBe(502);
    expect(body.error).toBe("UpstreamFetchError");
    expect(body.source).toBe("https://example/info.json");
    expect(body.upstreamStatus).toBe(404);
    expect(body.hint).toBeTruthy();
  });

  it("接続失敗時は upstreamStatus=null で 502 を返す", async () => {
    mockFetch.mockRejectedValue(
      new UpstreamError("接続できませんでした", "https://example/info.json")
    );
    const { status, body } = await getJson("/api/v2/dts/collection");
    expect(status).toBe(502);
    expect(body.upstreamStatus).toBeNull();
  });
});

describe("v1 collections (上流をモック)", () => {
  it("デフォルトのコレクション一覧を返す", async () => {
    mockFetch.mockResolvedValue(FIXTURE);
    const { status, body } = await getJson("/api/v1/dts/collections");
    expect(status).toBe(200);
    expect(body["@id"]).toBe("default");
    expect(body.member[0]["@id"]).toBe("urn:kouigenjimonogatari");
  });

  it("上流障害時は 502 を返す", async () => {
    mockFetch.mockRejectedValue(
      new UpstreamError("boom", "https://example/info.json", 500)
    );
    const { status, body } = await getJson("/api/v1/dts/collections");
    expect(status).toBe(502);
    expect(body.error).toBe("UpstreamFetchError");
  });
});
