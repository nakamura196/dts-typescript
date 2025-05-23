import { Router, Request, Response } from "express";
import { getDocument } from "../../utils/xmlParser"; // ユーティリティ関数として外部ファイルに分離

export const navigationRouter = Router();

navigationRouter.get("/", async (req: Request, res: Response) => {
  let { ref, resource, down } = req.query;

  if(down === undefined) {
    down = "1";
  }

  if (!resource) {
    res.status(400).json({ error: "resource is required" });
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

  const xmlDoc = await getDocument(resource as string);

  if (!xmlDoc) {
    res.status(500).json({ error: "Failed to load or parse XML" });
    return;
  }

  const segs = Array.from(xmlDoc.getElementsByTagName("seg"));

  const mappings: { [key: number]: string[] } = {};

  for (const seg of segs) {
    const corresp = seg.getAttribute("corresp");

    if (corresp === null) {
      continue;
    }

    const n = Number(corresp.split("/").pop()?.split("-")[0]);

    if (!mappings[n]) {
      mappings[n] = [];
    }

    mappings[n].push(corresp);
  }

  const membersMap: { [key: string]: any[] } = {
    "all": []
  }

  for (const n in mappings) {
    const corresps = mappings[n];

    if(!membersMap[n]) {
      membersMap[n] = [];
    }

    const item = {
      identifier: String(n),
      "@type": "CitableUnit",
      level: 1,
      parent: null,
      citeType: "page",
    }

    membersMap[n].push(item);

    membersMap["all"].push(item)

    for (const corresp of corresps) {
      const item = {
        identifier: corresp,
        "@type": "CitableUnit",
        level: 2,
        parent: String(n),
        citeType: "line",
      }
      membersMap[n].push(item);
      membersMap["all"].push(item);

      membersMap[corresp] = [item];
      
    }
  }

  const members: any[] = []

  let refString = ""
  if(ref) {
    refString = ref as string;
  }

  if(!ref) {
    if(down === "1") {
      for(const member of membersMap["all"]) {
        if(member.level === 1) {
          members.push(member);
        }
      }
    } else {
      for(const member of membersMap["all"]) {
          members.push(member);
      }
    }
  } else {
    const targetMembers = membersMap[refString];

    if(!targetMembers) {
      res.status(404).json({ error: "Ref not found" });
      return;
    }

    // line
    if(refString.includes("http")) {
      for(const targetMember of targetMembers) {
        members.push(targetMember);
      }
    } else {
      for(const targetMember of targetMembers) {
        members.push(targetMember);
      }
    }
  }

  // パースされたデータを処理（例: ナビゲーションデータを作成）
  const navigationData: any = {
    "@context":
      "https://distributed-text-services.github.io/specifications/context/1-alpha1.json",
    dtsVersion: "1-alpha",
    "@type": "Navigation",
    "@id":
      `/api/v2/dts/navigation?resource=${resource}&down=${down}`,
    resource: {
      "@id": resource,
      "@type": "Resource",
      document:
        `/api/v2/dts/document?resource=${resource}{&ref}`,
      collection:
        `/api/v2/dts/collection?id=${resource}`,
      navigation:
        `/api/v2/dts/navigation?resource=${resource}{&ref}`,
      citationTrees: [
        {
          "@type": "CitationTree",
          citeStructure: [
            {
              "@type": "CiteStructure",
              citeType: "page",
              citeStructure: [
                {
                  "@type": "CiteStructure",
                  citeType: "line",
                },
              ],
            },
          ],
        },
      ],
    },
    member: members,
  };

  if(ref) {
    navigationData["ref"] = {
      "@id": refString,
      "@type": "CitableUnit",
      "level": refString.includes("http") ? 2 : 1,
      "parent": refString.includes("http") ? String(Number(refString.split("/").pop()?.split("-")[0])) : null,
      "citeType": refString.includes("http") ? "line" : "page"
    }
  }

  // ナビゲーション情報を返す
  res.json(navigationData);
});
