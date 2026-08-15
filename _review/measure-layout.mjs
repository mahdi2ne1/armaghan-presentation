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

async function measure(idx) {
  return page.evaluate((i) => {
    const slides = [...document.querySelectorAll(".slide")];
    slides.forEach((s) => s.classList.remove("active"));
    const slide = slides[i];
    slide.classList.add("active");
    slide.querySelectorAll(".frag").forEach((n) => n.classList.add("show"));
    const layout = slide.querySelector(".layout");
    const photo = slide.querySelector(".photo");
    const img = slide.querySelector(".photo img");
    const text = layout?.children[0];
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        height: Math.round(r.height),
        width: Math.round(r.width),
        alignSelf: cs.alignSelf,
        heightCss: cs.height,
        transform: cs.transform,
      };
    };
    return {
      title: slide.dataset.title,
      className: slide.className,
      slide: box(slide),
      layout: box(layout),
      photo: box(photo),
      text: box(text),
      imgNatural: img ? `${img.naturalWidth}x${img.naturalHeight}` : null,
      layoutAlign: layout ? getComputedStyle(layout).alignItems : null,
    };
  }, idx);
}

const results = {
  forwardHead: await measure(2),
  knees: await measure(7),
  bow: await measure(8),
};
console.log(JSON.stringify(results, null, 2));
await browser.close();
