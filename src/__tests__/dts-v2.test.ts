import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app } from "../index";
import http from "http";

const PORT = 3499;
const BASE = `http://localhost:${PORT}`;

let server: http.Server;

beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(PORT, () => resolve());
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

async function fetchJson(path: string) {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, headers: res.headers, body: await res.json() };
}

async function fetchRaw(path: string) {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, headers: res.headers, body: await res.text() };
}

describe("Entry Point", () => {
  it("returns DTS 1.0 entry point", async () => {
    const { body, headers } = await fetchJson("/api/v2/dts");
    expect(body["@context"]).toBe("https://dtsapi.org/context/v1.0.json");
    expect(body.dtsVersion).toBe("1.0");
    expect(body["@type"]).toBe("EntryPoint");
    expect(body["@id"]).toBe("/api/v2/dts");
    expect(headers.get("content-type")).toContain("application/ld+json");
  });

  it("has URI templates with all parameters", async () => {
    const { body } = await fetchJson("/api/v2/dts");
    expect(body.collection).toContain("{?id,page,nav}");
    expect(body.navigation).toContain("start,end,down,tree,page");
    expect(body.document).toContain("start,end,tree,mediaType");
  });
});

describe("Collection Endpoint", () => {
  it("returns root collection with DTS 1.0 format", async () => {
    const { body, headers } = await fetchJson("/api/v2/dts/collection");
    expect(body["@context"]).toBe("https://dtsapi.org/context/v1.0.json");
    expect(body.dtsVersion).toBe("1.0");
    expect(body["@type"]).toBe("Collection");
    expect(body.totalParents).toBe(0);
    expect(body.totalChildren).toBeGreaterThan(0);
    expect(body.member).toBeDefined();
    expect(Array.isArray(body.member)).toBe(true);
    expect(headers.get("content-type")).toContain("application/ld+json");
  });

  it("members have required DTS 1.0 fields", async () => {
    const { body } = await fetchJson("/api/v2/dts/collection");
    const member = body.member[0];
    expect(member["@id"]).toBeDefined();
    expect(member["@type"]).toBe("Resource");
    expect(member.title).toBeDefined();
    expect(member.totalParents).toBe(1);
    expect(member.totalChildren).toBe(0);
    expect(member.collection).toBeDefined();
    expect(member.document).toBeDefined();
    expect(member.navigation).toBeDefined();
    expect(member.citationTrees).toBeDefined();
  });

  it("member URI templates include all parameters", async () => {
    const { body } = await fetchJson("/api/v2/dts/collection");
    const member = body.member[0];
    expect(member.document).toContain("start,end,tree,mediaType");
    expect(member.navigation).toContain("start,end,down,tree,page");
    expect(member.collection).toContain("page,nav");
  });

  it("returns specific resource by id", async () => {
    const { body, status } = await fetchJson(
      "/api/v2/dts/collection?id=urn:kouigenjimonogatari.1"
    );
    expect(status).toBe(200);
    expect(body["@type"]).toBe("Resource");
    expect(body["@id"]).toBe("urn:kouigenjimonogatari.1");
  });

  it("returns 404 for invalid id", async () => {
    const { status } = await fetchJson(
      "/api/v2/dts/collection?id=invalid"
    );
    expect(status).toBe(404);
  });
});

describe("Navigation Endpoint", () => {
  it("returns navigation with down=1", async () => {
    const { body, headers } = await fetchJson(
      "/api/v2/dts/navigation?resource=urn:kouigenjimonogatari.1&down=1"
    );
    expect(body["@context"]).toBe("https://dtsapi.org/context/v1.0.json");
    expect(body.dtsVersion).toBe("1.0");
    expect(body["@type"]).toBe("Navigation");
    expect(body.resource).toBeDefined();
    expect(body.resource["@type"]).toBe("Resource");
    expect(body.resource.citationTrees).toBeDefined();
    expect(body.member).toBeDefined();
    expect(headers.get("content-type")).toContain("application/ld+json");

    // All members at level 1 (page)
    for (const m of body.member) {
      expect(m.level).toBe(1);
      expect(m["@type"]).toBe("CitableUnit");
      expect(m.citeType).toBe("page");
    }
  });

  it("returns all levels with down=-1", async () => {
    const { body } = await fetchJson(
      "/api/v2/dts/navigation?resource=urn:kouigenjimonogatari.1&down=-1"
    );
    const levels = new Set(body.member.map((m: any) => m.level));
    expect(levels.has(1)).toBe(true);
    expect(levels.has(2)).toBe(true);
  });

  it("returns ref info without member when down is absent", async () => {
    const { body, status } = await fetchJson(
      "/api/v2/dts/navigation?resource=urn:kouigenjimonogatari.1&ref=1"
    );
    expect(status).toBe(200);
    expect(body.ref).toBeDefined();
    expect(body.ref.identifier).toBe("1");
    expect(body.ref["@type"]).toBe("CitableUnit");
    expect(body.member).toBeUndefined();
  });

  it("returns 400 when no down, ref, or start/end", async () => {
    const { status } = await fetchJson(
      "/api/v2/dts/navigation?resource=urn:kouigenjimonogatari.1"
    );
    expect(status).toBe(400);
  });

  it("returns 400 when resource is missing", async () => {
    const { status } = await fetchJson("/api/v2/dts/navigation");
    expect(status).toBe(400);
  });

  it("returns 400 when ref and start are both specified", async () => {
    const { status } = await fetchJson(
      "/api/v2/dts/navigation?resource=urn:kouigenjimonogatari.1&ref=1&start=1"
    );
    expect(status).toBe(400);
  });

  it("returns 400 when start without end", async () => {
    const { status } = await fetchJson(
      "/api/v2/dts/navigation?resource=urn:kouigenjimonogatari.1&start=1"
    );
    expect(status).toBe(400);
  });

  it("returns 404 for invalid ref", async () => {
    const { status } = await fetchJson(
      "/api/v2/dts/navigation?resource=urn:kouigenjimonogatari.1&ref=nonexistent&down=1"
    );
    expect(status).toBe(404);
  });
});

