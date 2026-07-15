import fs from "node:fs";
import path from "node:path";

const outFile = path.resolve("docs/bountix-pitch-deck.pptx");

const slides = [
  {
    title: "Bountix",
    kicker: "Trusted Task Marketplace Powered by Stellar Escrow",
    bullets: [
      "A consumer app for everyday tasks in SEA",
      "Built for freelance tasks, errands, local services, micro-jobs, and personal shopping assistance",
      "Uses USDC escrow on Stellar to make trust programmable",
    ],
  },
  {
    title: "Problem",
    bullets: [
      "Many everyday tasks still happen through chat groups, social media, and personal networks",
      "Requesters worry that work may not be completed after payment",
      "Taskers worry about delayed or unpaid work after completing a task",
      "Existing platforms are often too narrow, expensive, or not designed for flexible real-world tasks",
    ],
  },
  {
    title: "Solution",
    bullets: [
      "Bountix turns informal task requests into secure, trackable transactions",
      "Requesters post tasks, review applicants, choose taskers, and fund escrow",
      "Taskers complete work and communicate through participant-only chat",
      "Funds are released after approval by the requester or admin",
    ],
  },
  {
    title: "How It Works",
    bullets: [
      "1. Requester creates a task with reward, location/category, and requirements",
      "2. Taskers apply and discuss details in task chat after acceptance",
      "3. Requester funds the task escrow using USDC on Stellar",
      "4. Tasker completes the work and submits proof or updates",
      "5. Escrow is released to the tasker after approval",
    ],
  },
  {
    title: "Stellar Integration",
    bullets: [
      "USDC escrow is funded before work starts",
      "On-chain release flow records payout activity transparently",
      "Automatic wallet creation reduces onboarding friction for new users",
      "USDC payout readiness handles Stellar trustline requirements",
      "Wallet dashboard shows recent transaction activity",
    ],
  },
  {
    title: "Product Features",
    bullets: [
      "Task creation, browsing, applications, and acceptance flow",
      "Participant-only Tencent Chat integration for accepted task conversations",
      "Notifications for applications, task updates, escrow activity, and payouts",
      "Admin moderation to remove unsafe or prohibited tasks with a reason",
      "Wallet onboarding, recovery, escrow funding, release, and transaction history",
    ],
  },
  {
    title: "Target Users",
    bullets: [
      "Students, freelancers, creators, small business owners, and community organizers",
      "People who need errands, local services, personal shopping assistance, or micro-work",
      "Taskers who want flexible short-term income with better payment protection",
      "SEA communities where informal work already happens but trust is still manual",
    ],
  },
  {
    title: "Demo Flow",
    bullets: [
      "Sign in and automatically create a Stellar-ready wallet",
      "Create a task and receive tasker applications",
      "Accept an applicant and use participant-only chat",
      "Fund escrow with USDC on Stellar",
      "Release escrow and show tasker wallet transaction history",
    ],
  },
  {
    title: "Impact",
    bullets: [
      "Makes informal work safer by locking payment before the task starts",
      "Improves transparency for both requesters and taskers",
      "Makes Stellar payments usable through a familiar consumer workflow",
      "Supports real-world access to digital dollar payouts for flexible work in SEA",
    ],
  },
  {
    title: "Roadmap",
    bullets: [
      "Dispute resolution and evidence review workflow",
      "Reputation, tasker profiles, and completion history",
      "Mobile-first experience for field tasks and local services",
      "More task categories and community moderation tools",
      "Production hardening for compliance, security, and scale",
    ],
  },
];

const theme = {
  navy: "111827",
  ink: "172033",
  muted: "4B5563",
  green: "14B8A6",
  amber: "F59E0B",
  white: "FFFFFF",
  panel: "F8FAFC",
};

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textShape(id, x, y, w, h, paragraphs, opts = {}) {
  const size = opts.size ?? 2400;
  const color = opts.color ?? theme.ink;
  const bold = opts.bold ? ' b="1"' : "";
  const lines = Array.isArray(paragraphs) ? paragraphs : [paragraphs];
  const body = lines
    .map((line) => {
      const bullet = opts.bullet ? '<a:buChar char="•"/>' : "<a:buNone/>";
      const margin = opts.bullet ? ' marL="285750" indent="-171450"' : "";
      return `<a:p><a:pPr${margin}>${bullet}</a:pPr><a:r><a:rPr lang="en-US" sz="${size}"${bold}><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:rPr><a:t>${escapeXml(line)}</a:t></a:r></a:p>`;
    })
    .join("");

  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square"/><a:lstStyle/>${body}</p:txBody></p:sp>`;
}

