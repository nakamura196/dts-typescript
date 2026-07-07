import axios from "axios";
import type { Response } from "express";

/**
 * 校異源氏物語テキストDB の情報ソース (info.json)。
 *
 * 2025年に配信ドメインが `genji.dl.itc.u-tokyo.ac.jp` から
 * `genji.lib.u-tokyo.ac.jp` へ移転した。
 *
 * 旧ドメインは HTTP リダイレクト (301/302) ではなく、HTTP 404 とともに
 * JavaScript による client-side redirect (`window.location.replace`) を含む
 * HTML を返す。このため axios/fetch のような HTTP クライアントは
 * リダイレクトを追従できず 404 を受け取ってしまう
 * (ブラウザのみ JS を実行して移転先へ遷移できる)。
 * よってサーバ側で新ドメインの URL を直接指定する必要がある。
 *
 * 環境変数 `GENJI_INFO_URL` で上書き可能 (将来の再移転やテストに備える)。
 */
export const INFO_JSON_URL =
  process.env.GENJI_INFO_URL ??
  "https://genji.lib.u-tokyo.ac.jp/data/info.json";

/** info.json 取得時のタイムアウト (ms)。 */
const FETCH_TIMEOUT_MS = 15000;

/** 上流データソースの取得に失敗したことを表すエラー。 */
export class UpstreamError extends Error {
  constructor(
    message: string,
    /** 取得を試みた URL。 */
    public readonly url: string,
    /** 上流から返された HTTP ステータス (接続自体に失敗した場合は undefined)。 */
    public readonly status?: number
  ) {
    super(message);
    this.name = "UpstreamError";
  }
}

/**
 * info.json を取得してパース済みの JSON を返す。
 * 取得・接続に失敗した場合は {@link UpstreamError} を投げる。
 */
export async function fetchInfoJson(): Promise<any> {
  try {
    const response = await axios.get(INFO_JSON_URL, {
      timeout: FETCH_TIMEOUT_MS,
      headers: { Accept: "application/json" },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = status
        ? `情報ソースの取得に失敗しました (HTTP ${status}): ${INFO_JSON_URL}`
        : `情報ソースに接続できませんでした: ${INFO_JSON_URL} (${error.message})`;
      throw new UpstreamError(message, INFO_JSON_URL, status);
    }
    throw error;
  }
}

/**
 * 上流取得の失敗を、原因が分かるエラーレスポンスとして送出する。
 * - {@link UpstreamError} → 502 Bad Gateway (上流の問題であることを示す)
 * - その他 → 500 Internal Server Error
 */
export function respondUpstreamError(res: Response, error: unknown): void {
  if (error instanceof UpstreamError) {
    res.status(502).json({
      error: "UpstreamFetchError",
      message: error.message,
      source: error.url,
      upstreamStatus: error.status ?? null,
      hint: "情報ソース (info.json) の取得に失敗しました。ソースの配信状況や URL の移転を確認してください。",
    });
    return;
  }
  res.status(500).json({
    error: "InternalServerError",
    message: error instanceof Error ? error.message : String(error),
  });
}

/**
 * info.json の member 1件から巻号 (`vol`) を取り出す。
 * `metadata` が無い / `vol` ラベルが無い場合は `null` を返す
 * (以前は `.find(...).value` が undefined を参照してクラッシュしていた)。
 */
export function extractVol(item: any): string | null {
  if (!item || !Array.isArray(item.metadata)) return null;
  const meta = item.metadata.find((m: any) => m?.label === "vol");
  return meta?.value != null ? String(meta.value) : null;
}
