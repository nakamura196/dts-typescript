import { Router, Request, Response } from "express";

export const dtsRouter = Router();

/**
 * @swagger
 * /api/v1/dts:
 *   get:
 *     summary: Get DTS API v1 entry point
 *     description: Returns the main entry point for the Digital Text Services API v1
 *     tags:
 *       - DTS v1
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 navigation:
 *                   type: string
 *                   example: "/api/v1/dts/navigation"
 *                 "@id":
 *                   type: string
 *                   example: "/api/v1/dts"
 *                 "@type":
 *                   type: string
 *                   example: "EntryPoint"
 *                 collections:
 *                   type: string
 *                   example: "/api/v1/dts/collections"
 *                 "@context":
 *                   type: string
 *                   example: "dts/EntryPoint.jsonld"
 *                 documents:
 *                   type: string
 *                   example: "/api/v1/dts/document"
 */
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