function rectShape(id, x, y, w, h, fill, radius = false) {
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Panel ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="${radius ? "roundRect" : "rect"}"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${fill}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>`;
}

function slideXml(slide, index) {
  const title = textShape(5, 640000, 620000, 7200000, 760000, slide.title, {
    size: index === 0 ? 5200 : 4200,
    bold: true,
    color: theme.navy,
  });
  const kicker = slide.kicker
    ? textShape(6, 660000, 1420000, 6500000, 440000, slide.kicker, {
        size: 2100,
        color: theme.muted,
      })
    : "";
  const bullets = textShape(7, 780000, slide.kicker ? 2180000 : 1840000, 7600000, 3600000, slide.bullets, {
    size: 2050,
    bullet: true,
    color: theme.ink,
  });
  const footer = textShape(8, 6650000, 6400000, 2500000, 260000, `Bountix / ${index + 1}`, {
    size: 1050,
    color: theme.muted,
  });
  const accent = index % 2 === 0 ? theme.green : theme.amber;

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="${theme.white}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${rectShape(2, 0, 0, 9600000, 280000, accent)}${rectShape(3, 7200000, 430000, 1700000, 5200000, theme.panel, true)}${rectShape(4, 7380000, 800000, 1340000, 1340000, accent, true)}${title}${kicker}${bullets}${footer}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

function relsXml(targets) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${targets
    .map((target, index) => `<Relationship Id="rId${index + 1}" Type="${target.type}" Target="${target.target}"/>`)
    .join("")}</Relationships>`;
}

function presentationXml() {
  const ids = slides.map((_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 1}"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst>${ids}</p:sldIdLst><p:sldSz cx="9600000" cy="5400000" type="wide"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle><a:defPPr><a:defRPr lang="en-US"/></a:defPPr></p:defaultTextStyle></p:presentation>`;
}

function contentTypesXml() {
  const overrides = slides
    .map((_, index) => `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>${overrides}</Types>`;
}

function coreXml() {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Bountix Pitch Deck</dc:title><dc:creator>Imam Islamuddin</dc:creator><cp:lastModifiedBy>Codex</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
}

function appXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Bountix</Application><PresentationFormat>On-screen Show (16:9)</PresentationFormat><Slides>${slides.length}</Slides></Properties>`;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = Math.max(date.getFullYear() - 1980, 0);
  return { date: (year << 9) | (month << 5) | day, time };
}

function makeZip(entries) {
  const localParts = [];
  const centralParts = [];
  const meta = [];
  let offset = 0;
  const dt = dosDateTime();

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, "utf8");
    const crc = crc32(data);
    const local = Buffer.alloc(30 + name.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(dt.time, 10);
    local.writeUInt16LE(dt.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    name.copy(local, 30);
    localParts.push(local, data);
    meta.push({ name, data, crc, offset });
    offset += local.length + data.length;
  }

  for (const item of meta) {
    const central = Buffer.alloc(46 + item.name.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(dt.time, 12);
    central.writeUInt16LE(dt.date, 14);
    central.writeUInt32LE(item.crc, 16);
    central.writeUInt32LE(item.data.length, 20);
    central.writeUInt32LE(item.data.length, 24);
    central.writeUInt16LE(item.name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(item.offset, 42);
    item.name.copy(central, 46);
    centralParts.push(central);
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, ...centralParts, eocd]);
}

const entries = [
  { name: "[Content_Types].xml", data: contentTypesXml() },
  {
    name: "_rels/.rels",
    data: relsXml([
      {
        type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
        target: "ppt/presentation.xml",
      },
      {
        type: "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties",
        target: "docProps/core.xml",
      },
      {
        type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties",
        target: "docProps/app.xml",
      },
    ]),
  },
  { name: "docProps/core.xml", data: coreXml() },
  { name: "docProps/app.xml", data: appXml() },
  { name: "ppt/presentation.xml", data: presentationXml() },
  {
    name: "ppt/_rels/presentation.xml.rels",
    data: relsXml(
      slides.map((_, index) => ({
        type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide",
        target: `slides/slide${index + 1}.xml`,
      })),
    ),
  },
  ...slides.flatMap((slide, index) => [
    { name: `ppt/slides/slide${index + 1}.xml`, data: slideXml(slide, index) },
    { name: `ppt/slides/_rels/slide${index + 1}.xml.rels`, data: relsXml([]) },
  ]),
];

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, makeZip(entries));
console.log(outFile);
