import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: "new",
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
await page.goto("file:///C:/projects/armaghan-presentation/index.html", {
  waitUntil: "networkidle0",
});

const targets = [8, 7];
for (const idx of targets) {
  await page.evaluate((i) => {
    const slides = [...document.querySelectorAll(".slide")];
    slides.forEach((s) => s.classList.remove("active"));
    slides[i].classList.add("active");
    slides[i].querySelectorAll(".frag").forEach((n) => n.classList.add("show"));
  }, idx);
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: `shots/check-${idx + 1}.png` });
}

const info = await page.$$eval(".slide img", (imgs) =>
  imgs.map((i) => ({
    src: i.getAttribute("src"),
    natural: `${i.naturalWidth}x${i.naturalHeight}`,
    box: `${i.clientWidth}x${i.clientHeight}`,
  }))
);
console.log(JSON.stringify(info, null, 2));
await browser.close();
