import express, { Request, Response } from "express";
import cors from "cors";
import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

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
        url: `http://localhost:${port}`,
        description: "Development server",
      },
      {
        url: "https://dts-typescript.vercel.app",
        description: "Production server",
      },
    ],
  },
  apis: ["./src/api/v1/*.ts", "./src/api/v2/*.ts"], // APIルートファイルのパス
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// CORS設定
app.use(cors());

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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
