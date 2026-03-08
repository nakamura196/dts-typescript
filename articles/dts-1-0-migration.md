---
title: "DTS (Distributed Text Services) 1.0 正式リリースへの対応 ― TEI/XMLテキストAPIの仕様更新記録"
emoji: "📜"
type: "tech"
topics: ["dts", "api", "tei", "digitalhumanities", "typescript"]
published: false
---

## はじめに

2026年2月、テキストコレクションへの標準的なアクセス手段を提供するAPI仕様「[Distributed Text Services (DTS)](https://dtsapi.org/)」のv1.0が正式にリリースされました。

本記事では、DTS 1-alpha に基づいて構築していた校異源氏物語テキストDB用APIを、DTS 1.0に対応させた際の変更点を整理します。

https://github.com/distributed-text-services/specifications/releases/tag/v1.0

### DTS とは

DTS は、TEI/XMLなどのテキストコレクションに対する標準的なアクセスAPIを定める仕様です。以下の4つのエンドポイントで構成されます。

| エンドポイント | 役割 |
|--------------|------|
| **Entry Point** | APIの各エンドポイントURLを返す |
| **Collection** | テキスト間のナビゲーション（コレクション・リソースの一覧） |
| **Navigation** | テキスト内のナビゲーション（引用構造の探索） |
| **Document** | テキスト本体の取得（TEI/XMLの全体または一部） |

### 対象プロジェクト

[校異源氏物語テキストDB](https://kouigenjimonogatari.github.io/)のDTS API実装（TypeScript/Express.js）です。

- 本番: https://dts-typescript.vercel.app/api/v2/dts
- ソースコード: https://github.com/nakamura196/dts-typescript

## 1-alpha から 1.0 への主な変更点

### 1. JSON-LD Context URLの変更

最も基本的な変更は、JSON-LDコンテキストファイルのURLです。

```diff
- "@context": "https://distributed-text-services.github.io/specifications/context/1-alpha1.json"
+ "@context": "https://dtsapi.org/context/v1.0.json"
```

ドメインが `distributed-text-services.github.io` から `dtsapi.org` に変わりました。これは仕様の正式公開に伴い、永続的なURLが割り当てられたことを意味します。

### 2. dtsVersion の更新

```diff
- "dtsVersion": "1-alpha"
+ "dtsVersion": "1.0"
```

全エンドポイントのレスポンスに含まれる `dtsVersion` フィールドを更新します。

### 3. URI Template の全パラメータ記載

1-alphaでは一部のパラメータのみ記載していましたが、1.0ではAPIが受け付ける全パラメータをURI templateに含める必要があります。

**Entry Point のレスポンス例:**

```diff
{
-   "collection": "/api/v2/dts/collection{?id}",
-   "navigation": "/api/v2/dts/navigation{?resource,ref,down}",
-   "document": "/api/v2/dts/document{?resource,ref}"
+   "collection": "/api/v2/dts/collection{?id,page,nav}",
+   "navigation": "/api/v2/dts/navigation{?resource,ref,start,end,down,tree,page}",
+   "document": "/api/v2/dts/document{?resource,ref,start,end,tree,mediaType}"
}
```

追加されたパラメータ:

| パラメータ | エンドポイント | 用途 |
|-----------|--------------|------|
| `page` | Collection, Navigation | ページネーション |
| `nav` | Collection | `children`（デフォルト）または `parents` |
| `start` / `end` | Navigation, Document | 範囲指定（`ref`と排他） |
| `tree` | Navigation, Document | Citation Tree の選択 |
| `mediaType` | Document | レスポンスのメディアタイプ指定 |

### 4. Content-Type の厳密化

1-alpha では `application/json` で返していたJSON応答を、1.0 では `application/ld+json` で返す必要があります。

```typescript
// JSON-LD レスポンス（Entry Point, Collection, Navigation）
res.set("Content-Type", "application/ld+json");

// Document レスポンス
res.set("Content-Type", "application/tei+xml");
```

| エンドポイント | 旧 Content-Type | 新 Content-Type |
|--------------|----------------|-----------------|
| Entry Point / Collection / Navigation | `application/json` | `application/ld+json` |
| Document | `application/xml` | `application/tei+xml` |

### 5. Document エンドポイントの Link ヘッダー

Document エンドポイントのレスポンスに、Collection エンドポイントへの `Link` ヘッダーが必要になりました。

```typescript
res.set("Link", `</api/v2/dts/collection?id=${resource}>; rel="collection"`);
```

レスポンスヘッダーの例:

```
Content-Type: application/tei+xml; charset=utf-8
Link: </api/v2/dts/collection?id=urn:kouigenjimonogatari.1>; rel="collection"
```

### 6. Navigation エンドポイントの down パラメータ動作変更

1-alphaでは `down` パラメータにデフォルト値を設定していましたが、1.0 では `down` の有無で動作が大きく変わります。

| `down` | `ref` | 動作 |
|--------|-------|------|
| 未指定 | 未指定 | **400 Bad Request** |
| 未指定 | あり | `ref` の情報のみ返却（`member` 配列なし） |
| 1以上 | 未指定 | ルートから指定深度までの `member` 配列を返却 |
| 1以上 | あり | `ref` から指定深度までの `member` 配列を返却 |
| -1 | 未指定/あり | 最深レベルまで全て返却 |
| 0 | あり | `ref` と同じ親を持つ兄弟を返却 |

```typescript
// 1-alpha: デフォルトで down=1
if (down === undefined) {
  down = "1";
}

// 1.0: down, ref, start/end 全て未指定なら 400
if (down === undefined && !ref && !start && !end) {
  res.status(400).json({ error: "down, ref, or start/end is required" });
  return;
}
```

### 7. CitableUnit の identifier フィールド

Navigation レスポンスの `ref` オブジェクトでは、`@id` ではなく `identifier` を使用します。

```diff
  navigationData["ref"] = {
-   "@id": refString,
+   "identifier": refString,
    "@type": "CitableUnit",
    "level": 1,
    "parent": null,
    "citeType": "page"
  }
```

### 8. パラメータのバリデーション追加

DTS 1.0 では、不正なパラメータの組み合わせに対して明確に 400/404 を返す必要があります。

```typescript
// ref と start/end は排他
if (ref && (start || end)) {
  res.status(400).json({ error: "ref cannot be used with start/end" });
  return;
}

// start と end は必ずセット
if ((start && !end) || (end && !start)) {
  res.status(400).json({ error: "start and end must be used together" });
  return;
}
```

## Level 0 と Level 1

DTS 1.0 では準拠レベルが定義されています。

- **Level 0**: `start`/`end` パラメータの実装が不要（静的ファイルでの実装を想定）
- **Level 1**: 全パラメータをサポート

今回の実装では Level 0 準拠としています。URI template には全パラメータを記載しつつ、`start`/`end` が使用された場合はバリデーションエラーを返します。これは仕様上正しい動作です。

> A Level 0 DTS Server need not support the start and end parameters for the Navigation endpoint. It SHOULD raise an error if either of these parameters are used in a request.

## 複数の Citation Tree による和歌ナビゲーション

DTS 1.0 では、1つのリソースに複数の Citation Tree を定義できます。校異源氏物語のTEI/XMLには、本文中に和歌（短歌）が `<lg type="waka">` 要素として埋め込まれています。

```xml
<lg xml:id="waka-001" type="waka" rhyme="tanka">
  <l n="1">かきりとて</l>
  <l n="2">わかるゝ道の</l>
  <l n="3">かなしきに</l>
  <l n="4">いかまほしきは</l>
  <l n="5">いのちなりけり</l>
</lg>
```

この構造を活用して、デフォルトのページ/行ナビゲーションに加えて、和歌専用の Citation Tree を追加しました。

### citationTrees の定義

```json
{
  "citationTrees": [
    {
      "@type": "CitationTree",
      "citeStructure": [
        { "citeType": "page", "citeStructure": [{ "citeType": "line" }] }
      ]
    },
    {
      "@type": "CitationTree",
      "identifier": "waka",
      "description": "和歌（短歌）による引用構造",
      "citeStructure": [
        { "citeType": "waka", "citeStructure": [{ "citeType": "ku" }] }
      ]
    }
  ]
}
```

DTS 1.0 の仕様では：
- デフォルトの Citation Tree（先頭）には `identifier` を付けない
- 2つ目以降の Citation Tree には `identifier` を付ける
- `description` はオプションで人間可読な説明を付与可能

### `tree` パラメータの使い方

クライアントは `tree` パラメータで使用する Citation Tree を切り替えます。

```bash
# デフォルト（ページ/行）でナビゲーション
/navigation?resource=urn:kouigenjimonogatari.1&down=1

# 和歌ツリーで一覧取得
/navigation?resource=urn:kouigenjimonogatari.1&tree=waka&down=1

# 和歌ツリーで全階層（歌 + 句）取得
/navigation?resource=urn:kouigenjimonogatari.1&tree=waka&down=-1

# 特定の和歌のXMLを取得
/document?resource=urn:kouigenjimonogatari.1&tree=waka&ref=waka-001

# 第3句のみ取得
/document?resource=urn:kouigenjimonogatari.1&tree=waka&ref=waka-001.3
```

### 実装のポイント

Citation Trees の定義は `src/utils/citationTrees.ts` に集約し、Collection・Navigation・Document の3エンドポイントで共有しています。

Navigation エンドポイントでは、`tree` パラメータに応じて異なるメンバーマップ構築関数を呼び出します：

```typescript
if (treeString === "waka") {
  buildWakaMembersMap(xmlDoc, membersMap);  // <lg type="waka"> を探索
} else {
  buildDefaultMembersMap(xmlDoc, membersMap);  // <seg corresp="..."> を探索
}
```

Document エンドポイントでは、`tree=waka` かつ `ref=waka-001` のように指定された場合に `<lg xml:id="waka-001">` を抽出して返します。句単位（`ref=waka-001.3`）の場合は `<l n="3">` のみを返します。

## テストの追加

今回の更新に合わせて、vitest によるテストを追加しました。DTS 1.0 準拠を検証する29件のテストを含みます。

```bash
npm test
```

テストでは以下を検証しています:

- 各エンドポイントのレスポンスフォーマット（Context URL, dtsVersion, @type）
- Content-Type ヘッダー（`application/ld+json`, `application/tei+xml`）
- URI template の全パラメータ記載
- Document の Link ヘッダー
- バリデーション（400/404エラー）
- Navigation の down パラメータ動作
- 和歌ナビゲーション（`tree=waka`）での歌・句の取得
- 和歌ドキュメント取得（歌全体、句単位）

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/api/v2/dts.ts` | Context URL, dtsVersion, URI templates, Content-Type |
| `src/api/v2/collection.ts` | 同上 + `page`/`nav` パラメータ定義, citationTrees 共通化 |
| `src/api/v2/navigation.ts` | 同上 + `down` 動作変更, バリデーション, `identifier`, `tree=waka` 対応 |
| `src/api/v2/document.ts` | Content-Type `application/tei+xml`, Link ヘッダー, バリデーション, `tree=waka` 対応 |
| `src/utils/citationTrees.ts` | Citation Trees 定義の共通モジュール（新規） |
| `src/__tests__/dts-v2.test.ts` | vitest テスト29件 |

## おわりに

DTS 1.0 は長年の開発・相互運用性テストを経て正式リリースされた仕様です。1-alpha からの変更は比較的小規模ですが、Content-Type の厳密化やパラメータバリデーションなど、本番運用を意識した改善が含まれています。

デジタル・ヒューマニティーズの分野でTEI/XMLテキストを公開する際に、DTS 準拠のAPIを実装することで、既存のDTSクライアントとの相互運用が可能になります。

### 参考リンク

- [DTS 1.0 仕様](https://dtsapi.org/specifications/versions/v1.0/)
- [DTS GitHub リポジトリ](https://github.com/distributed-text-services/specifications)
- [校異源氏物語テキストDB DTS API](https://dts-typescript.vercel.app/api/v2/dts)
