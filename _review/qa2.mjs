import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: "new",
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
await page.goto("http://127.0.0.1:9026/index.html", { waitUntil: "networkidle0" });

const stats = await page.evaluate(async () => {
  async function avg(url) {
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    const c = document.createElement("canvas");
    c.width = 80;
    c.height = 45;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0, 80, 45);
    const d = ctx.getImageData(0, 0, 80, 45).data;
    let s = 0,
      n = 0,
      variance = 0;
    const vals = [];
    for (let i = 0; i < d.length; i += 4) {
      const v = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      vals.push(v);
      s += v;
      n++;
    }
    const mean = s / n;
    for (const v of vals) variance += (v - mean) ** 2;
    return {
      url,
      avg: Math.round(mean),
      stdev: Math.round(Math.sqrt(variance / n)),
      w: img.naturalWidth,
      h: img.naturalHeight,
    };
  }
  const files = [
    "ab-hero.jpg",
    "ab-class.jpg",
    "ab-forward-head.jpg",
    "ab-uneven.jpg",
    "ab-knees.jpg",
  ];
  const out = {};
  for (const f of files) out[f] = await avg("assets/" + f);
  return out;
});

const counts = [];
for (let i = 0; i < 17; i++) {
  counts.push(await page.$eval("#counter", (el) => el.textContent));
  const levels = await page.evaluate(() => {
    const s = document.querySelector(".slide.active");
    const fr = [...s.querySelectorAll(".frag")];
    return [...new Set(fr.map((n) => +n.dataset.frag || 0))].length || 1;
  });
  for (let k = 0; k < levels; k++) {
    await page.click("#next");
    await new Promise((r) => setTimeout(r, 25));
  }
}

console.log(JSON.stringify({ stats, counts }, null, 2));
await browser.close();
