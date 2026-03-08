import { Router, Request, Response } from "express";
import { getDocument } from "../../utils/xmlParser";
import { Element as XMLElement, Document as XMLDocument } from "@xmldom/xmldom";
import { citationTrees } from "../../utils/citationTrees";

export const navigationRouter = Router();

/**
 * @swagger
 * /api/v2/dts/navigation:
 *   get:
 *     summary: Get navigation data (v2)
 *     description: Retrieve enhanced navigation structure with hierarchical citation support. Supports tree=waka for waka (tanka) navigation.
 *     tags:
 *       - Navigation v2
 *     parameters:
 *       - in: query
 *         name: resource
 *         required: true
 *         schema:
 *           type: string
 *         description: Resource identifier (URI)
 *       - in: query
 *         name: ref
 *         required: false
 *         schema:
 *           type: string
 *         description: Single citation tree node identifier. Cannot be used with start/end.
 *       - in: query
 *         name: start
 *         required: false
 *         schema:
 *           type: string
 *         description: Start of a range (requires end). Cannot be used with ref.
 *       - in: query
 *         name: end
 *         required: false
 *         schema:
 *           type: string
 *         description: End of a range (requires start). Cannot be used with ref.
 *       - in: query
 *         name: down
 *         required: false
 *         schema:
 *           type: integer
 *         description: "Maximum depth of subtree to return. -1 for full depth. If absent with ref, only ref info is returned."
 *       - in: query
 *         name: tree
 *         required: false
 *         schema:
 *           type: string
 *           enum: [waka]
 *         description: "Citation tree identifier. Use 'waka' for waka (tanka) navigation."
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *         description: Page number for paginated results
 *     responses:
 *       200:
 *         description: Navigation data with citation trees (DTS 1.0)
 *         content:
 *           application/ld+json:
 *             schema:
 *               type: object
 *               properties:
 *                 "@context":
 *                   type: string
 *                 dtsVersion:
 *                   type: string
 *                 "@type":
 *                   type: string
 *                 "@id":
 *                   type: string
 *                 resource:
 *                   type: object
 *                 member:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       identifier:
 *                         type: string
 *                       "@type":
 *                         type: string
 *                       level:
 *                         type: number
 *                       parent:
 *                         type: string
 *                       citeType:
 *                         type: string
 *       400:
 *         description: Bad request - resource is required
 *       404:
 *         description: Not found - reference not found
 *       500:
 *         description: Internal server error
 */
navigationRouter.get("/", async (req: Request, res: Response) => {
  let { ref, resource, down, start, end, tree } = req.query;

  res.set("Content-Type", "application/ld+json");

  if (!resource) {
    res.status(400).json({ error: "resource is required" });
    return;
  }

  // ref and start/end are mutually exclusive
  if (ref && (start || end)) {
    res.status(400).json({ error: "ref cannot be used with start/end" });
    return;
  }

  // start and end must be used together
  if ((start && !end) || (end && !start)) {
    res.status(400).json({ error: "start and end must be used together" });
    return;
  }

  // If no down, ref, start/end → 400 per DTS 1.0 spec
  if (down === undefined && !ref && !start && !end) {
    res.status(400).json({ error: "down, ref, or start/end is required" });
    return;
  }

  // Validate tree parameter
  const treeString = tree as string | undefined;
  if (treeString && treeString !== "waka") {
    res.status(404).json({ error: "Citation tree not found" });
    return;
  }

  const xmlDoc = await getDocument(resource as string);

  if (!xmlDoc) {
    res.status(500).json({ error: "Failed to load or parse XML" });
    return;
  }

  const refString = ref ? (ref as string) : "";
  const downInt = down !== undefined ? parseInt(down as string, 10) : undefined;

  // tree=waka の場合は和歌ナビゲーション
  const membersMap: { [key: string]: any[] } = { "all": [] };

  if (treeString === "waka") {
    buildWakaMembersMap(xmlDoc, membersMap);
  } else {
    buildDefaultMembersMap(xmlDoc, membersMap);
  }

  const members: any[] = [];

  if (!ref) {
    if (downInt !== undefined && downInt > 0) {
      if (downInt === 1) {
        for (const member of membersMap["all"]) {
          if (member.level === 1) {
            members.push(member);
          }
        }
      } else {
        for (const member of membersMap["all"]) {
          members.push(member);
        }
      }
    } else if (downInt === -1) {
      for (const member of membersMap["all"]) {
        members.push(member);
      }
    }
  } else {
    // If down is absent with ref present, no member array (just ref info)
    if (downInt !== undefined) {
      const targetMembers = membersMap[refString];

      if (!targetMembers) {
        res.status(404).json({ error: "Ref not found" });
        return;
      }

      if (downInt === 0) {
        const current = targetMembers[0];
        if (current) {
          for (const member of membersMap["all"]) {
            if (member.parent === current.parent && member.level === current.level) {
              members.push(member);
            }
          }
        }
      } else {
        for (const targetMember of targetMembers) {
          members.push(targetMember);
        }
      }
    }
  }

  // Build query string for @id
  const queryParts = [`resource=${resource}`];
  if (ref) queryParts.push(`ref=${ref}`);
  if (down !== undefined) queryParts.push(`down=${down}`);
  if (treeString) queryParts.push(`tree=${treeString}`);

  const navigationData: any = {
    "@context": "https://dtsapi.org/context/v1.0.json",
    dtsVersion: "1.0",
    "@type": "Navigation",
    "@id": `/api/v2/dts/navigation?${queryParts.join("&")}`,
    resource: {
      "@id": resource,
      "@type": "Resource",
      document: `/api/v2/dts/document?resource=${resource}{&ref,start,end,tree,mediaType}`,
      collection: `/api/v2/dts/collection?id=${resource}{&page,nav}`,
      navigation: `/api/v2/dts/navigation?resource=${resource}{&ref,start,end,down,tree,page}`,
      citationTrees,
    },
  };

  // Only include member if down is specified
  if (down !== undefined) {
    navigationData.member = members;
  }

  if (ref) {
    if (treeString === "waka") {
      const isKu = refString.includes(".");
      navigationData["ref"] = {
        identifier: refString,
        "@type": "CitableUnit",
        level: isKu ? 2 : 1,
        parent: isKu ? refString.split(".")[0] : null,
        citeType: isKu ? "ku" : "waka",
      };
    } else {
      navigationData["ref"] = {
        identifier: refString,
        "@type": "CitableUnit",
        level: refString.includes("http") ? 2 : 1,
        parent: refString.includes("http")
          ? String(Number(refString.split("/").pop()?.split("-")[0]))
          : null,
        citeType: refString.includes("http") ? "line" : "page",
      };
    }
  }

  res.json(navigationData);
});

