import { Router, Request, Response } from "express";
import { getDocument } from "../../utils/xmlParser"; // ユーティリティ関数として外部ファイルに分離

export const navigationRouter = Router();

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
    .map((seg) => {
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
