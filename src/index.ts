import express, { Request, Response } from "express";
import cors from "cors";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import path from "path";

import { dtsRouter } from "./api/v1/dts"; // DTSのエンドポイント
import { documentRouter } from "./api/v1/document"; // ドキュメントのエンドポイント

import { navigationRouter } from "./api/v1/navigation"; // ナビゲーションのエンドポイント

import { collectionRouter } from "./api/v1/collection"; // コレクションのエンドポイント

import { dtsRouter as v2DtsRouter } from "./api/v2/dts";
import { collectionRouter as v2CollectionRouter } from "./api/v2/collection";
import { documentRouter as v2DocumentRouter } from "./api/v2/document";
import { navigationRouter as v2NavigationRouter } from "./api/v2/navigation";

const app = express();
const port = process.env.PORT || 3000;

// Swagger設定
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Kouigenjimonogatari DTS API",
      version: "2.0.0",
      description: "校異源氏物語テキストDB用 Digital Text Services API。v1とv2の両方のエンドポイントを提供し、XMLテキストの取得、ナビゲーション、コレクション情報の参照が可能です。",
    },
    servers: [
      {
        url: "https://dts-typescript.vercel.app",
        description: "Production server",
      },
      {
        url: `http://localhost:${port}`,
        description: "Development server",
      },
    ],
  },
  apis: [
    // TypeScriptファイルのパス（開発環境用）
    path.join(process.cwd(), "src", "api", "v1", "*.ts"),
    path.join(process.cwd(), "src", "api", "v2", "*.ts"),
    "./src/api/v1/*.ts",
    "./src/api/v2/*.ts",
    // コンパイル済みJavaScriptファイルのパス（本番環境用）
    path.join(__dirname, "api", "v1", "*.js"),
    path.join(__dirname, "api", "v2", "*.js"),
    // 追加のパスパターン
    path.join(__dirname, "api", "v1", "*.ts"),
    path.join(__dirname, "api", "v2", "*.ts")
  ], // 複数のパスパターンを試行
};

// デバッグ用: パス情報を確認
console.log("Current working directory:", process.cwd());
console.log("__dirname:", __dirname);
console.log("API paths:", swaggerOptions.apis);

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// デバッグ用: 生成されたスペックを確認
console.log("Generated paths:", Object.keys(swaggerSpec.paths || {}));

// CORS設定
app.use(cors());

// Express JSON パーサー（必要に応じて）
app.use(express.json());

// Swagger UI - CDNを使用した配信
app.get("/api-docs", (_req: Request, res: Response) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Kouigenjimonogatari DTS API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/swagger.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// デバッグ用のエンドポイント
app.get("/debug", (_req: Request, res: Response) => {
  const { glob } = require('glob');
  
  const debugInfo = {
    cwd: process.cwd(),
    dirname: __dirname,
    apiPaths: swaggerOptions.apis,
    generatedPaths: Object.keys(swaggerSpec.paths || {}),
    availableFiles: []
  };
  
  // 各パスパターンでファイルを検索
  swaggerOptions.apis.forEach(async (pattern) => {
    try {
      const files = await glob(pattern);
      debugInfo.availableFiles.push({ pattern, files });
    } catch (error) {
      debugInfo.availableFiles.push({ pattern, error: error.message });
    }
  });
  
  res.json(debugInfo);
});

// Swagger JSONスペックのエンドポイント
app.get("/swagger.json", (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpec);
});

app.get("/", (_req: Request, res: Response) => {
  res.redirect("/api/v2/dts");
});

app.get("/api/dts", (_req: Request, res: Response) => {
  res.redirect("/api/v2/dts");
});

app.use("/api/v1/dts", dtsRouter);

app.use("/api/v1/dts/document", documentRouter);

app.use("/api/v1/dts/navigation", navigationRouter);

app.use("/api/v1/dts/collections", collectionRouter);

app.use("/api/v2/dts", v2DtsRouter);

app.use("/api/v2/dts/collection", v2CollectionRouter);

app.use("/api/v2/dts/document", v2DocumentRouter);

app.use("/api/v2/dts/navigation", v2NavigationRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
