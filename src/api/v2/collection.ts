import { Router, Request, Response } from "express";

import axios from "axios";

const COLLECTION_TITLE = "校異源氏物語テキストDB";
const COLLECTION_ID = "urn:kouigenjimonogatari";

export const collectionRouter = Router();

collectionRouter.get("/", async (req: Request, res: Response) => {
  const url = "https://genji.dl.itc.u-tokyo.ac.jp/data/info.json";

  const { id } = req.query;

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
            title: item.label, // "001",
            "@type": "Resource",

            totalParents: 1,
            totalChildren: 0,
            collection: `/api/v2/dts/collection?id=${memberId}`,
            document: `/api/v2/dts/document?resource=${memberId}{&ref}`,
            navigation: `/api/v2/dts/navigation?resource=${memberId}{&ref,down}`,
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
          });
        }
      }

      res.json({
        "@context":
          "https://distributed-text-services.github.io/specifications/context/1-alpha1.json",
        dtsVersion: "1-alpha",
        "@id": "default",
        "@type": "Collection",
        collection: "/api/v2/dts/collection{?id}",
        title: COLLECTION_TITLE,
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

      const memberId = `${COLLECTION_ID}.${id}`;

      for (const selection of data.selections) {
        for (const item of selection.members) {

          const vol = item.metadata.find((m: any) => m.label === "vol").value;

          const memberId = `${COLLECTION_ID}.${vol}`;

          if (memberId === id) {
            res.json({
              "@context": "https://distributed-text-services.github.io/specifications/context/1-alpha1.json",
              "dtsVersion": "1-alpha",
              "@id": memberId,
              "@type" : "Resource",
              "title" : item.label,
              // "description": item.description,
              "totalParents": 1,
              "totalChildren": 0,
              collection: `/api/v2/dts/collection?id=${memberId}`,
              document: `/api/v2/dts/document?resource=${memberId}{&ref}`,
              navigation: `/api/v2/dts/navigation?resource=${memberId}{&ref,down}`,
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
            });
          }
        }
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch data" });
    }
  }
  
});