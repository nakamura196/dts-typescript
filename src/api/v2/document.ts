import { Router, Request, Response } from "express";
import { getDocument } from "../../utils/xmlParser"; // ユーティリティ関数として外部ファイルに分離

import { XMLSerializer } from "xmldom";
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
 *         description: Resource identifier
 *       - in: query
 *         name: ref
 *         required: false
 *         schema:
 *           type: string
 *         description: Reference to specific segment or page
 *     responses:
 *       200:
 *         description: Formatted XML document content
 *         content:
 *           application/xml:
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
  const { ref, resource } = req.query;

  if (!resource) {
    res.status(400).json({ error: "resource is required" });
    return;
  }

  const xmlDoc = await getDocument(resource as string);

  if (!xmlDoc) {
    res.status(500).json({ error: "Failed to load or parse XML" });
    return;
  }

  if (!ref) {
    // return xml
    res.set("Content-Type", "application/xml");

    const serializer = new XMLSerializer();

    const xmlString = serializer.serializeToString(xmlDoc);

    res.send(xmlString);
  } else {

    const refString = ref as string;

    const teiCloned = xmlDoc.cloneNode(true) as Document;

    const body = teiCloned.getElementsByTagName("body")[0];

    // delte p
    const ps = body.getElementsByTagName("p");
    for(const p of Array.from(ps)) {
      body.removeChild(p);
    }

    // 名前空間の設定
    const dtsNamespace = 'https://w3id.org/api/dts#';
    if (teiCloned.documentElement) {
      teiCloned.documentElement.setAttribute('xmlns:dts', dtsNamespace);
    }
    
    const wrapper = teiCloned.createElementNS(dtsNamespace, 'dts:wrapper');
    body.appendChild(wrapper);

    // lineの場合
    if(refString.includes("http")) {
      const segs = xmlDoc.getElementsByTagName("seg");
      let foundSeg = null;

      for(const seg of Array.from(segs)) {
        const corresp = seg.getAttribute("corresp");

        if(corresp === refString) {
          foundSeg = seg;
          break;
        }
      }

      if(!foundSeg) {
        res.status(404).json({ error: "Not Found" });
        return;
      }

      wrapper.appendChild(foundSeg);

      const serializer = new XMLSerializer();
      const xmlString = serializer.serializeToString(teiCloned);
      
      // xml-formatterを使用して整形
      const formattedXml = xmlFormatter(xmlString, {
        indentation: '  ',
        collapseContent: true,
        lineSeparator: '\n'
      });

      res.set("Content-Type", "application/xml");
      res.send(formattedXml);
      
    } else {
      // pageの場合
      const p = xmlDoc.getElementsByTagName("body")[0].getElementsByTagName("p");

      const children = Array.from(p[0].childNodes) as ChildNode[];

      let flg = false;

      const newP = xmlDoc.createElement("p");

      for(const child of children) {
        if(child.nodeName === "pb") {
          if((child as Element).getAttribute("n") === refString) {
            flg = true;
          } else {
            // newP.appendChild(child);
            flg = false
          }
        }

        if(flg) {
          newP.appendChild(child);
        }
      }

      wrapper.appendChild(newP); 

      const serializer = new XMLSerializer();
      const xmlString = serializer.serializeToString(teiCloned);
      
      // xml-formatterを使用して整形
      const formattedXml = xmlFormatter(xmlString, {
        indentation: '  ',
        collapseContent: true,
        lineSeparator: '\n'
      });

      res.set("Content-Type", "application/xml");
      res.send(formattedXml);
    }

    res.status(400).json({ error: "Not Found" });
    return;
  }
});
