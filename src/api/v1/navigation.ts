import { Router, Request, Response } from "express";
import { getDocument } from "../../utils/xmlParser"; // ユーティリティ関数として外部ファイルに分離
import { Element as XMLElement } from "@xmldom/xmldom";

export const navigationRouter = Router();

/**
 * @swagger
 * /api/v1/dts/navigation:
 *   get:
 *     summary: Get navigation data (v1)
 *     description: Retrieve navigation structure for a document
 *     tags:
 *       - Navigation v1
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document identifier
 *       - in: query
 *         name: ref
 *         required: false
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: References to filter by
 *     responses:
 *       200:
 *         description: Navigation data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 passage:
 *                   type: string
 *                 level:
 *                   type: number
 *                 citeType:
 *                   type: string
 *                 "@id":
 *                   type: string
 *                 citeDepth:
 *                   type: number
 *                 "@context":
 *                   type: object
 *                 "hydra:member":
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ref:
 *                         type: string
 *       400:
 *         description: Bad request - id is required
 *       500:
 *         description: Internal server error
 */
navigationRouter.get("/", async (req: Request, res: Response) => {
  const { ref, id } = req.query;

  if (!id) {
    res.status(400).json({ error: "id is required" });
    return;
  }

  const targets: string[] = [];

  if (ref) {
    if (Array.isArray(ref)) {
      targets.push(...(ref as string[]));
    } else {
      targets.push(ref as string);
    }
  }

  const xmlDoc = await getDocument(id as string);

  if (!xmlDoc) {
    res.status(500).json({ error: "Failed to load or parse XML" });
    return;
  }

  // querySelectorAllを使って 'seg' タグを取得し、'corresp'属性を返す
  const member = Array.from(xmlDoc.getElementsByTagName("seg"))
    .map((seg: XMLElement) => {
      const corresp = seg.getAttribute("corresp");

      if (corresp === null) {
        return;
      }

      if (targets.length === 0 || targets.includes(corresp)) {
        return {
          ref: corresp,
        };
      }
    })
    .filter((m) => m !== undefined);

  // const member: any = [];

  // パースされたデータを処理（例: ナビゲーションデータを作成）
  const navigationData = {
    passage: `/api/v1/dts/document?id=${id}{&ref}`,
    level: 1,
    citeType: "line",
    "@id": `/api/v1/dts/navigation?level=1&id=${id}${
      targets.length > 0 ? `&ref=${targets.join(",")}` : ""
    }`,
    citeDepth: 1,
    "@context": {
      hydra: "https://www.w3.org/ns/hydra/core#",
      "@vocab": "https://w3id.org/dts/api#",
    },
    "hydra:member": member,
  };

  // ナビゲーション情報を返す
  res.json(navigationData);
});
