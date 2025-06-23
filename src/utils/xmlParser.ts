import axios from "axios";
import { DOMParser, Document as XMLDocument } from "@xmldom/xmldom";

export const getDocument = async (id: string): Promise<XMLDocument | null> => {
  const vol = String(id).split(".")[1];
  const url = `https://kouigenjimonogatari.github.io/xml/lw/${vol.padStart(
    2,
    "0"
  )}.xml`;

  try {
    const response = await axios.get(url);
    const xmlData = response.data;

    // DOMParserでパース
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlData, "application/xml");
    return xmlDoc;
  } catch (error) {
    return null;
  }
};
