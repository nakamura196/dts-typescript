import { Router, Request, Response } from "express";

export const dtsRouter = Router();

dtsRouter.get("/", (req: Request, res: Response) => {
  res.json({
    navigation: "/api/v1/dts/navigation",
    "@id": "/api/v1/dts",
    "@type": "EntryPoint",
    collections: "/api/v1/dts/collections",
    "@context": "dts/EntryPoint.jsonld",
    documents: "/api/v1/dts/document",
  });
});
