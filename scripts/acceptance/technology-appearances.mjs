// Offline acceptance for subject-specific forms, formulas, history and quick creation.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = Number(process.env.ACCEPTANCE_PORT || 4193);
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
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const [technology, skin, codeLabel, answerLabel, code] of [
      ["PostgreSQL 17", "query", "SQL query", "Result or explanation", "SELECT name\nFROM users\nWHERE active = true;"],
      ["CSS", "stylesheet", "CSS rules", "Visual effect or explanation", ".card {\n  display: grid;\n  gap: 1rem;\n}"],
      ["PHP 8.3", "server", "PHP snippet", "Output or explanation", "<?php\n$items = [1, 2, 3];\necho count($items);"],
      ["JS", "javascript", "JavaScript code", "Output or explanation", "const names = users.map(user => user.name);"],
      ["Rust", "rust", "Rust code", "Output or explanation", 'let values = vec![1, 2, 3];\nprintln!("{}", values.len());'],
      ["Java", "java", "Java code", "Output or explanation", "int[] values = {1, 2, 3};\nSystem.out.println(values.length);"],
      ["C++20", "cpp", "C++ code", "Output or explanation", 'std::vector<int> values{1, 2, 3};\nstd::cout << values.size();'],
      ["C", "c", "C code", "Output or explanation", 'int values[] = {1, 2, 3};\nprintf("%zu", sizeof(values) / sizeof(values[0]));'],
      ["C#", "csharp", "C# code", "Output or explanation", "int[] values = {1, 2, 3};\nConsole.WriteLine(values.Length);"],
      ["Python", "", "Code", "Answer", "print(len([1, 2, 3]))"],
    ]) {
      const name = `Workspace ${technology}`;
      await page.goto(`${BASE}/app/decks/new`);
      await choose(page.getByRole("combobox", { name: "Subject", exact: true }), "Programming");
      await page.locator("input[name=name]").fill(name);
      await page.locator("input[name=technology]").fill(technology);
      await page.locator("input[name=source]").fill("Explain this snippet");
      await page.locator("textarea[name=target]").fill("Explanation of the snippet.");
      await page.getByText(codeLabel, { exact: true }).first().waitFor();
      await page.getByText(answerLabel, { exact: true }).first().waitFor();
      await page.locator("textarea[name=code]").fill(code);
      await page.getByRole("button", { name: "Add card", exact: true }).click();
      await page.getByRole("button", { name: /Create deck/ }).first().click();
      await page.waitForURL(/\/app\/decks\/\d+\/edit/);
      await page.goto(`${BASE}/app/learn`);
      await choose(page.locator("#learn-deck-select"), name);
      const card = page.locator(".flashcard--layout-code");
      await card.waitFor();
      await page.waitForFunction(value => document.querySelector(".flashcard__meta-item--technology")?.textContent.trim() === value, technology);
      await page.locator(".flashcard:not([disabled])").waitFor();
      assert(skin ? await card.evaluate((element, value) => element.classList.contains(`flashcard--skin-${value}`), skin)
        : !/flashcard--skin-/.test(await card.getAttribute("class")), `${technology} gets the catalog appearance or generic fallback`);
      assert((await card.locator(".flashcard__face--front").innerText()).includes(code.split("\n")[0]), `${technology} code is on the requested side`);
      assert(!(await card.locator(".flashcard__face--front").innerText()).includes("Explanation of the snippet."), `${technology} answer stays hidden`);
      for (const width of [1280, 390]) {
        await page.setViewportSize({ width, height: 860 });
        for (const theme of ["light", "dark"]) {
          await page.evaluate(value => document.documentElement.setAttribute("theme", value), theme);
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${technology} fits ${width}px in ${theme}`);
          await page.evaluate(async () => {
            await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
          });
          if (process.env.ACCEPTANCE_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.ACCEPTANCE_SCREENSHOTS, `${skin || "generic"}-${width}-${theme}.png`) });
        }
      }
      await card.click();
      await card.locator('.flashcard__face--back[aria-hidden="false"]').waitFor();
      assert((await card.locator(".flashcard__face--back").innerText()).includes("Explanation of the snippet."), `${technology} reveals the answer`);
      await page.setViewportSize({width:1280,height:860});
    }
    assert(!errors.length, `no page errors: ${errors.join(", ")}`);
    console.log("Technology appearance acceptance passed.");
  } finally { await browser?.close(); server.kill(); }
};
main().catch(error => { console.error(error); process.exitCode = 1; });
