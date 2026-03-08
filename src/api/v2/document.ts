import { Router, Request, Response } from "express";
import { getDocument } from "../../utils/xmlParser"; // ユーティリティ関数として外部ファイルに分離

import { XMLSerializer, Document as XMLDocument, Element as XMLElement, Node as XMLNode } from "@xmldom/xmldom";
import xmlFormatter from 'xml-formatter';

export const documentRouter = Router();

/**
 * @swagger
 * /api/v2/dts/document:
 *   get:
 *     summary: Get document content (v2)
 *     description: Retrieve XML document content with enhanced formatting and filtering
 *     tags:
 *       - Document v2
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
 *         description: Single citation node. Cannot be used with start/end.
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
 *         name: tree
 *         required: false
 *         schema:
 *           type: string
 *         description: Citation tree identifier
 *       - in: query
 *         name: mediaType
 *         required: false
 *         schema:
 *           type: string
 *         description: Requested media type for the response
 *     responses:
 *       200:
 *         description: Formatted XML document content
 *         content:
 *           application/tei+xml:
 *             schema:
 *               type: string
 *       400:
 *         description: Bad request - resource is required
 *       404:
 *         description: Not found - reference not found
 *       500:
 *         description: Internal server error
 */
documentRouter.get("/", async (req: Request, res: Response) => {
  const { ref, resource, start, end, tree, mediaType } = req.query;

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

  // Validate tree parameter
  const treeString = tree as string | undefined;
  if (treeString && treeString !== "waka") {
    res.status(404).json({ error: "Citation tree not found" });
    return;
  }

  // Determine Content-Type based on mediaType parameter
  const allowedMediaTypes = ["application/tei+xml", "application/xml", "text/xml"];
  const requestedMediaType = mediaType as string | undefined;
  let contentType = "application/tei+xml"; // DTS 1.0 default
  if (requestedMediaType) {
    if (allowedMediaTypes.includes(requestedMediaType)) {
      contentType = requestedMediaType;
    } else {
      res.status(406).json({ error: `Unsupported mediaType. Supported: ${allowedMediaTypes.join(", ")}` });
      return;
    }
  }

  // DTS 1.0: Link header with rel="collection"
  res.set("Link", `</api/v2/dts/collection?id=${resource}>; rel="collection"`);

  const xmlDoc = await getDocument(resource as string);

  if (!xmlDoc) {
    res.status(500).json({ error: "Failed to load or parse XML" });
    return;
  }

  if (!ref) {
    // return xml
    res.set("Content-Type", contentType);
    const serializer = new XMLSerializer();
    const xmlString = serializer.serializeToString(xmlDoc);
    res.send(xmlString);
    return;
  }

  const refString = ref as string;

  const teiCloned = xmlDoc.cloneNode(true) as XMLDocument;
  const body = teiCloned.getElementsByTagName("body")[0];

  // delete p
  const ps = body.getElementsByTagName("p");
  for (const p of Array.from(ps)) {
    body.removeChild(p);
  }

  // 名前空間の設定
  const dtsNamespace = 'https://w3id.org/api/dts#';
  if (teiCloned.documentElement) {
    teiCloned.documentElement.setAttribute('xmlns:dts', dtsNamespace);
  }

  const wrapper = teiCloned.createElementNS(dtsNamespace, 'dts:wrapper');
  body.appendChild(wrapper);

  if (treeString === "waka") {
    // 和歌の取得
    if (refString.includes(".")) {
      // 句の取得: waka-001.3 → waka-001 の l[n="3"]
      const [wakaId, kuN] = refString.split(".");
      const lgs = Array.from(xmlDoc.getElementsByTagName("lg"));
      let found = false;

      for (const lg of lgs as XMLElement[]) {
        if (lg.getAttribute("xml:id") === wakaId) {
          const lines = Array.from(lg.getElementsByTagName("l"));
          for (const l of lines as XMLElement[]) {
            if (l.getAttribute("n") === kuN) {
              wrapper.appendChild(l.cloneNode(true) as XMLNode);
              found = true;
              break;
            }
          }
          break;
        }
      }

      if (!found) {
        res.status(404).json({ error: "Not Found" });
        return;
      }
    } else {
      // 歌全体の取得: waka-001
      const lgs = Array.from(xmlDoc.getElementsByTagName("lg"));
      let found = false;

      for (const lg of lgs as XMLElement[]) {
        if (lg.getAttribute("xml:id") === refString) {
          wrapper.appendChild(lg.cloneNode(true) as XMLNode);
          found = true;
          break;
        }
      }

      if (!found) {
        res.status(404).json({ error: "Not Found" });
        return;
      }
    }
  } else if (refString.includes("http")) {
    // lineの場合
    const segs = xmlDoc.getElementsByTagName("seg");
    let foundSeg = null;

    for (const seg of Array.from(segs) as XMLElement[]) {
      const corresp = seg.getAttribute("corresp");
      if (corresp === refString) {
        foundSeg = seg;
        break;
      }
    }

    if (!foundSeg) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    wrapper.appendChild(foundSeg as XMLNode);
  } else {
    // pageの場合
    const p = xmlDoc.getElementsByTagName("body")[0].getElementsByTagName("p");
    const children = Array.from(p[0].childNodes) as XMLNode[];
    let flg = false;
    const newP = xmlDoc.createElement("p");

    for (const child of children) {
      if (child.nodeName === "pb") {
        if ((child as XMLElement).getAttribute("n") === refString) {
          flg = true;
        } else {
          flg = false;
        }
      }

      if (flg) {
        newP.appendChild(child as XMLNode);
      }
    }

    wrapper.appendChild(newP);
  }

  const serializer = new XMLSerializer();
  const xmlString = serializer.serializeToString(teiCloned);

  const formattedXml = xmlFormatter(xmlString, {
    indentation: '  ',
    collapseContent: true,
    lineSeparator: '\n'
  });

  res.set("Content-Type", contentType);
  res.send(formattedXml);
});
