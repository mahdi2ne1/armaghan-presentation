import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: "new",
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
await page.goto("file:///C:/projects/armaghan-presentation/index.html", {
  waitUntil: "networkidle0",
});

// Pixel sample of cover backgrounds to see if photo is visible
async function sampleCover(selector, outName) {
  const data = await page.evaluate(async (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    // draw the element via html2canvas-like: use background image URL
    const cs = getComputedStyle(el);
    const m = cs.backgroundImage.match(/url\("([^"]+)"\)/);
    const url = m?.[1];
    if (!url) return { err: "no url", bg: cs.backgroundImage };
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    return {
      url,
      w: img.naturalWidth,
      h: img.naturalHeight,
      overlay:
        "linear-gradient present: " +
        cs.backgroundImage.includes("linear-gradient"),
    };
  }, selector);
  return data;
}

const hero = await sampleCover(".cover-bg:not(.class)", "hero");
const klass = await sampleCover(".cover-bg.class", "class");

// Navigate properly and verify counter + frags
const nav = [];
for (let i = 0; i < 17; i++) {
  const state = await page.evaluate(() => {
    const slide = document.querySelector(".slide.active");
    const counter = document.getElementById("counter").textContent;
    const frags = [...slide.querySelectorAll(".frag")];
    const shown = frags.filter((f) => f.classList.contains("show")).length;
    const levels = [
      ...new Set(frags.map((f) => +f.dataset.frag || 0)),
    ].sort((a, b) => a - b);
    return {
      title: slide.dataset.title,
      counter,
      shown,
      totalFrags: frags.length,
      levels,
      isCover: slide.classList.contains("cover"),
    };
  });
  nav.push({ step: i + 1, ...state, note: "initial frag step 0" });
  // advance through all frags then next slide
  const levels = state.levels.length || 1;
  for (let f = 0; f < levels; f++) {
    await page.click("#next");
    await new Promise((r) => setTimeout(r, 40));
  }
}

// After loop should be back near start or on last - check final
const finalCounter = await page.$eval("#counter", (el) => el.textContent);

// Test keyboard and notes
await page.keyboard.press("KeyN");
const notesOpen = await page.$eval("#notesPanel", (el) =>
  el.classList.contains("open")
);
const notesText = await page.$eval("#notesText", (el) => el.textContent);

// Check contrast on cover points (slide 15 style) - white card
const pointContrast = await page.evaluate(() => {
  // go to class slide
  const slides = [...document.querySelectorAll(".slide")];
  slides.forEach((s) => s.classList.remove("active"));
  const s = slides[14];
  s.classList.add("active");
  s.querySelectorAll(".frag").forEach((n) => n.classList.add("show"));
  const li = s.querySelector(".points li");
  const cs = getComputedStyle(li);
  return { color: cs.color, bg: cs.backgroundColor, border: cs.borderColor };
});

// Check if progress bar visible on cover
const barInfo = await page.evaluate(() => {
  const bar = document.getElementById("bar");
  const i = bar.querySelector("i");
  return {
    parentBg: getComputedStyle(bar).backgroundColor,
    fill: getComputedStyle(i).backgroundColor,
    width: i.style.width,
  };
});

fs.writeFileSync(
  path.join(__dirname, "qa.json"),
  JSON.stringify(
    { hero, klass, nav: nav.slice(0, 5), finalCounter, notesOpen, notesText, pointContrast, barInfo, allTitles: nav.map(n=>n.title) },
    null,
    2
  )
);
console.log(JSON.stringify({ hero, klass, finalCounter, notesOpen, notesText, pointContrast, barInfo, titles: nav.map(n=>`${n.step}:${n.title}:${n.counter}`) }, null, 2));
await browser.close();