/**
 * デフォルト Citation Tree: ページ → 行
 */
function buildDefaultMembersMap(
  xmlDoc: XMLDocument,
  membersMap: { [key: string]: any[] }
) {
  const segs = Array.from(xmlDoc.getElementsByTagName("seg"));
  const mappings: { [key: number]: string[] } = {};

  for (const seg of segs as XMLElement[]) {
    const corresp = seg.getAttribute("corresp");
    if (corresp === null) continue;

    const n = Number(corresp.split("/").pop()?.split("-")[0]);
    if (!mappings[n]) mappings[n] = [];
    mappings[n].push(corresp);
  }

  for (const n in mappings) {
    const corresps = mappings[n];

    if (!membersMap[n]) membersMap[n] = [];

    const pageItem = {
      identifier: String(n),
      "@type": "CitableUnit",
      level: 1,
      parent: null,
      citeType: "page",
    };

    membersMap[n].push(pageItem);
    membersMap["all"].push(pageItem);

    for (const corresp of corresps) {
      const lineItem = {
        identifier: corresp,
        "@type": "CitableUnit",
        level: 2,
        parent: String(n),
        citeType: "line",
      };
      membersMap[n].push(lineItem);
      membersMap["all"].push(lineItem);
      membersMap[corresp] = [lineItem];
    }
  }
}

/**
 * 和歌 Citation Tree: waka → ku
 * <lg xml:id="waka-001" type="waka"> の中の <l n="1">〜<l n="5"> を抽出
 */
function buildWakaMembersMap(
  xmlDoc: XMLDocument,
  membersMap: { [key: string]: any[] }
) {
  const lgs = Array.from(xmlDoc.getElementsByTagName("lg"));

  for (const lg of lgs as XMLElement[]) {
    if (lg.getAttribute("type") !== "waka") continue;

    const wakaId = lg.getAttribute("xml:id");
    if (!wakaId) continue;

    const wakaItem = {
      identifier: wakaId,
      "@type": "CitableUnit",
      level: 1,
      parent: null,
      citeType: "waka",
    };

    if (!membersMap[wakaId]) membersMap[wakaId] = [];
    membersMap[wakaId].push(wakaItem);
    membersMap["all"].push(wakaItem);

    const lines = Array.from(lg.getElementsByTagName("l"));
    for (const l of lines as XMLElement[]) {
      const n = l.getAttribute("n");
      if (!n) continue;

      const kuId = `${wakaId}.${n}`;
      const kuItem = {
        identifier: kuId,
        "@type": "CitableUnit",
        level: 2,
        parent: wakaId,
        citeType: "ku",
      };

      membersMap[wakaId].push(kuItem);
      membersMap["all"].push(kuItem);
      membersMap[kuId] = [kuItem];
    }
  }
}