describe("Document Endpoint", () => {
  it("returns TEI XML with correct headers", async () => {
    const { headers, status } = await fetchRaw(
      "/api/v2/dts/document?resource=urn:kouigenjimonogatari.1"
    );
    expect(status).toBe(200);
    expect(headers.get("content-type")).toContain("application/tei+xml");
    expect(headers.get("link")).toContain('rel="collection"');
  });

  it("returns TEI content", async () => {
    const { body } = await fetchRaw(
      "/api/v2/dts/document?resource=urn:kouigenjimonogatari.1"
    );
    expect(body).toContain("TEI");
  });

  it("returns 400 when resource is missing", async () => {
    const res = await fetch(`${BASE}/api/v2/dts/document`);
    expect(res.status).toBe(400);
  });

  it("returns 400 when ref and start are both specified", async () => {
    const res = await fetch(
      `${BASE}/api/v2/dts/document?resource=urn:kouigenjimonogatari.1&ref=1&start=1`
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when start without end", async () => {
    const res = await fetch(
      `${BASE}/api/v2/dts/document?resource=urn:kouigenjimonogatari.1&start=1`
    );
    expect(res.status).toBe(400);
  });
});

describe("Waka (tree=waka) Navigation", () => {
  it("returns waka CitableUnits with down=1", async () => {
    const { body, status } = await fetchJson(
      "/api/v2/dts/navigation?resource=urn:kouigenjimonogatari.1&tree=waka&down=1"
    );
    expect(status).toBe(200);
    expect(body.member).toBeDefined();
    expect(body.member.length).toBeGreaterThan(0);

    for (const m of body.member) {
      expect(m["@type"]).toBe("CitableUnit");
      expect(m.level).toBe(1);
      expect(m.citeType).toBe("waka");
      expect(m.identifier).toMatch(/^waka-\d+$/);
      expect(m.parent).toBeNull();
    }
  });

  it("returns waka and ku with down=-1", async () => {
    const { body } = await fetchJson(
      "/api/v2/dts/navigation?resource=urn:kouigenjimonogatari.1&tree=waka&down=-1"
    );
    const wakaMembers = body.member.filter((m: any) => m.citeType === "waka");
    const kuMembers = body.member.filter((m: any) => m.citeType === "ku");

    expect(wakaMembers.length).toBeGreaterThan(0);
    expect(kuMembers.length).toBeGreaterThan(0);

    // Each ku should have 5 lines per waka (tanka = 5-7-5-7-7)
    expect(kuMembers.length).toBe(wakaMembers.length * 5);

    for (const ku of kuMembers) {
      expect(ku.level).toBe(2);
      expect(ku.parent).toMatch(/^waka-\d+$/);
      expect(ku.identifier).toMatch(/^waka-\d+\.\d+$/);
    }
  });

  it("returns ref info for a specific waka", async () => {
    const { body, status } = await fetchJson(
      "/api/v2/dts/navigation?resource=urn:kouigenjimonogatari.1&tree=waka&ref=waka-001"
    );
    expect(status).toBe(200);
    expect(body.ref).toBeDefined();
    expect(body.ref.identifier).toBe("waka-001");
    expect(body.ref.citeType).toBe("waka");
    expect(body.ref.level).toBe(1);
    expect(body.member).toBeUndefined();
  });

  it("returns 404 for invalid tree", async () => {
    const { status } = await fetchJson(
      "/api/v2/dts/navigation?resource=urn:kouigenjimonogatari.1&tree=invalid&down=1"
    );
    expect(status).toBe(404);
  });

  it("citationTrees includes waka tree", async () => {
    const { body } = await fetchJson(
      "/api/v2/dts/navigation?resource=urn:kouigenjimonogatari.1&tree=waka&down=1"
    );
    const wakaCitTree = body.resource.citationTrees.find(
      (t: any) => t.identifier === "waka"
    );
    expect(wakaCitTree).toBeDefined();
    expect(wakaCitTree.citeStructure[0].citeType).toBe("waka");
    expect(wakaCitTree.citeStructure[0].citeStructure[0].citeType).toBe("ku");
  });
});

describe("Waka (tree=waka) Document", () => {
  it("returns a full waka as XML", async () => {
    const { body, status, headers } = await fetchRaw(
      "/api/v2/dts/document?resource=urn:kouigenjimonogatari.1&tree=waka&ref=waka-001"
    );
    expect(status).toBe(200);
    expect(headers.get("content-type")).toContain("application/tei+xml");
    expect(body).toContain("waka-001");
    expect(body).toContain("<lg");
    expect(body).toContain("<l");
  });

  it("returns a single ku as XML", async () => {
    const { body, status } = await fetchRaw(
      "/api/v2/dts/document?resource=urn:kouigenjimonogatari.1&tree=waka&ref=waka-001.1"
    );
    expect(status).toBe(200);
    expect(body).toContain("<l");
  });

  it("returns 404 for nonexistent waka", async () => {
    const res = await fetch(
      `${BASE}/api/v2/dts/document?resource=urn:kouigenjimonogatari.1&tree=waka&ref=waka-999`
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 for invalid tree", async () => {
    const res = await fetch(
      `${BASE}/api/v2/dts/document?resource=urn:kouigenjimonogatari.1&tree=invalid&ref=waka-001`
    );
    expect(res.status).toBe(404);
  });
});
