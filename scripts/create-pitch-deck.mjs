import fs from "node:fs";
import path from "node:path";

const outFile = path.resolve("docs/bountix-pitch-deck.pptx");

const slides = [
  {
    title: "Bountix",
    kicker: "Escrow-powered task marketplace for everyday work in SEA",
    bullets: [
      "Post tasks, accept taskers, fund escrow, and release payouts in one flow",
      "Built for freelance tasks, micro-jobs, errands, local services, and personal shopping assistance",
      "Powered by Stellar USDC escrow to make informal work safer and more transparent",
    ],
  },
  {
    title: "The Problem",
    bullets: [
      "Everyday task work in SEA often happens through chat groups and social media",
      "Requesters and taskers rely on informal trust instead of clear payment protection",
      "Taskers risk delayed or unpaid work, while requesters risk paying before completion",
      "Most platforms are too rigid for flexible real-world tasks like errands or personal shopping",
    ],
  },
  {
    title: "Our Solution",
    bullets: [
      "Bountix turns informal task requests into secure, trackable task transactions",
      "A requester creates a task, selects a tasker, and locks payment before work starts",
      "Taskers complete work with participant-only chat, notifications, and task status tracking",
      "Escrow is released only after completion is approved by the requester or admin",
    ],
  },
  {
    title: "Product Flow",
    bullets: [
      "Create a task with reward, category, deadline, and requirements",
      "Taskers apply, requester reviews applicants, and one tasker is accepted",
      "Requester funds the task escrow using USDC on Stellar",
      "Accepted participants coordinate in task chat and complete the work",
      "Requester or admin releases escrow and the tasker sees the payout in wallet history",
    ],
  },
  {
    title: "Why Stellar",
    bullets: [
      "Fast and low-cost USDC settlement fits small task payments",
      "Escrow makes payment trust programmable instead of verbal",
      "On-chain release records improve transparency for both sides",
      "Wallet onboarding and payout readiness hide Stellar complexity from everyday users",
      "Stellar creates a practical payment rail for real-world consumer applications",
    ],
  },
  {
    title: "Built Prototype",
    bullets: [
      "Task creation, browsing, applications, and acceptance flow",
      "Stellar wallet onboarding, USDC payout readiness, escrow funding, and release",
      "Participant-only Tencent Chat for accepted task conversations",
      "Notifications for applications, task updates, escrow events, and payouts",
      "Admin moderation with task removal reason and wallet transaction history",
    ],
  },
  {
    title: "Target Users",
    bullets: [
      "Requesters who need flexible help with online or real-world tasks",
      "Taskers who want short-term income with clearer payment protection",
      "Students, freelancers, creators, small businesses, and community organizers",
      "SEA communities where informal work already exists but payment trust is still manual",
    ],
  },
  {
    title: "Demo Highlights",
    bullets: [
      "Google login creates a wallet automatically for new users",
      "Requester creates a task, receives applications, and accepts a tasker",
      "Accepted participants can use private task chat",
      "Requester funds Stellar USDC escrow and admin/requester releases payout",
      "Tasker wallet shows recent transaction history after release",
    ],
  },
  {
    title: "Impact & Market Fit",
    bullets: [
      "Reduces payment risk in informal task work",
      "Makes digital dollar payouts accessible through a familiar task marketplace UX",
      "Supports broad task categories instead of one narrow service vertical",
      "Turns Stellar escrow into a real consumer workflow for SEA users",
    ],
  },
  {
    title: "Next Steps",
    bullets: [
      "Add dispute resolution and evidence review",
      "Build reputation, tasker profiles, and completion history",
      "Improve mobile-first UX for field tasks and local services",
      "Expand moderation, task categories, and payout reporting",
      "Harden compliance, security, and production operations",
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
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Bountix Pitch Deck</dc:title><dc:creator>Imam Islamuddin</dc:creator><cp:lastModifiedBy>Imam Islamuddin</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
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
