# dts-typescript

> [!IMPORTANT]
> **This repository is archived and no longer maintained (2026-10).**
> The DTS API has moved into [genji-api](https://github.com/nakamura196/genji-api) and is served at **https://genji.ldas.jp/api/v2/dts**.
> `https://dts.ldas.jp/*` now redirects (301) to the same path on `https://genji.ldas.jp`.
>
> **本リポジトリはアーカイブしました（2026年10月）。** DTS API は [genji-api](https://github.com/nakamura196/genji-api) に統合し、**https://genji.ldas.jp/api/v2/dts** で提供しています。`https://dts.ldas.jp/*` は `https://genji.ldas.jp` の同じパスへ転送（301）されます。

[Distributed Text Services (DTS)](https://dtsapi.org/) v1.0 API implementation for the TEI/XML files available in the [Kouigenji Monogatari Text DB](https://kouigenjimonogatari.github.io/) (校異源氏物語テキストDB).

Multiple citation trees are supported:
- **Default**: page / line navigation
- **Waka** (`tree=waka`): navigation by waka (tanka) poems embedded in the text (`<lg type="waka">`)

## 🌐 Website

[Visit the demo page](https://genji.ldas.jp/api/v2/dts) to try it out.

## Setup

```bash
npm install
```

## Development Server

Start the development server on http://localhost:3403

```bash
npm run dev
```

## Test

```bash
npm test
```

## Deploy

```bash
vercel deploy
```
