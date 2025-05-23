import { Router, Request, Response } from "express";

export const dtsRouter = Router();

dtsRouter.get("/", (req: Request, res: Response) => {
  res.json({
    "@context": "https://distributed-text-services.github.io/specifications/context/1-alpha1.json",
    "dtsVersion": "1-alpha",
    "@id": "/api/v2/dts",
    "@type": "EntryPoint",
    "collection": "/api/v2/dts/collection{?id}",
    "navigation": "/api/v2/dts/navigation{?resource,ref,down}",
    "document": "/api/v2/dts/document{?resource,ref}"
    }/*{
    navigation: "/api/v1/dts/navigation",
    "@id": "/api/v1/dts",
    "@type": "EntryPoint",
    collections: "/api/v1/dts/collections",
    "@context": "dts/EntryPoint.jsonld",
    documents: "/api/v1/dts/document",
  }*/);
});
