// Offline acceptance for subject-specific forms, formulas, history and quick creation.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";
import { verifyLearnSelector } from "./learn-selector.mjs";

const PORT = Number(process.env.ACCEPTANCE_PORT || 4191);
const BASE = `http://127.0.0.1:${PORT}`;

// Playwright is not a dependency of the app: it is found in the project
// or in a folder named by NODE_PATH (a global install).
const loadPlaywright = () => {
  const require = createRequire(import.meta.url);
  const places = [undefined, ...String(process.env.NODE_PATH || "").split(path.delimiter).filter(Boolean)];

  for (const place of places) {
    try {
      return require(place ? require.resolve("playwright", { paths: [place] }) : "playwright");
    } catch {
      // Not here.
    }
  }

  throw new Error("Playwright is not installed: npm i -g playwright, then run with NODE_PATH=$(npm root -g)");
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`Failed: ${message}`);
  }

  console.log(`  ok  ${message}`);
};

// The app's select is a button with a list of options.
const choose = async (trigger, optionText) => {
  await trigger.click();
  await trigger.page().getByRole("option", { name: optionText }).first().click();
};

const startPreview = async () => {
  const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  let serverError = "";
  server.stderr.on("data", data => { serverError += data.toString(); });
  server.stdout.on("data", data => { serverError += data.toString(); });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${BASE}/app.html`);
      if (response.ok) {
        return server;
      }
    } catch (error) {
      if (attempt === 10) serverError += ` ${error.message}: ${error.cause?.message || ""}`;
    }

    await sleep(250);
  }

  server.kill();
  throw new Error(`The preview server did not start: ${serverError}`);
};

const main = async () => {
  const { chromium } = loadPlaywright();
  const server = await startPreview();
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM });
    const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    context.setDefaultTimeout(15000);
    const errors = [], assistant = [], outside = [], failed = [];
    context.on("page", page => page.on("pageerror", e => errors.push(e.message)));
    context.on("request", request => {
      if (/suggest-word|functions\/v1/.test(request.url())) assistant.push(request.url());
      if (!request.url().startsWith(BASE) && !/^(data|blob):/.test(request.url())) outside.push(request.url());
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/app/decks`);
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await page.reload();
    await page.waitForLoadState("networkidle");
    await sleep(1500);
    await context.setOffline(true);
    outside.length = 0;
    context.on("requestfailed", request => { if (new URL(request.url()).pathname.startsWith("/assets/")) failed.push(request.url()); });
    for (const [subject, name, question, answer, mainField, mainValue, extraField, extraValue] of [
      ["Mathematics", "Algebra offline", "Solve $ax^2+bx+c=0$", "The roots of $ax^2+bx+c=0$", "formula", String.raw`x=\frac{-b\pm\sqrt{b^2-4ac}}{2a}`, "steps", "1. Compute $b^2-4ac$\n2. Substitute the coefficients\n3. Evaluate both roots"],
      ["History", "France offline", "When did the French Revolution begin?", "In 1789", "context", "France faced a political and economic crisis.", "consequences", "1. End of absolute monarchy\n2. A republic was proclaimed"],
    ]) {
      await page.goto(`${BASE}/app/decks/new`);
      await choose(page.getByRole("combobox", { name: "Subject", exact: true }), subject);
      await page.locator("input[name=name]").fill(name);
      await page.locator("input[name=source]").fill(question);
      await page.locator("textarea[name=target]").fill(answer);
      await page.locator(`textarea[name=${mainField}]`).fill(mainValue);
      if (subject === "Mathematics") {
        await page.locator(".subject-field__formula-preview .katex").waitFor();
        assert(await page.locator('input[name=formulaSide][value=back]').isChecked(), "math formula defaults to the answer");
      } else await page.locator("input[name=date]").fill("1789");
      await page.getByRole("button", { name: /More details/ }).click();
      await page.locator(`textarea[name=${extraField}]`).fill(extraValue);
      await page.getByRole("button", { name: "Add card", exact: true }).click();
      await page.getByRole("button", { name: /Create deck/ }).first().click();
      await page.waitForURL(/\/app\/decks\/\d+\/edit/);
      const editorUrl = page.url();
      await page.reload();
      await page.locator(".deck-word__open").first().click();
      assert(await page.locator(`.deck-word-editor textarea[name=${mainField}]`).inputValue() === mainValue, `${subject} fields survive reopening`);
      await page.goto(`${BASE}/app/learn`);
      await choose(page.locator("#learn-deck-select"), name);
      await page.keyboard.press("Escape");
      await verifyLearnSelector(page, name);
      const layout = subject === "Mathematics" ? "mathematics" : "history";
      await page.locator(`.flashcard--layout-${layout}`).waitFor();
      const front = page.locator(".flashcard__face--front");
      if (subject === "Mathematics") await front.locator(".math-formula--inline .katex").waitFor();
      assert((await front.innerText()).includes(question.split("$")[0]), `${subject} question is on the front`);
      assert(await front.locator(".flashcard__formula,.flashcard__callout,.flashcard__sequence").count() === 0, `${subject} answer details stay off the front`);
      if (process.env.ACCEPTANCE_SCREENSHOTS) await page.screenshot({path:path.join(process.env.ACCEPTANCE_SCREENSHOTS, `${layout}-front.png`)});
      await page.locator(".flashcard").click();
      await page.locator(".flashcard__face--back[aria-hidden=false]").waitFor();
      if (subject === "Mathematics") {
        await page.locator(".flashcard__formula .katex").waitFor();
        await page.locator(".flashcard__block-text--answer .math-formula--inline .katex").waitFor();
        await page.locator(".flashcard__sequence .math-formula--inline .katex").waitFor();
        assert(true, "math in questions, answers and solution steps renders offline");
        assert(await page.evaluate(() => document.fonts.ready.then(() => document.fonts.check("16px KaTeX_Main"))), "mathematical fonts load offline");
      }
      else assert((await page.locator(".flashcard__callout").innerText()).includes("1789"), "date is stamped on the history answer");
      assert(await page.locator(".flashcard__sequence-item").count() > 1, `${subject} steps are rendered as a sequence`);
      for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 860 });
        for (const theme of ["light", "dark"]) {
          await page.evaluate(value => document.documentElement.setAttribute("theme", value), theme);
          await page.locator(".flashcard").evaluate(async card => {
            await Promise.all(card.getAnimations({subtree:true}).filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})));
          });
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${subject} fits ${width}px in ${theme}`);
          if (process.env.ACCEPTANCE_SCREENSHOTS) await page.screenshot({path:path.join(process.env.ACCEPTANCE_SCREENSHOTS, `${layout}-${width}-${theme}.png`),fullPage:true});
        }
      }
      await page.setViewportSize({width:1280,height:860});
      await page.goto(editorUrl);
      await page.locator(".deck-word__open").first().click();
      if (subject === "Mathematics") {
        await page.locator(".deck-word-editor textarea[name=formula]").fill(String.raw`\frac{a`);
        await page.getByText("Check the formula syntax. The original text is shown.",{exact:true}).waitFor();
        assert(true, "invalid math syntax remains editable as source text");
      }
    }
    // New subject selection and fields also work in quick creation on Learn.
    await page.goto(`${BASE}/app/learn`);
    await page.getByRole("button",{name:"Add card",exact:true}).click();
    const dialog = page.getByRole("dialog");
    await choose(dialog.getByRole("combobox",{name:"Deck",exact:true}),"New deck…");
    await choose(dialog.getByRole("combobox",{name:"Subject",exact:true}),"Mathematics");
    await dialog.locator("input[name=name]").fill("Quick algebra");
    await dialog.locator("input[name=source]").fill("Area of a circle");
    await dialog.locator("textarea[name=target]").fill("πr²");
    await dialog.locator("textarea[name=formula]").fill(String.raw`A=\pi r^2`);
    await dialog.getByRole("button",{name:"Add card",exact:true}).click();
    await page.waitForFunction(() => document.querySelector('[role=dialog] input[name=source]')?.value === "");
    await dialog.getByRole("button",{name:"Close dialog",exact:true}).click();
    await choose(page.locator("#learn-deck-select"),"Quick algebra");
    await page.locator(".flashcard--layout-mathematics").waitFor();
    assert(true,"quick creation produces a mathematics deck offline");
    assert(!errors.length,`no page errors: ${errors.join(",")}`);
    assert(!failed.length,`all offline assets load, including math fonts: ${failed.join(",")}`);
    assert(!assistant.length,"no AI calls are needed");
    assert(!outside.length,"nothing leaves the machine offline");
    console.log("Knowledge offline acceptance passed.");
  } finally { await browser?.close(); server.kill(); }
};
main().catch(error => { console.error(error); process.exitCode = 1; });
