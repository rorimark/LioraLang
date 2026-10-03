// Acceptance for the Programming pilot, offline and without the assistant:
// create a programming deck → save → close → reopen → learn → review, with
// the network cut after the first visit. Also checks that nothing leaves
// the machine while offline, that no assistant request is ever made, and
// that a language deck beside it still studies as a language card.
//
// Usage: pnpm build:web && node scripts/acceptance/programming-offline.mjs
// Needs Playwright with a Chromium (PLAYWRIGHT_CHROMIUM may point at one).

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";
import { setTimeout as sleep } from "node:timers/promises";

const PORT = Number(process.env.ACCEPTANCE_PORT || 4176);
const BASE = `http://127.0.0.1:${PORT}`;
const CODE = 'const users = [{ name: "Ada Lovelace" }, { name: "Linus Torvalds" }, { name: "Grace Hopper" }];\n\nusers.map(user => user.name);';

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
    stdio: "ignore",
  });

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(`${BASE}/app.html`)).ok) {
        return server;
      }
    } catch {
      // Not up yet.
    }

    await sleep(250);
  }

  server.kill();
  throw new Error("The preview server did not start; run pnpm build:web first");
};

const main = async () => {
  const { chromium } = loadPlaywright();
  const server = await startPreview();
  let browser;
  try {
    browser = await chromium.launch(
      process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {},
    );
    const context = await browser.newContext({ viewport: { width: 1280, height: 860 } });
    context.setDefaultTimeout(10000);
    const errors = [];
    context.on("page", (page) => page.on("pageerror", (error) => {
      errors.push(error.stack || error.message);
    }));
    const outside = [];
    const assistant = [];

    context.on("request", (request) => {
      const url = request.url();

      if (/suggest-word|functions\/v1/.test(url)) {
        assistant.push(url);
      }

      if (!url.startsWith(BASE) && !url.startsWith("data:") && !url.startsWith("blob:")) {
        outside.push(url);
      }
    });

    // First visit online: the service worker installs and keeps the app.
    console.log("Online first visit");
    const first = await context.newPage();
    await first.goto(`${BASE}/app/decks`);
    await first.evaluate(() => navigator.serviceWorker.ready.then(() => true));
    await first.reload();
    await first.waitForLoadState("networkidle");
    await sleep(1500);
    await first.close();

    console.log("Offline from here on");
    await context.setOffline(true);
    outside.length = 0;

    // Create and save.
    const editor = await context.newPage();
    await editor.goto(`${BASE}/app/decks`);
    await editor.getByRole("button", { name: "New deck" }).click();
    await editor.getByRole("menuitem", { name: /Programming/ }).click();
    await editor.waitForSelector("input[name=name]");
    assert(await editor.locator("input[name=subject]").inputValue() === "programming", "the menu opens a programming deck directly");
    await editor.fill("input[name=name]", "JavaScript offline");
    await editor.fill("input[name=technology]", "JavaScript");
    await editor.fill("input[name=source]", "What does this return?");
    await editor.fill("textarea[name=target]", "A new array with every user's name.\nThe original array stays unchanged.");
    await editor.fill("textarea[name=code]", CODE);
    await editor.getByRole("button", { name: /More details/ }).click();
    await choose(editor.locator(".subject-field--choice [role=combobox]"), "Medium");
    await editor.getByRole("button", { name: "Add card" }).click();
    await editor.getByRole("button", { name: /Create deck/ }).first().click();
    await editor.waitForURL(/\/app\/decks\/\d+\/edit/);
    assert(true, "a programming deck is created offline");

    // A language deck beside it, to see that it is untouched.
    await editor.goto(`${BASE}/app/decks/new`);
    await editor.waitForSelector("input[name=name]");
    await editor.fill("input[name=name]", "Food offline");
    await editor.fill("input[name=source]", "asparagus");
    await editor.fill("input[name=target]", "szparag");
    await editor.getByRole("button", { name: "Add word" }).click();
    await editor.getByRole("button", { name: /Create deck/ }).first().click();
    await editor.waitForURL(/\/app\/decks\/\d+\/edit/);

    // Close, and open the app again.
    await editor.close();
    const page = await context.newPage();
    await page.goto(`${BASE}/app/decks`);
    await page.waitForSelector("text=JavaScript offline");
    assert(await page.getByText("Programming · JavaScript").first().isVisible(), "the reopened library shows the deck by its subject");

    // Learn: the card is laid out around its code.
    await page.goto(`${BASE}/app/learn`);
    await page.waitForSelector(".flashcard");
    const deckSelect = page.locator("#learn-deck-select");
    await choose(deckSelect, "JavaScript offline");
    // Study with spaced repetition, so a grade is stored.
    await page.locator("button[aria-label='Open session settings']").click();
    await page.getByText("Spaced repetition", { exact: true }).click();
    await page.getByRole("button", { name: /Back to cards/ }).click();

    await page.waitForSelector(".flashcard--layout-code");
    const front = page.locator(".flashcard__face--front");
    assert((await front.locator(".flashcard__block-text--prompt").innerText()).includes("What does this return?"), "the question leads the front");
    assert((await front.locator(".flashcard__code-text").allTextContents()).join("") === CODE, "the code is shown as written");
    assert((await front.locator(".flashcard__meta").innerText()).includes("JavaScript"), "the technology is on the card");
    assert((await front.locator(".flashcard__meta").innerText()).includes("Medium"), "so is the difficulty");
    for (const [width, height] of [[1280, 860], [390, 844], [844, 390]]) {
      await page.setViewportSize({ width, height });
      for (const theme of ["light", "dark"]) {
        await page.evaluate((value) => document.documentElement.setAttribute("theme", value), theme);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no page overflow at ${width}px in ${theme}`);
        const linesFit = await page.locator(".flashcard__face--front .flashcard__code-text").evaluateAll((lines) => lines.every((line) => line.scrollWidth <= line.clientWidth + 1));
        assert(linesFit, `code wraps inside the card at ${width}px in ${theme}`);
        if (process.env.ACCEPTANCE_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.ACCEPTANCE_SCREENSHOTS, `programming-${width}-${theme}.png`), fullPage: true });
      }
    }
    await page.setViewportSize({ width: 1280, height: 860 });
    await page.keyboard.press("Space");
    await sleep(700);
    const back = page.locator(".flashcard__face--back");
    assert((await back.locator(".flashcard__block-text--answer").innerText()).includes("A new array"), "the answer leads the back");
    await page.getByRole("button", { name: /Good/ }).first().click();
    await sleep(800);
    const reviewed = await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const request = indexedDB.open("lioralang-web");
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const read = request.result.transaction("reviewCards").objectStore("reviewCards").getAll();
            read.onsuccess = () => resolve(read.result);
            read.onerror = () => reject(read.error);
          };
        }),
    );
    assert(reviewed.length === 1 && reviewed[0].reps >= 1, "the review is stored: one entry, one review unit");

    // Edit a saved card to move its code to the answer. Reopen to verify persistence.
    await page.goto(`${BASE}/app/decks`);
    await page.getByText("JavaScript offline", { exact: true }).first().click();
    await page.getByRole("button", { name: /Edit deck/ }).click();
    await page.locator(".deck-word__open").filter({ hasText: "What does this return?" }).click();
    await page.locator(".deck-word-editor").getByText("With answer", { exact: true }).click();
    await page.locator(".deck-word-editor").getByRole("button", { name: "Save changes" }).click();
    await page.getByText("Saved", { exact: true }).waitFor();
    await page.reload();
    await page.locator(".deck-word__open").filter({ hasText: "What does this return?" }).click();
    assert(await page.locator(".deck-word-editor input[name=codeSide][value=back]").isChecked(), "editing and reopening keeps the chosen code side");
    await page.goto(`${BASE}/app/learn`);
    await choose(page.locator("#learn-deck-select"), "JavaScript offline");
    await page.locator("button[aria-label='Open session settings']").click();
    await page.getByText("Review", { exact: true }).click();
    await page.getByRole("button", { name: /Back to cards/ }).click();
    await page.waitForSelector(".flashcard--layout-code");
    assert(await page.locator(".flashcard__face--front .flashcard__code").count() === 0, "answer code is never visible on the question");
    await page.keyboard.press("Space");
    await page.locator(".flashcard__face--back[aria-hidden=false]").waitFor();
    await page.locator(".flashcard").evaluate(async (card) => {
      await Promise.all(card.getAnimations({ subtree: true }).filter((animation) => animation.effect?.getTiming().iterations !== Infinity).map((animation) => animation.finished.catch(() => {})));
    });
    assert((await page.locator(".flashcard__face--back .flashcard__code-text").allTextContents()).join("") === CODE, "answer code reappears after revealing the card");
    assert((await page.locator(".flashcard__block-text--answer").innerText()).includes("\n"), "multiline answers keep their line breaks");

    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.locator(".flashcard__face--back .flashcard__code-text").evaluateAll((lines) => lines.every((line) => line.scrollWidth <= line.clientWidth + 1)), "answer-side code also fits a phone");
    if (process.env.ACCEPTANCE_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.ACCEPTANCE_SCREENSHOTS, "programming-answer-mobile.png"), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 860 });

    // Quick add must keep existing code and support multiline answers.
    await page.getByRole("button", { name: "Add card", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator("input[name=source]").fill("Closure");
    await dialog.locator("textarea[name=target]").fill("A function with its lexical environment.");
    await dialog.locator("textarea[name=target]").press("Enter");
    await dialog.locator("textarea[name=target]").pressSequentially("It retains access to outer variables.");
    assert((await dialog.locator("textarea[name=target]").inputValue()).includes("\n"), "Enter inserts an answer line without submitting");
    await dialog.getByRole("button", { name: "Add card", exact: true }).click();
    await dialog.locator("input[name=source]").waitFor();
    await page.waitForFunction(() => document.querySelector('[role=dialog] input[name=source]')?.value === "");
    await dialog.getByRole("button", { name: "Close dialog", exact: true }).click();
    await page.goto(`${BASE}/app/decks`);
    await page.getByText("JavaScript offline", { exact: true }).first().click();
    await page.getByRole("button", { name: /Edit deck/ }).click();
    await page.waitForFunction(() => document.querySelectorAll(".deck-word__open").length === 2);
    assert(await page.locator(".deck-word__open").count() === 2, "quick add saves a second card offline");
    await page.locator(".deck-word__open").filter({ hasText: "What does this return?" }).click();
    assert((await page.locator(".deck-word-editor textarea[name=code]").inputValue()) === CODE, "quick add preserves the existing card's code");
    assert(await page.locator(".deck-word-editor input[name=codeSide][value=back]").isChecked(), "quick add preserves the existing card's code side");
    await page.goto(`${BASE}/app/learn`);

    await choose(deckSelect, "JavaScript offline");
    await page.waitForSelector(".flashcard--layout-code");
    if (!(await page.locator(".flashcard__block-text--prompt").innerText()).includes("Closure")) {
      await page.getByRole("button", { name: "Next card", exact: true }).click();
    }
    await page.locator(".flashcard__block-text--lead").filter({ hasText: "Closure" }).waitFor();
    assert(await page.locator(".flashcard__face--front .flashcard__code").count() === 0, "a term without code uses the large heading, without an empty code pane");

    // The language deck still studies as before.
    await choose(deckSelect, "Food offline");
    await page.waitForSelector(".flashcard:not(.flashcard--layout-code)");
    assert((await page.locator(".flashcard__face--front .flashcard__text").innerText()).includes("asparagus"), "a language card is drawn as before");


    // Extend the existing language card with a picture; both texts remain.
    await page.goto(`${BASE}/app/decks`);
    await page.getByText("Food offline", { exact: true }).first().click();
    await page.getByRole("button", { name: /Edit deck/ }).click();
    await page.locator(".deck-word__open").first().click();
    const imageEditor = page.locator(".deck-word-editor");
    await imageEditor.locator("summary").filter({ hasText: "Optional picture" }).click();
    const png = await page.evaluate(() => {
      const canvas = document.createElement("canvas"); canvas.width = 120; canvas.height = 160;
      const ctx = canvas.getContext("2d"); ctx.fillStyle = "#eff9e8"; ctx.fillRect(0, 0, 120, 160);
      ctx.fillStyle = "#3b8e39"; ctx.fillRect(35, 25, 12, 115); ctx.fillRect(58, 15, 12, 125); ctx.fillRect(80, 30, 12, 110);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    await imageEditor.locator("input[type=file]").setInputFiles({ name: "vegetable.png", mimeType: "image/png", buffer: Buffer.from(png, "base64") });
    await imageEditor.getByRole("button", { name: "Remove", exact: true }).waitFor();
    await imageEditor.getByRole("button", { name: "Save changes", exact: true }).click();
    await page.getByText("Saved", { exact: true }).first().waitFor();
    await page.reload();
    await page.locator(".deck-word__open").first().click();
    assert(await page.locator(".deck-word-editor .word-image-field__preview img").count() === 1, "optional image survives editing and reopening offline");
    assert(await page.locator(".deck-word-editor input[name=source]").inputValue() === "asparagus", "adding a picture preserves the word");
    await page.goto(`${BASE}/app/learn`);
    await choose(page.locator("#learn-deck-select"), "Food offline");
    await page.locator("button[aria-label='Open session settings']").click();
    await choose(page.getByRole("combobox", { name: "Study presentation" }), "Picture → word");
    await page.getByRole("button", { name: /Back to cards/ }).click();
    await page.locator(".flashcard__face--front img").waitFor();
    assert(await page.locator(".flashcard__face--front img").evaluate((img) => img.complete && img.naturalWidth > 0), "picture loads from local storage without a network");
    await page.keyboard.press("Space");
    await page.locator(".flashcard__face--back[aria-hidden=false]").waitFor();
    assert((await page.locator(".flashcard__face--back .flashcard__text").innerText()).includes("asparagus"), "image recall asks for the learned word");
    await page.locator("button[aria-label='Open session settings']").click();
    await choose(page.getByRole("combobox", { name: "Study presentation" }), "Text → translation");
    await page.getByRole("button", { name: /Back to cards/ }).click();
    assert((await page.locator(".flashcard__face--front .flashcard__text").innerText()).includes("asparagus"), "switching back restores the original text presentation");
    assert((await page.locator(".flashcard__face--back .flashcard__text").innerText()).includes("szparag"), "the translation is still there");

    assert(errors.length === 0, `no application errors${errors.length ? `: ${errors.join("\n")}` : ""}`);
    assert(assistant.length === 0, "no assistant request was made");
    assert(outside.length === 0, `nothing left the machine while offline${outside.length ? `: ${outside.join(", ")}` : ""}`);
    console.log("Programming offline acceptance passed.");
  } catch (error) {
    for (const context of browser?.contexts() || []) {
      for (const page of context.pages()) {
        console.error("Failed page:", page.url(), (await page.locator("body").innerText()).slice(-1800));
        await page.screenshot({ path: "/tmp/liora-offline-failure.png", fullPage: true });
      }
    }
    throw error;
  } finally {
    await browser?.close();
    server.kill();
  }
};

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
