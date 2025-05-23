import { Router, Request, Response } from "express";
import { getDocument } from "../../utils/xmlParser"; // ユーティリティ関数として外部ファイルに分離

import { DOMParser, XMLSerializer } from "xmldom";

export const documentRouter = Router();

const createNewDocument = (foundSeg: ParentNode | null) => {
  const parser = new DOMParser();

  // 新しいツリーを構築: 最上位から親要素を辿り、seg要素のみを含むツリーを作成
  const newDoc = parser.parseFromString(
    `<TEI xmlns="http://www.tei-c.org/ns/1.0"><dts:fragment xmlns:dts="https://w3id.org/dts/api#"></TEI>`,
    "application/xml"
  ); // 新しいXMLドキュメントを作成
  let currentNode = newDoc.getElementsByTagName("dts:fragment")[0]; // 新しいドキュメントのルート要素

  const elementStack: any[] = []; // 親要素を一時的に格納するスタック

  // seg要素の親を辿り、すべての親要素をスタックに追加
  let parent: ParentNode | null = foundSeg;
  while (parent && parent.nodeType === 1) {
    // parentがElement（nodeType 1）の場合のみ処理
    elementStack.push(parent);

    // 親が 'text' 要素の場合、ループを終了
    if (parent.nodeName === "text") {
      break;
    }

    parent = parent.parentNode;
  }

  // スタックに積んだ親要素を逆順にたどり、新しいツリーに再構築
  while (elementStack.length > 0) {
    const element = elementStack.pop();
    if (!element) continue; // elementがundefinedになる可能性に対応

    const newElement = newDoc.createElement(element.nodeName); // 新しい要素を作成

    // 属性もコピー
    if (element.attributes) {
      for (let j = 0; j < element.attributes.length; j++) {
        const attr = element.attributes[j];
        newElement.setAttribute(attr.name, attr.value);
      }
    }

    // テキストノードをコピー
    if (element.childNodes) {
      for (let k = 0; k < element.childNodes.length; k++) {
        const child = element.childNodes[k];
        if (child.nodeType === 3) {
          // テキストノード（nodeType 3）
          const textNode = newDoc.createTextNode(child.nodeValue || "");
          newElement.appendChild(textNode);
        }
      }
    }

    // 子要素を追加
    currentNode.appendChild(newElement);
    currentNode = newElement;
  }

  return newDoc;
};

documentRouter.get("/", async (req: Request, res: Response) => {
  const { ref, id } = req.query;

  if (!id) {
    res.status(400).json({ error: "id is required" });
    return;
  }

  const xmlDoc = await getDocument(id as string);

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
    const segs = xmlDoc.getElementsByTagName("seg");
    let foundSeg = null;

    // 'corresp' 属性をチェックして、該当するものを探す
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      const corresp = seg.getAttribute("corresp");

      if (corresp === ref) {
        foundSeg = seg;
        break;
      }
    }

    // segが見つからない場合
    if (!foundSeg) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    const newDoc = createNewDocument(foundSeg);

    // 新しいツリーをシリアライズ
    const serializer = new XMLSerializer();
    const xmlString = serializer.serializeToString(newDoc);

    res.set("Content-Type", "application/xml");
    res.send(xmlString);
  }
});
