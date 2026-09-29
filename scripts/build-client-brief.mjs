/**
 * Generates the client-facing "information required" PDF.
 *
 * The audience is the practice, not a developer: no file paths, no field
 * names, no mention of how the site is built. It says what to send and why it
 * matters, and nothing else.
 *
 * It is a script rather than a one-off document because the list shrinks every
 * time something arrives. Re-run `npm run brief` and send the new version.
 *
 * Typography is PDF's built-in Helvetica. Embedding the site's own faces would
 * mean shipping TTFs for a document nobody reads next to the website, and
 * next/font only keeps woff2, which PDF cannot use.
 */
import { mkdir, readFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "docs", "Chetan-Borkar-Associates-Website-Information-Required.pdf");

const INK = "#1A2333";
const BONE = "#F4F3F0";
const STONE = "#6B7382";
const ACCENT = "#3E5A86";
const RULE = "#D8D8D4";

const PAGE = { size: "A4", margins: { top: 62, bottom: 66, left: 56, right: 56 } };
const WIDTH = 595.28 - 56 * 2;

/** Everything the practice still has to supply, in the order it is asked for. */
const PROJECTS = [
  { name: "Private Residence", photos: 15, status: "Completed", kind: "Architecture", flag: "Name needed" },
  { name: "Gaikwad Residence", photos: 3, status: "In progress", kind: "Architecture" },
  { name: "Nandvihar", photos: 5, status: "In progress", kind: "Architecture" },
  { name: "SBR Residence", photos: 7, status: "In progress", kind: "Interior" },
  { name: "Vijay Kolekar Residence", photos: 5, status: "In progress", kind: "Architecture" },
  { name: "Sumeet Residence", photos: 1, status: "Completed", kind: "Interior", flag: "More photographs needed" },
];

