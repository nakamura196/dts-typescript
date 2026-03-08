import { Router, Request, Response } from "express";

import axios from "axios";
import { citationTrees } from "../../utils/citationTrees";

const COLLECTION_TITLE = "校異源氏物語テキストDB";
const COLLECTION_DESCRIPTION = "『校異源氏物語』のテキストデータを公開するデータベース";
const COLLECTION_CREATOR = "裏源氏勉強会";
const COLLECTION_LICENSE = "https://creativecommons.org/publicdomain/zero/1.0/";
const COLLECTION_ID = "urn:kouigenjimonogatari";

export const collectionRouter = Router();

/**
 * @swagger
 * /api/v2/dts/collection:
 *   get:
 *     summary: Get collections (v2)
 *     description: 校異源氏物語テキストDBのコレクション情報を取得します。DTS v2フォーマットでの拡張されたコレクション情報とDublin Coreメタデータを提供します。
 *     tags:
 *       - Collections v2
 *     parameters:
 *       - in: query
 *         name: id
 *         required: false
 *         schema:
 *           type: string
 *         description: Collection or Resource identifier (URI)
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *         description: Page number for paginated results
 *       - in: query
 *         name: nav
 *         required: false
 *         schema:
 *           type: string
 *           enum: [children, parents]
 *           default: children
 *         description: "Navigate to children (default) or parents"
 *     responses:
 *       200:
 *         description: Enhanced collection data with DTS v2 format
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
 *                 "@type":
 *                   type: string
 *                 collection:
 *                   type: string
 *                 title:
 *                   type: string
 *                 totalParents:
 *                   type: number
 *                 totalChildren:
 *                   type: number
 *                 member:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       "@id":
 *                         type: string
 *                       title:
 *                         type: string
 *                       "@type":
 *                         type: string
 *                       totalParents:
 *                         type: number
 *                       totalChildren:
 *                         type: number
 *                       collection:
 *                         type: string
 *                       document:
 *                         type: string
 *                       navigation:
 *                         type: string
 *                       citationTrees:
 *                         type: array
 *                         items:
 *                           type: object
 *       500:
 *         description: Internal server error
 */
collectionRouter.get("/", async (req: Request, res: Response) => {
  const url = "https://genji.dl.itc.u-tokyo.ac.jp/data/info.json";

  const { id } = req.query;

  res.set("Content-Type", "application/ld+json");

  if (!id) {
    try {
      const response = await axios.get(url);
      const data = response.data;

      const members: any = [];

      for (const selection of data.selections) {
        for (const item of selection.members) {
          const vol = item.metadata.find((m: any) => m.label === "vol").value;

          const memberId = `${COLLECTION_ID}.${vol}`;

          members.push({
            "@id": memberId,
            title: item.label,
            description: `校異源氏物語 ${item.label}`,
            "@type": "Resource",
            dublinCore: {
              "creator": [
                COLLECTION_CREATOR
              ],
              "title": [
                {"lang": "ja", "value": item.label}
              ],
              "description": [
                {
                  "lang": "ja",
                  "value": `校異源氏物語 ${item.label}`
                }
              ],
              "license": [
                COLLECTION_LICENSE
              ]
            },

            totalParents: 1,
            totalChildren: 0,
            collection: `/api/v2/dts/collection?id=${memberId}{&page,nav}`,
            document: `/api/v2/dts/document?resource=${memberId}{&ref,start,end,tree,mediaType}`,
            navigation: `/api/v2/dts/navigation?resource=${memberId}{&ref,start,end,down,tree,page}`,
            citationTrees,
          });
        }
      }

      res.json({
        "@context":
          "https://dtsapi.org/context/v1.0.json",
        dtsVersion: "1.0",
        "@id": "default",
        "@type": "Collection",
        collection: "/api/v2/dts/collection{?id,page,nav}",
        title: COLLECTION_TITLE,
        description: COLLECTION_DESCRIPTION,
        dublinCore: {
          "creator": [
            COLLECTION_CREATOR
          ],
          "title": [
            {"lang": "ja", "value": COLLECTION_TITLE}
          ],
          "description": [
            {
              "lang": "ja",
              "value": COLLECTION_DESCRIPTION
            }
          ],
          "license": [
            COLLECTION_LICENSE
          ]
        },
        totalParents: 0,
        totalChildren: members.length,
        member: members,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch data" });
    }
  } else {
    try {
      const response = await axios.get(url);
      const data = response.data;

      for (const selection of data.selections) {
        for (const item of selection.members) {
          const vol = item.metadata.find((m: any) => m.label === "vol").value;
          const memberId = `${COLLECTION_ID}.${vol}`;

          if (memberId === id) {
            res.json({
              "@context": "https://dtsapi.org/context/v1.0.json",
              "dtsVersion": "1.0",
              "@id": memberId,
              "@type" : "Resource",
              "title" : item.label,
              "description": `校異源氏物語 ${item.label}`,
              "dublinCore": {
                "creator": [
                  COLLECTION_CREATOR
                ],
                "title": [
                  {"lang": "ja", "value": item.label}
                ],
                "description": [
                  {
                    "lang": "ja",
                    "value": `校異源氏物語 ${item.label}`
                  }
                ],
                "license": [
                  COLLECTION_LICENSE
                ]
              },
              "totalParents": 1,
              "totalChildren": 0,
              collection: `/api/v2/dts/collection?id=${memberId}{&page,nav}`,
              document: `/api/v2/dts/document?resource=${memberId}{&ref,start,end,tree,mediaType}`,
              navigation: `/api/v2/dts/navigation?resource=${memberId}{&ref,start,end,down,tree,page}`,
              citationTrees,
            });
            return;
          }
        }
      }

      // リソースが見つからない場合
      res.status(404).json({ error: "Resource not found" });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch data" });
    }
  }
  
});