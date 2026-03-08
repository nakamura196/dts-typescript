import { Router, Request, Response } from "express";

export const dtsRouter = Router();

/**
 * @swagger
 * /api/v2/dts:
 *   get:
 *     summary: Get DTS API v2 entry point
 *     description: Returns the main entry point for the Digital Text Services API v2 (DTS 1.0)
 *     tags:
 *       - DTS v2
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/ld+json:
 *             schema:
 *               type: object
 *               properties:
 *                 "@context":
 *                   type: string
 *                   example: "https://dtsapi.org/context/v1.0.json"
 *                 dtsVersion:
 *                   type: string
 *                   example: "1.0"
 *                 "@id":
 *                   type: string
 *                   example: "/api/v2/dts"
 *                 "@type":
 *                   type: string
 *                   example: "EntryPoint"
 *                 collection:
 *                   type: string
 *                   example: "/api/v2/dts/collection{?id,page,nav}"
 *                 navigation:
 *                   type: string
 *                   example: "/api/v2/dts/navigation{?resource,ref,start,end,down,tree,page}"
 *                 document:
 *                   type: string
 *                   example: "/api/v2/dts/document{?resource,ref,start,end,tree,mediaType}"
 */
dtsRouter.get("/", (req: Request, res: Response) => {
  res.set("Content-Type", "application/ld+json");
  res.json({
    "@context": "https://dtsapi.org/context/v1.0.json",
    "dtsVersion": "1.0",
    "@id": "/api/v2/dts",
    "@type": "EntryPoint",
    "collection": "/api/v2/dts/collection{?id,page,nav}",
    "navigation": "/api/v2/dts/navigation{?resource,ref,start,end,down,tree,page}",
    "document": "/api/v2/dts/document{?resource,ref,start,end,tree,mediaType}"
  });
});
