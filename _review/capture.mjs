import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "shots");
fs.mkdirSync(outDir, { recursive: true });

const chrome =
  process.env.CHROME ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new",
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  args: ["--no-sandbox", "--disable-gpu"],
});

const page = await browser.newPage();
const fileUrl = "file:///C:/projects/armaghan-presentation/index.html";
await page.goto(fileUrl, {
  waitUntil: "networkidle0",
  timeout: 60000,
});

// Wait for first image/css
await page.waitForSelector(".slide.active");
await new Promise((r) => setTimeout(r, 800));

const slideCount = await page.$$eval(".slide", (els) => els.length);
const report = [];

async function revealAll() {
  await page.evaluate(() => {
    const slide = document.querySelector(".slide.active");
    slide.querySelectorAll(".frag").forEach((n) => n.classList.add("show"));
  });
}

async function inspectSlide(idx) {
  return page.evaluate((i) => {
    const slide = document.querySelectorAll(".slide")[i];
    const title = slide.dataset.title || "";
    const h = slide.querySelector("h1,h2")?.innerText?.trim() || "";
    const brand = slide.querySelector(".brand")?.innerText?.trim() || "";
    const points = [...slide.querySelectorAll(".points li")].map((li) =>
      li.innerText.trim()
    );
    const imgs = [...slide.querySelectorAll("img")].map((img) => ({
      src: img.getAttribute("src"),
      naturalW: img.naturalWidth,
      naturalH: img.naturalHeight,
      complete: img.complete,
      displayW: img.clientWidth,
      displayH: img.clientHeight,
    }));
    const coverBg = getComputedStyle(
      slide.querySelector(".cover-bg") || document.createElement("div")
    ).backgroundImage;
    const styles = getComputedStyle(slide);
    const textSample = slide.querySelector("h1,h2,.lead,.points li");
    let contrastHint = null;
    if (textSample) {
      const cs = getComputedStyle(textSample);
      contrastHint = {
        color: cs.color,
        bg: getComputedStyle(textSample).backgroundColor,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
      };
    }
    // Check hidden frags remaining
    const hiddenFrags = [...slide.querySelectorAll(".frag:not(.show)")].length;
    const rects = [...slide.querySelectorAll("h1,h2,.lead,.points li,.brand")].map(
      (el) => {
        const r = el.getBoundingClientRect();
        return {
          text: el.innerText.trim().slice(0, 40),
          top: Math.round(r.top),
          bottom: Math.round(r.bottom),
          left: Math.round(r.left),
          right: Math.round(r.right),
          overflowY: r.bottom > innerHeight - 52, // hud
          overflowX: r.right > innerWidth || r.left < 0,
        };
      }
    );
    return {
      index: i + 1,
      title,
      brand,
      heading: h,
      points,
      imgs,
      hasCoverBg: coverBg && coverBg !== "none",
      coverBgSnippet: coverBg?.slice(0, 80),
      hiddenFrags,
      overflow: rects.filter((r) => r.overflowY || r.overflowX),
      contrastHint,
      isCover: slide.classList.contains("cover"),
    };
  }, idx);
}

for (let i = 0; i < slideCount; i++) {
  if (i > 0) {
    await page.evaluate((target) => {
      // jump via overview logic: activate slide and reveal
      const slides = [...document.querySelectorAll(".slide")];
      slides.forEach((s) => s.classList.remove("active"));
      slides[target].classList.add("active");
    }, i);
  }
  await revealAll();
  await new Promise((r) => setTimeout(r, 350));
  // wait images
  await page.evaluate(async () => {
    const imgs = [...document.querySelectorAll(".slide.active img")];
    await Promise.all(
      imgs.map(
        (img) =>
          img.complete ||
          new Promise((res) => {
            img.onload = img.onerror = res;
          })
      )
    );
  });
  const info = await inspectSlide(i);
  const file = path.join(outDir, `slide-${String(i + 1).padStart(2, "0")}.png`);
  await page.screenshot({ path: file, fullPage: false });
  info.shot = path.basename(file);
  report.push(info);
  console.log(`captured ${i + 1}/${slideCount}: ${info.title}`);
}

// Also capture mobile viewport for a couple key slides
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
for (const i of [0, 2, 13, 16]) {
  await page.evaluate((target) => {
    const slides = [...document.querySelectorAll(".slide")];
    slides.forEach((s) => s.classList.remove("active"));
    slides[target].classList.add("active");
    slides[target].querySelectorAll(".frag").forEach((n) => n.classList.add("show"));
  }, i);
  await new Promise((r) => setTimeout(r, 400));
  const file = path.join(
    outDir,
    `mobile-${String(i + 1).padStart(2, "0")}.png`
  );
  await page.screenshot({ path: file, fullPage: false });
  console.log(`mobile shot slide ${i + 1}`);
}

fs.writeFileSync(
  path.join(__dirname, "report.json"),
  JSON.stringify(report, null, 2),
  "utf8"
);
await browser.close();
console.log("DONE", report.length);
