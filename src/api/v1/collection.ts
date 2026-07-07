import { Router, Request, Response } from "express";

import {
  extractVol,
  fetchInfoJson,
  respondUpstreamError,
} from "../../utils/dataSource";

const COLLECTION_TITLE = "校異源氏物語";
const COLLECTION_ID = "urn:kouigenjimonogatari";

export const collectionRouter = Router();

/**
 * @swagger
 * /api/v1/dts/collections:
 *   get:
 *     summary: Get collections (v1)
 *     description: Retrieve collection information and metadata
 *     tags:
 *       - Collections v1
 *     parameters:
 *       - in: query
 *         name: id
 *         required: false
 *         schema:
 *           type: string
 *         description: Collection identifier
 *     responses:
 *       200:
 *         description: Collection data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalItems:
 *                   type: number
 *                 member:
 *                   type: array
 *                   items:
 *                     type: object
 *                 title:
 *                   type: string
 *                 "@id":
 *                   type: string
 *                 "@type":
 *                   type: string
 *                 "@context":
 *                   type: object
 *       400:
 *         description: Bad request - Invalid ID
 *       500:
 *         description: Internal server error
 */
collectionRouter.get("/", async (req: Request, res: Response) => {
  const { id } = req.query;

  let data: any;
  try {
    data = await fetchInfoJson();
  } catch (error) {
    respondUpstreamError(res, error);
    return;
  }

  try {
    const members: any = [];

    for (const selection of data.selections ?? []) {
      for (const item of selection.members ?? []) {
        const vol = extractVol(item);
        if (!vol) continue; // vol メタデータが無い member はスキップ

        const memberId = `${COLLECTION_ID}.${vol}`;

        members.push({
          totalItems: 0,
          "dts:citeStructure": {
            "dts:citeType": "line",
          },
          "dts:extensions": {
            "cts:label": [
              {
                "@value": item.label,
                "@language": "jpn",
              },
            ],
            "ns2:language": "jpn",
            "ns1:prefLabel": [
              {
                "@value": item.label,
                "@language": "jpn",
              },
            ],
            "cts:description": [
              {
                "@value": item.label,
                "@language": "jpn",
              },
            ],
          },
          "dts:passage": `/api/v1/dts/document?id=${memberId}`,
          title: item.label,
          "@id": memberId,
          "@type": "Resource",
          "dts:references": `/api/v1/dts/navigation?id=${memberId}`,
          "dts:citeDepth": 1,
        });
      }
    }

    if (id === COLLECTION_ID) {
      res.json({
        totalItems: data.length,
        member: members,
        title: COLLECTION_TITLE,
        "@id": COLLECTION_ID,
        "@type": "Collection",
        "@context": {
          dts: "https://w3id.org/dts/api#",
          "@vocab": "https://www.w3.org/ns/hydra/core#",
        },
      });
    } else if (!id) {
      res.json({
        totalItems: 1,
        member: [
          {
            "@id": COLLECTION_ID,
            "@type": "Collection",
            totalItems: members.length,
            title: COLLECTION_TITLE,
            collection: `/api/v1/dts/collections?id=${COLLECTION_ID}{&ref}`,
          },
        ],
        title: "None",

        "@id": "default",
        "@type": "Collection",
        "@context": {
          dts: "https://w3id.org/dts/api#",
          "@vocab": "https://www.w3.org/ns/hydra/core#",
        },
      });
    } else {
      res.status(400).json({ error: "Invalid ID" }); // 400エラーを返す
    }
  } catch (error) {
    respondUpstreamError(res, error);
  }
});
