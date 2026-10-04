// Browser regression checks: text must use the available strip width, and
// keyboard selection must not also trigger a study shortcut.
export const verifyLearnSelector = async (page, name) => {
  const original = page.viewportSize();
  const selector = page.locator("#learn-deck-select");
  for (const width of [390, 768, 1280, 1600]) {
    await page.setViewportSize({ width, height: 860 });
    const size = await selector.locator(".ui-select__value").evaluate(node => ({
      visible: node.clientWidth, needed: node.scrollWidth,
    }));
    if (size.visible < size.needed) throw new Error(`Deck name ${name} is truncated despite available space at ${width}px: ${JSON.stringify(size)}`);
    if (!await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) throw new Error(`Selector overflows at ${width}px`);
  }
  await page.setViewportSize(original);
  const card = page.locator(".flashcard");
  const wasFlipped = await card.getAttribute("aria-pressed");
  await selector.focus();
  await page.keyboard.press("Space");
  await page.getByRole("listbox").waitFor();
  if (await card.getAttribute("aria-pressed") !== wasFlipped) throw new Error("Opening deck selection also flipped the card");
  await page.keyboard.press("Escape");
  await card.focus();
  await page.keyboard.press("Space");
  if (await card.getAttribute("aria-pressed") === wasFlipped) throw new Error("Focused card did not flip exactly once");
  await page.keyboard.press("Space");
  if (await card.getAttribute("aria-pressed") !== wasFlipped) throw new Error("Focused card did not return to the original side");
  await selector.evaluate(node => node.blur());
  console.log(`  ok  ${name}: selector width and keyboard ownership at four screen sizes`);
};
