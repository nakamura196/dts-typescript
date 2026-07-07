import { Router, Request, Response } from "express";

import { citationTrees } from "../../utils/citationTrees";
import {
  extractVol,
  fetchInfoJson,
  respondUpstreamError,
} from "../../utils/dataSource";

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
/** info.json の member 1件を DTS v2 の Resource オブジェクトに変換する。 */
function buildResource(memberId: string, label: string) {
  return {
    "@id": memberId,
    title: label,
    description: `校異源氏物語 ${label}`,
    "@type": "Resource",
    dublinCore: {
      creator: [COLLECTION_CREATOR],
      title: [{ lang: "ja", value: label }],
      description: [{ lang: "ja", value: `校異源氏物語 ${label}` }],
      license: [COLLECTION_LICENSE],
    },
    totalParents: 1,
    totalChildren: 0,
    collection: `/api/v2/dts/collection?id=${memberId}{&page,nav}`,
    document: `/api/v2/dts/document?resource=${memberId}{&ref,start,end,tree,mediaType}`,
    navigation: `/api/v2/dts/navigation?resource=${memberId}{&ref,start,end,down,tree,page}`,
    citationTrees,
  };
}

collectionRouter.get("/", async (req: Request, res: Response) => {
  const { id } = req.query;

  res.set("Content-Type", "application/ld+json");

  let data: any;
  try {
    data = await fetchInfoJson();
  } catch (error) {
    respondUpstreamError(res, error);
    return;
  }

  const members = [];
  for (const selection of data.selections ?? []) {
    for (const item of selection.members ?? []) {
      const vol = extractVol(item);
      if (!vol) continue; // vol メタデータが無い member はスキップ
      members.push(buildResource(`${COLLECTION_ID}.${vol}`, item.label));
    }
  }

  // id 指定なし: ルートコレクションを返す
  if (!id) {
    res.json({
      "@context": "https://dtsapi.org/context/v1.0.json",
      dtsVersion: "1.0",
      "@id": "default",
      "@type": "Collection",
      collection: "/api/v2/dts/collection{?id,page,nav}",
      title: COLLECTION_TITLE,
      description: COLLECTION_DESCRIPTION,
      dublinCore: {
        creator: [COLLECTION_CREATOR],
        title: [{ lang: "ja", value: COLLECTION_TITLE }],
        description: [{ lang: "ja", value: COLLECTION_DESCRIPTION }],
        license: [COLLECTION_LICENSE],
      },
      totalParents: 0,
      totalChildren: members.length,
      member: members,
    });
    return;
  }

  // id 指定あり: 該当リソースを返す
  const resource = members.find((m) => m["@id"] === id);
  if (!resource) {
    res.status(404).json({
      error: "ResourceNotFound",
      message: `指定された id のリソースが見つかりません: ${id}`,
    });
    return;
  }

  res.json({
    "@context": "https://dtsapi.org/context/v1.0.json",
    dtsVersion: "1.0",
    ...resource,
  });
});