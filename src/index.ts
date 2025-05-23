import express, { Request, Response } from "express";

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

app.get("/", (req: Request, res: Response) => {
  res.redirect("/api/v1/dts");
});

app.get("/api/dts", (req: Request, res: Response) => {
  res.redirect("/api/v1/dts");
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
