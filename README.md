# dts-typescript

[Distributed Text Services (DTS)](https://dtsapi.org/) v1.0 API implementation for the TEI/XML files available in the [Kouigenji Monogatari Text DB](https://kouigenjimonogatari.github.io/) (校異源氏物語テキストDB).

Multiple citation trees are supported:
- **Default**: page / line navigation
- **Waka** (`tree=waka`): navigation by waka (tanka) poems embedded in the text (`<lg type="waka">`)

## 🌐 Website

[Visit the demo page](https://dts-typescript.vercel.app/api/dts) to try it out.

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