async function main() {
  await mkdir(path.dirname(OUT), { recursive: true });

  // bufferPages: without it every page is flushed the moment the next one
  // starts, and the footer pass at the end can only reach the last one.
  const doc = new PDFDocument({ ...PAGE, autoFirstPage: false, bufferPages: true, info: {
    Title: "Chetan Borkar Associates - Website: Information Required",
    Author: "Chetan Borkar Associates",
    Subject: "Content and assets still needed before the website can go live",
  }});
  const file = createWriteStream(OUT);
  doc.pipe(file);

  let sectionNo = 0;

  // ---- primitives ---------------------------------------------------------

  const space = (n) => { doc.y += n; };

  /** Starts a new page if less than `needed` points remain. */
  const room = (needed) => {
    if (doc.y + needed > doc.page.height - PAGE.margins.bottom) {
      doc.addPage();
      return true;
    }
    return false;
  };

  const section = (title, standfirst) => {
    sectionNo++;
    room(150);
    space(14);
    doc.save().moveTo(PAGE.margins.left, doc.y).lineTo(PAGE.margins.left + 34, doc.y)
      .lineWidth(2).strokeColor(ACCENT).stroke().restore();
    space(12);
    doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(8)
      .text(`SECTION ${String(sectionNo).padStart(2, "0")}`, { characterSpacing: 1.6 });
    space(4);
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(16).text(title);
    if (standfirst) {
      space(5);
      doc.fillColor(STONE).font("Helvetica").fontSize(9.5).text(standfirst, { width: WIDTH, lineGap: 2.5 });
    }
    space(10);
  };

  const para = (text, opts = {}) => {
    room(44);
    doc.fillColor(opts.color ?? INK).font(opts.bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(opts.size ?? 10).text(text, { width: WIDTH, lineGap: 3.2, ...opts });
    space(opts.after ?? 8);
  };

  /** A tickable row. `note` is the explanation under the label. */
  const check = (label, note) => {
    const boxSize = 9;
    const textW = WIDTH - boxSize - 11;
    doc.font("Helvetica-Bold").fontSize(10);
    let needed = doc.heightOfString(label, { width: textW, lineGap: 2.5 });
    if (note) {
      doc.font("Helvetica").fontSize(9);
      needed += doc.heightOfString(note, { width: textW, lineGap: 2.5 }) + 2.5;
    }
    // Measured, not guessed: a guess that is too low leaves the tickbox on one
    // page and the label it belongs to on the next.
    room(needed + 14);
    const top = doc.y;
    doc.save().rect(PAGE.margins.left, top + 2, boxSize, boxSize)
      .lineWidth(0.9).strokeColor(STONE).stroke().restore();

    const x = PAGE.margins.left + boxSize + 11;
    const w = WIDTH - boxSize - 11;
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(10).text(label, x, top, { width: w, lineGap: 2.5 });
    if (note) {
      doc.fillColor(STONE).font("Helvetica").fontSize(9).text(note, x, doc.y + 2.5, { width: w, lineGap: 2.5 });
    }
    doc.x = PAGE.margins.left;
    space(11);
  };

  /** Two-column spec rows: label on the left, value on the right. */
  const spec = (rows) => {
    const labelW = 150;
    for (const [label, value] of rows) {
      doc.font("Helvetica-Bold").fontSize(9.5);
      room(doc.heightOfString(value, { width: WIDTH - labelW, lineGap: 2.5 }) + 14);
      const top = doc.y;
      doc.fillColor(STONE).font("Helvetica").fontSize(9).text(label, PAGE.margins.left, top, { width: labelW - 12 });
      const afterLabel = doc.y;
      doc.fillColor(INK).font("Helvetica-Bold").fontSize(9.5)
        .text(value, PAGE.margins.left + labelW, top, { width: WIDTH - labelW, lineGap: 2.5 });
      doc.y = Math.max(afterLabel, doc.y) + 7;
      doc.x = PAGE.margins.left;
      doc.save().moveTo(PAGE.margins.left, doc.y - 3).lineTo(PAGE.margins.left + WIDTH, doc.y - 3)
        .lineWidth(0.5).strokeColor(RULE).stroke().restore();
      space(4);
    }
    space(4);
  };

  /** A tinted panel for a caution or an aside. */
  const panel = (title, body) => {
    const pad = 14;
    const innerW = WIDTH - pad * 2;
    // heightOfString measures with whatever font is currently selected, so both
    // have to be set before measuring or the panel is drawn to the wrong size.
    doc.font("Helvetica-Bold").fontSize(9.5);
    const titleH = doc.heightOfString(title, { width: innerW });
    doc.font("Helvetica").fontSize(9.5);
    const bodyH = doc.heightOfString(body, { width: innerW, lineGap: 3 });
    const h = titleH + bodyH + pad * 2 + 8;
    room(h + 12);
    const top = doc.y;
    doc.save().rect(PAGE.margins.left, top, WIDTH, h).fill(BONE).restore();
    doc.save().rect(PAGE.margins.left, top, 3, h).fill(ACCENT).restore();
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(9.5)
      .text(title, PAGE.margins.left + pad, top + pad, { width: innerW });
    doc.fillColor(INK).font("Helvetica").fontSize(9.5)
      .text(body, PAGE.margins.left + pad, doc.y + 4, { width: innerW, lineGap: 3 });
    doc.x = PAGE.margins.left;
    doc.y = top + h;
    space(14);
  };

  const projectTable = () => {
    const cols = [156, 76, 58, 70, WIDTH - 156 - 76 - 58 - 70];
    const header = ["Project", "Filed under", "Photos", "Status shown", "Note"];
    room(60);

    let x = PAGE.margins.left;
    const headTop = doc.y;
    doc.fillColor(STONE).font("Helvetica-Bold").fontSize(8);
    header.forEach((h, i) => { doc.text(h, x, headTop, { width: cols[i] - 8, characterSpacing: 0.8 }); x += cols[i]; });
    doc.y = headTop + 14;
    doc.save().moveTo(PAGE.margins.left, doc.y).lineTo(PAGE.margins.left + WIDTH, doc.y)
      .lineWidth(0.9).strokeColor(INK).stroke().restore();
    space(7);

    for (const p of PROJECTS) {
      doc.font("Helvetica").fontSize(9.5);
      room(doc.heightOfString(p.flag ?? "-", { width: cols[4] - 8, lineGap: 2 }) + 16);
      const top = doc.y;
      const cells = [p.name, p.kind, `${p.photos}`, p.status, p.flag ?? "-"];
      x = PAGE.margins.left;
      let bottom = top;
      cells.forEach((c, i) => {
        doc.fillColor(i === 4 && p.flag ? ACCENT : INK)
          .font(i === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(9.5)
          .text(c, x, top, { width: cols[i] - 8, lineGap: 2 });
        bottom = Math.max(bottom, doc.y);
        x += cols[i];
      });
      doc.y = bottom + 7;
      doc.x = PAGE.margins.left;
      doc.save().moveTo(PAGE.margins.left, doc.y - 3).lineTo(PAGE.margins.left + WIDTH, doc.y - 3)
        .lineWidth(0.5).strokeColor(RULE).stroke().restore();
      space(4);
    }
    space(6);
  };

  // ---- cover --------------------------------------------------------------

  doc.addPage();
  doc.save().rect(0, 0, doc.page.width, 210).fill(INK).restore();

  try {
    doc.image(path.join(ROOT, "public", "brand", "logo-horizontal-light.png"),
      PAGE.margins.left, 52, { height: 44 });
  } catch {
    doc.fillColor(BONE).font("Helvetica-Bold").fontSize(18)
      .text("CHETAN BORKAR ASSOCIATES", PAGE.margins.left, 60);
  }

  doc.fillColor(BONE).font("Helvetica-Bold").fontSize(25)
    .text("Website", PAGE.margins.left, 126, { width: WIDTH });
  doc.fillColor("#98A0AE").font("Helvetica").fontSize(25)
    .text("Information required", PAGE.margins.left, doc.y - 2, { width: WIDTH });

  doc.y = 244;
  doc.x = PAGE.margins.left;

  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  doc.fillColor(STONE).font("Helvetica").fontSize(9).text(today, { characterSpacing: 0.6 });
  space(22);

  para(
    "The website is built and working. Everything in this document is content - words, photographs and contact details. No design or development work is waiting on any of it.",
    { size: 11.5, after: 12 },
  );
  para(
    "Send whatever you have, in whatever form is easiest: email, WhatsApp, a shared folder, a phone call. Nothing needs to be typed up or formatted. Items can arrive one at a time; each one can be added on its own.",
    { color: STONE, after: 16 },
  );

  panel(
    "Nothing incorrect is published while you decide",
    "Where a detail has not been supplied, the site leaves that space out entirely rather than showing an empty value or a note to itself. A project with no floor area simply does not show a floor area line. So the site can go live before every item below is answered, and each one can be filled in afterwards without anything being rebuilt.",
  );

  para("There are two exceptions, marked REQUIRED below: the studio's contact details and the client testimonials. The site should not go live without those.", { color: STONE, size: 9.5 });

  // ---- 1. studio details --------------------------------------------------

  doc.addPage();
  section(
    "Studio details",
    "REQUIRED. These appear in the page header, the footer, the contact page and in every link preview when the site is shared on WhatsApp or Instagram. They are the only items that currently show placeholder values.",
  );

  check("Email address for enquiries", "The address you want prospective clients to write to.");
  check("Phone number", "With the country code, exactly as you want it displayed - for example +91 98765 43210. It becomes a tappable dial link on a phone.");
  check("WhatsApp number", "Only if it differs from the phone number above. A WhatsApp button appears in the header and on the contact page, opening a chat with a short message already written.");
  check("Full studio address", "Building or unit, street, city, state and PIN code.");
  check("Opening hours", "Currently written as \"Mon - Sat, 10:00 - 19:00\". Confirm or correct.");
  check("Domain name", "The web address the site will live at, for example chetanborkarassociates.com. Needed before launch: it is used in links, in search listings and in the preview card shown when someone shares the site.");
  check("Google Maps location (optional)", "If you would like a map on the contact page, send the studio's Google Maps link or the name it is listed under. Without it, no map is shown.");

  // ---- 2. the discipline question ----------------------------------------

  section(
    "One decision to confirm",
    "A single discrepancy between two things you have already published.",
  );

  spec([
    ["Your logo reads", "ARCHITECTURE  |  INTERIOR  |  ENGINEERING"],
    ["Your Instagram bio reads", "Architecture  |  Interior  |  Construction"],
    ["The site currently follows", "The logo - Engineering"],
  ]);

  para(
    "The third word appears in the footer, in the three service descriptions on the home page, and as the category each project is filed under. Changing it later is straightforward, but it is better decided once. Confirm which is correct.",
    { color: STONE, size: 9.5 },
  );

  // ---- 3. projects --------------------------------------------------------

  section(
    "Project information",
    "Six projects are on the site, with the photographs you supplied. What is missing is the information about them. Until it arrives, those lines are simply absent from the page.",
  );

  projectTable();

  para("For each project above, the following is needed:", { bold: true, size: 10, after: 10 });

  check("Location", "City and state.");
  check("Built-up area", "In square feet or square metres - either is fine, say which. It is shown in both.");
  check("Year", "Year of completion, or expected completion if the work is ongoing.");
  check("One-line summary", "Around ten to fifteen words. It appears under the project name on the listing page, and is what Google shows beneath the link.");
  check("A description", "One hundred to two hundred words. The brief, the site, the problem worth solving and what you did about it. Plain prose is fine - it does not need to be polished, it can be edited.");
  check("Confirm the status and category", "The table above shows what the site currently says. Completed or in progress, and whether each is filed under Architecture, Interior or Engineering - these were inferred from the photographs and have not been confirmed by you.");

  panel(
    "Two projects need something specific",
    "\"Private Residence\" is a placeholder name. Fifteen photographs of a finished house arrived with no project name attached, so one was invented to get it onto the site. It needs its real name.\n\nThe Sumeet Residence has only a single photograph. It works, but one image gives a thin impression next to the others - four or five would present it properly.",
  );

  // ---- 4. about the practice ---------------------------------------------

  section(
    "About the practice",
    "The studio page carries a short biography, a portrait and four figures. The figures are currently estimates and must be confirmed before launch.",
  );

  check("Confirm the founder's name and title", "Currently shown as Chetan Borkar, Principal Architect. Confirm the spelling and the title you prefer.");
  check("A short biography", "Eighty to one hundred and twenty words. Training, years in practice, what the studio is trying to do, and anything that explains to a stranger why the work can be trusted.");
  check("A portrait photograph", "Of the founder. A project photograph is standing in for it at the moment. See the photography specification for what is needed.");
  check("Confirm the four figures", "The studio page currently states: 12+ years in practice, 85+ projects delivered, 4,50,000 sq ft built, 6 cities. These were estimates written to build the page. Every one needs your confirmation or correction - they are claims about the practice.");
  check("COA registration number (optional)", "Shown on the studio page if you want it there. Left out if not.");

  // ---- 5. testimonials ----------------------------------------------------

  section(
    "Client testimonials",
    "REQUIRED. Three quotes appear on the home page. All three are currently written placeholders.",
  );

  panel(
    "Why these cannot be left as they are",
    "The placeholder quotes are deliberately attributed to \"Client\" with no name, because publishing an invented quote under a real person's name would be a serious problem - for you, not for the website. They read as real quotes. They must be replaced with genuine ones or the section removed before the site goes live.",
  );

  para("For each of three clients:", { bold: true, size: 10, after: 10 });
  check("The quote", "One to three sentences, in their words.");
  check("Their name, and their role or the project", "For example: the owner of a named residence, or the director of a named company.");
  check("City", "Shown beneath the name.");
  check("Their permission", "Confirmation that they are happy to be named publicly on the website.");

  para(
    "If three are difficult to obtain, one or two is better than three invented ones. Tell us and the section will be adjusted or removed.",
    { color: STONE, size: 9.5 },
  );

  // ---- 6. photography -----------------------------------------------------

  section(
    "Photography",
    "Thirty-six photographs across the six projects are already in place and all are good enough - they range from 2,400 to 6,000 pixels wide. This specification is for anything sent from here on.",
  );

  spec([
    ["Minimum size", "2,560 pixels on the long edge"],
    ["Preferred size", "3,000 pixels or more - larger is always better"],
    ["File types", "JPEG, PNG or TIFF"],
    ["Send", "The original camera files or renders"],
    ["Do not send", "Images saved or downloaded from Instagram"],
    ["Orientation", "Landscape for anything shown full-screen; portrait is fine inside a gallery"],
    ["Per project", "One clear lead photograph, plus four to eight supporting shots"],
  ]);

  para(
    "Instagram re-compresses everything it stores and rarely keeps anything wider than 1,080 pixels, which is a quarter of what a full-screen image on a modern laptop needs. A photograph taken from Instagram will look soft on the site even though it looks fine on a phone. Send the originals wherever they exist.",
    { color: STONE, size: 9.5 },
  );

  check("If a professional photographer took them", "Confirm the licence covers use on your website, and give the name to credit. A credit line can be shown on each project.");

  // ---- 7. hero video ------------------------------------------------------

  doc.addPage();
  section(
    "Hero film (optional)",
    "The home page opens on a full-screen photograph. A short silent film can take its place. This is optional - the page is finished and works without one.",
  );

  spec([
    ["Orientation", "Landscape, 16:9"],
    ["Minimum size", "1920 x 1080"],
    ["Preferred size", "2560 x 1440"],
    ["Format", "MP4, H.264"],
    ["Length", "8 to 15 seconds"],
    ["File size", "Under 6 MB"],
    ["Audio", "None - remove the audio track entirely"],
    ["Also send", "One still frame, same dimensions, as a JPEG"],
  ]);

  para("Four things worth knowing before it is shot or cut:", { bold: true, size: 10, after: 10 });

  check("It plays silently, with no controls", "It starts on its own and no one can pause it or turn it up, so any audio track is file size spent on something nobody will ever hear. Cut the film so it works with the sound off.");
  check("It loops continuously", "It restarts the moment it ends. Begin and end on a similar frame and the join will not be noticed; end somewhere far from where it began and the jump is the only thing anyone will see.");
  check("It is cropped to fill the screen", "How much is cropped depends on the device - a phone held upright shows far less width than a laptop. Keep the subject centred and leave room around the edges. Nothing important, and no text or logo, near the sides.");
  check("Under 6 MB matters", "It is the first thing every visitor downloads, before anything on the page can be read. A large file does not make the site slower to look at - it makes it slower to arrive at all, particularly on a phone away from wifi.");

  para(
    "The still frame is shown in the first moment while the film is still loading, so it should be a frame from the film itself rather than a different photograph.",
    { color: STONE, size: 9.5 },
  );

  // ---- 8. reels -----------------------------------------------------------

  section(
    "Instagram reels (optional)",
    "A row of vertical films can run on the home page. It is hidden entirely while empty, so the page is complete without it.",
  );

  spec([
    ["Orientation", "Vertical, 9:16"],
    ["Format", "MP4, H.264 with AAC audio"],
    ["File size", "Under 8 MB each"],
    ["How many", "Three to six works best"],
    ["Also send", "A still frame for each, as a JPEG (optional)"],
  ]);

  check("A short caption for each", "A few words, shown underneath.");
  check("A one-line description of what each shows", "Read aloud to visitors using a screen reader, who cannot see the film. For example: \"the camera moves through the double-height living room towards the garden\".");

  para(
    "These start muted, with a control to turn the sound on, so unlike the hero film the audio here is worth keeping.",
    { color: STONE, size: 9.5 },
  );

  // ---- 9. copy written on your behalf ------------------------------------

  section(
    "Words written for you - please read",
    "To build the pages, the copy below was drafted on your behalf. It is written to be replaced or corrected. None of it has been checked by you, and all of it is currently public-facing text about your practice.",
  );

  check("The studio statement and the About paragraphs", "On the home page and the studio page. Two or three paragraphs describing how the practice works.");
  check("The three \"How we work\" points", "Currently: Decide early; Short material palettes; Draw what gets built.");
  check("The six process steps", "Enquiry, Concept, Design development, Approvals, Construction, Handover - each with a sentence describing it.");
  check("The three service descriptions", "One paragraph each for Architecture, Interior and Engineering.");
  check("The tagline", "\"Designing spaces that inspire and work\", taken from your Instagram bio. Confirm it should stay.");

  para(
    "Read it as a stranger would. If a sentence describes a way of working that is not yours, say so and it will be rewritten - it is easier to change now than to explain later to someone who read it and expected it.",
    { color: STONE, size: 9.5 },
  );

  // ---- 10. already done ---------------------------------------------------

  section(
    "Already supplied - nothing needed",
    "For completeness, so it is clear what is not being asked for.",
  );

  spec([
    ["Logo", "Received. Both light and dark versions prepared from it"],
    ["Project photographs", "36 images across 6 projects"],
    ["Instagram handle", "@chetan_borkar_associates, linked in the header and footer"],
    ["Social preview cards", "Generated automatically from each project's lead photograph"],
    ["App icons", "Generated from the logo"],
    ["The site itself", "Built, tested and ready to publish"],
  ]);

  // ---- summary ------------------------------------------------------------

  doc.addPage();
  space(6);
  doc.fillColor(INK).font("Helvetica-Bold").fontSize(18).text("At a glance");
  space(6);
  doc.fillColor(STONE).font("Helvetica").fontSize(9.5)
    .text("The whole list in one place. The first two blocks are the ones that hold up launch.", { width: WIDTH, lineGap: 2.5 });
  space(18);

  const summary = [
    ["Before the site can go live", [
      "Email, phone and WhatsApp number",
      "Full studio address and opening hours",
      "The domain name",
      "Three real client testimonials, with permission to name them",
      "Confirmation of the four figures on the studio page",
    ]],
    ["Before the site reads as finished", [
      "The real name for the project currently called \"Private Residence\"",
      "Location, area, year, a one-line summary and a description for each of the six projects",
      "Confirmation of each project's status and category",
      "A short biography and a portrait of the founder",
      "Engineering or Construction - the logo and the Instagram bio disagree",
      "Your read-through of the words written on your behalf",
    ]],
    ["Optional, whenever it suits", [
      "A hero film for the home page, and a still frame from it",
      "Instagram reels, with captions",
      "More photographs of the Sumeet Residence",
      "COA registration number",
      "Google Maps location for the contact page",
    ]],
  ];

  for (const [heading, items] of summary) {
    room(40 + items.length * 20);
    doc.fillColor(ACCENT).font("Helvetica-Bold").fontSize(9)
      .text(heading.toUpperCase(), { characterSpacing: 1.2 });
    space(9);
    for (const item of items) {
      room(24);
      const top = doc.y;
      doc.save().rect(PAGE.margins.left, top + 1.5, 8, 8).lineWidth(0.9).strokeColor(STONE).stroke().restore();
      doc.fillColor(INK).font("Helvetica").fontSize(10)
        .text(item, PAGE.margins.left + 18, top, { width: WIDTH - 18, lineGap: 2.5 });
      doc.x = PAGE.margins.left;
      space(8);
    }
    space(14);
  }

  // ---- footers ------------------------------------------------------------

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    // The footer sits inside the bottom margin, and text() treats writing there
    // as overflow and starts a new page - which then needs a footer of its own.
    // Dropping the margin for the duration is pdfkit's documented way out.
    const keepBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    const y = doc.page.height - 44;
    doc.save().moveTo(PAGE.margins.left, y - 12).lineTo(PAGE.margins.left + WIDTH, y - 12)
      .lineWidth(0.5).strokeColor(RULE).stroke().restore();
    doc.fillColor(STONE).font("Helvetica").fontSize(7.5)
      .text("Chetan Borkar Associates - website information required", PAGE.margins.left, y, {
        width: WIDTH, align: "left", lineBreak: false,
      });
    doc.fillColor(STONE).font("Helvetica").fontSize(7.5)
      .text(`${i + 1} / ${range.count}`, PAGE.margins.left, y, {
        width: WIDTH, align: "right", lineBreak: false,
      });
    doc.page.margins.bottom = keepBottom;
  }

  doc.end();

  // The document's own "end" fires when its readable side has been drained,
  // which is not the same as the bytes having reached the disk. Resolving on
  // that let the process exit with the tail of the file still buffered, and a
  // PDF missing its trailer will not open in anything.
  await new Promise((resolve, reject) => {
    file.on("finish", resolve);
    file.on("error", reject);
  });

  // Never hand over a file that cannot open. A PDF must end with %%EOF, and
  // that marker is the last thing written, so its presence means the whole
  // document arrived.
  const written = await readFile(OUT);
  const tail = written.subarray(-1024).toString("latin1");
  if (!written.subarray(0, 5).toString("latin1").startsWith("%PDF-") || !tail.includes("%%EOF")) {
    throw new Error(`${OUT} was written incompletely (${written.length} bytes) - do not send it.`);
  }
  return written.length;
}

const bytes = await main();
console.log(`client brief -> ${path.relative(ROOT, OUT)} (${(bytes / 1024).toFixed(0)} KB, verified)`);
