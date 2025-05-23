import { Router, Request, Response } from "express";

import axios from "axios";

const COLLECTION_TITLE = "校異源氏物語";
const COLLECTION_ID = "urn:kouigenjimonogatari";

export const collectionRouter = Router();

collectionRouter.get("/", async (req: Request, res: Response) => {
  const url = "https://genji.dl.itc.u-tokyo.ac.jp/data/info.json";

  const { id } = req.query;

  try {
    const response = await axios.get(url);
    const data = response.data;

    const members: any = [];

    for (const selection of data.selections) {
      for (const item of selection.members) {
        const vol = item.metadata.find((m: any) => m.label === "vol").value;

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
    res.status(500).json({ error: "Failed to fetch data" });
  }
});
