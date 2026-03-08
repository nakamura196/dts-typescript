/**
 * DTS Citation Trees 定義
 * 校異源氏物語のリソースが持つ2つの引用構造を定義する
 */

/** デフォルトの Citation Tree: ページ → 行 */
const defaultCitationTree = {
  "@type": "CitationTree",
  description: "ページ・行による引用構造",
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
};

/** 和歌の Citation Tree: 歌 → 句 */
const wakaCitationTree = {
  "@type": "CitationTree",
  identifier: "waka",
  description: "和歌（短歌）による引用構造",
  citeStructure: [
    {
      "@type": "CiteStructure",
      citeType: "waka",
      citeStructure: [
        {
          "@type": "CiteStructure",
          citeType: "ku",
        },
      ],
    },
  ],
};

/** 全 Citation Trees（デフォルトが先頭） */
export const citationTrees = [defaultCitationTree, wakaCitationTree];
