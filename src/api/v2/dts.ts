import { Router, Request, Response } from "express";

export const dtsRouter = Router();

/**
 * @swagger
 * /api/v2/dts:
 *   get:
 *     summary: Get DTS API v2 entry point
 *     description: Returns the main entry point for the Digital Text Services API v2
 *     tags:
 *       - DTS v2
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 "@context":
 *                   type: string
 *                   example: "https://distributed-text-services.github.io/specifications/context/1-alpha1.json"
 *                 dtsVersion:
 *                   type: string
 *                   example: "1-alpha"
 *                 "@id":
 *                   type: string
 *                   example: "/api/v2/dts"
 *                 "@type":
 *                   type: string
 *                   example: "EntryPoint"
 *                 collection:
 *                   type: string
 *                   example: "/api/v2/dts/collection{?id}"
 *                 navigation:
 *                   type: string
 *                   example: "/api/v2/dts/navigation{?resource,ref,down}"
 *                 document:
 *                   type: string
 *                   example: "/api/v2/dts/document{?resource,ref}"
 */
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
