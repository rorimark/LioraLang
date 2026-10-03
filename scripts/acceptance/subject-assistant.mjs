// Deterministic browser acceptance for subject suggestions. All Supabase
// traffic is intercepted: no real account, API call or allowance is used.
// Run with NODE_PATH pointing to Playwright and PLAYWRIGHT_CHROMIUM if needed.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { Buffer } from "node:buffer";
const PORT = Number(process.env.ACCEPTANCE_PORT || 4188);
const BASE = `http://127.0.0.1:${PORT}`;
const loadPlaywright = () => {
 const require = createRequire(import.meta.url);
 for (const place of [undefined, ...String(process.env.NODE_PATH || "").split(path.delimiter).filter(Boolean)]) {
  try { return require(place ? require.resolve("playwright", { paths: [place] }) : "playwright"); } catch { /* next location */ }
 }
 throw new Error("Install Playwright and set NODE_PATH to its module directory.");
};
const main = async () => {
 const { chromium } = loadPlaywright();
 const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--mode", "web", "--host", "127.0.0.1", "--port", String(PORT), "--strictPort"], {
   stdio: "ignore", env: { ...process.env, VITE_SUPABASE_URL: "https://liora-acceptance.supabase.co", VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY: "acceptance-public-key" },
 });
 let browser;
 try {
   for (let attempt = 0; attempt < 80; attempt++) {
     try { if ((await fetch(BASE)).ok) break; } catch { /* starting */ }
     await new Promise((resolve) => setTimeout(resolve, 100));
   }

 browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {});
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 const user={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'acceptance@example.test',email_confirmed_at:'2026-01-01T00:00:00Z',app_metadata:{provider:'email',providers:['email']},user_metadata:{},identities:[]};
 const jwt=[{alg:'HS256',typ:'JWT'},{sub:user.id,aud:'authenticated',role:'authenticated',exp:Math.floor(Date.now()/1000)+3600},'test'].map(v=>Buffer.from(typeof v==='string'?v:JSON.stringify(v)).toString('base64url')).join('.');
 await context.addInitScript(({user,jwt})=>localStorage.setItem('sb-liora-acceptance-auth-token',JSON.stringify({access_token:jwt,refresh_token:'test-refresh',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user})),{user,jwt});
 let asks=0;let mode='success';let release;
 const cards=[{source:'Closure?',target:'A function that retains access to its lexical scope.',subjectFields:{code:'const make = x => () => x;\nconst read = make(3);',codeSide:'back',difficulty:'medium'},examples:['The inner function can read x after make returns.'],tags:['scope']},{source:'Closure?',target:'A function together with its lexical environment.',subjectFields:{difficulty:'easy'},examples:[],tags:['functions']}];
 await context.route('https://liora-acceptance.supabase.co/**',async route=>{
 const url=route.request().url();
 if(url.includes('/functions/v1/suggest-word')){
  const body=route.request().postDataJSON();assert.equal(body.task,'concept');assert.equal(body.writeIn,'Polish');asks++;
  if(mode==='late')await new Promise(r=>release=r);
  if(mode==='quota')return route.fulfill({status:429,json:{error:'quota'}});
  return route.fulfill({json:{result:{cards: cards.map((card) => ({ ...card, source: body.source }))}}});
 }
 if(url.includes('/auth/v1/user'))return route.fulfill({json:user});
 if(url.includes('word_suggestion_allowance'))return route.fulfill({json:[{allowance:300,used:0,remaining:300}]});
 return route.fulfill({json:[]});
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${BASE}/app/decks/new?subject=programming`);
 await page.getByRole('combobox',{name:'Answer language',exact:true}).click();await page.getByRole('option',{name:'Polish',exact:true}).click();
 await page.locator('input[name=name]').fill('AI acceptance');await page.locator('input[name=technology]').fill('JavaScript');await page.locator('input[name=source]').fill('Closure?');
 await page.getByRole('button',{name:'Suggest a card',exact:true}).waitFor();
 assert.equal(asks,0);await page.getByRole('button',{name:'Suggest a card',exact:true}).click();
 await page.getByText('Suggestions ready',{exact:true}).waitFor();assert.equal(await page.locator('.concept-suggestion__cards > li').count(),2);assert.equal(await page.locator('textarea[name=target]').inputValue(),'');
 await page.locator('.concept-suggestion__cards').scrollIntoViewIfNeeded();if (process.env.ACCEPTANCE_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.ACCEPTANCE_SCREENSHOTS, "subject-ai-desktop.png") });
 await page.setViewportSize({width:390,height:844});await page.locator('.concept-suggestion__cards > li').first().scrollIntoViewIfNeeded();if (process.env.ACCEPTANCE_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.ACCEPTANCE_SCREENSHOTS, "subject-ai-mobile.png") });assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.getByRole('button',{name:'Fill empty fields',exact:true}).first().click();assert.equal(await page.locator('textarea[name=target]').inputValue(),cards[0].target);assert.equal(await page.locator('textarea[name=code]').inputValue(),cards[0].subjectFields.code);assert(await page.getByRole('radio',{name:'With answer'}).isChecked());
 await page.getByRole('button',{name:'Add card',exact:true}).click();await page.getByRole('button',{name:'Create deck',exact:true}).first().click();await page.waitForURL(/\/decks\/\d+\/edit/);
 await page.setViewportSize({width:1280,height:900});
 await page.locator('input[name=source]').fill('Closure?');mode='late';await page.getByRole('button',{name:'Suggest a card',exact:true}).click();await page.getByText('Thinking…',{exact:true}).first().waitFor();await page.locator('input[name=source]').fill('Promise?');while(!release)await new Promise(r=>setTimeout(r,10));release();await page.waitForTimeout(150);assert.equal(await page.locator('.concept-suggestion__cards').count(),0);assert.equal(await page.locator('textarea[name=target]').inputValue(),'');
 mode='quota';await page.getByRole('button',{name:'Suggest a card',exact:true}).click();await page.getByText('Daily AI limit reached. You can still write cards yourself.').waitFor();
 await page.locator('textarea[name=target]').fill('My answer');await page.getByRole('button',{name:'Add card',exact:true}).click();
 await page.goto(`${BASE}/app/learn`);await page.locator('.flashcard').waitFor();assert.equal(await page.locator('.flashcard__face--front .flashcard__code').count(),0);const before=asks;await page.keyboard.press('Space');await page.waitForTimeout(600);assert.equal(asks,before);assert.deepEqual(errors,[]);
 mode='success';
 await page.getByRole('button',{name:'Add card',exact:true}).click();
 const dialog=page.getByRole('dialog');
 await dialog.locator('input[name=source]').fill('Scopes?');
 await dialog.locator('textarea[name=target]').fill('My own answer');
 await dialog.getByRole('button',{name:'Suggest a card',exact:true}).click();
 await dialog.getByText('Suggestions ready',{exact:true}).waitFor();
 await dialog.getByRole('button',{name:'Fill empty fields',exact:true}).first().click();
 assert.equal(await dialog.locator('textarea[name=target]').inputValue(),'My own answer');
 assert.equal(await dialog.locator('textarea[name=code]').inputValue(),cards[0].subjectFields.code);
 await dialog.getByRole('button',{name:'Add card',exact:true}).click();
 await page.waitForFunction(() => document.querySelector('[role=dialog] input[name=source]')?.value === '');
 await dialog.getByRole('button',{name:'Close dialog',exact:true}).click();
 await page.goto(`${BASE}/app/decks`);
 await page.getByText('AI acceptance',{exact:true}).first().click();
 await page.getByRole('button',{name:/Edit deck/}).click();
 await page.locator('.deck-word__open').filter({hasText:'Scopes?'}).click();
 assert.equal(await page.locator('.deck-word-editor textarea[name=target]').inputValue(),'My own answer');
 assert.equal(await page.locator('.deck-word-editor textarea[name=code]').inputValue(),cards[0].subjectFields.code);
 assert(await page.locator('.deck-word-editor').getByRole('radio',{name:'With answer'}).isChecked());
 // New deck from Learn: the catalog selects the form, language and AI context.
 await page.goto(`${BASE}/app/learn`);
 await page.getByRole('button',{name:'Add card',exact:true}).click();
 await dialog.getByRole('combobox',{name:'Deck',exact:true}).click();
 await page.getByRole('option',{name:'New deck…',exact:true}).click();
 await dialog.getByRole('combobox',{name:'Subject',exact:true}).click();
 await page.getByRole('option',{name:'Programming',exact:true}).click();
 await dialog.locator('input[name=name]').fill('Quick JS');
 await dialog.locator('input[name=technology]').fill('JavaScript');
 await dialog.getByRole('combobox',{name:'Answer language',exact:true}).click();
 await page.getByRole('option',{name:'Polish',exact:true}).click();
 assert.equal(await dialog.locator('input[name=sourceLanguage]').count(),0);
 if (process.env.ACCEPTANCE_SCREENSHOTS) await page.screenshot({path:path.join(process.env.ACCEPTANCE_SCREENSHOTS,'quick-subject-desktop.png')});
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(() => getComputedStyle(document.querySelector('.quick-add__sheet')).opacity === '1');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 if (process.env.ACCEPTANCE_SCREENSHOTS) await page.screenshot({path:path.join(process.env.ACCEPTANCE_SCREENSHOTS,'quick-subject-mobile.png')});
 await page.setViewportSize({width:1280,height:900});
 await dialog.locator('input[name=source]').fill('Closure?');
 await dialog.getByRole('button',{name:'Suggest a card',exact:true}).click();
 await dialog.getByText('Suggestions ready',{exact:true}).waitFor();
 await dialog.getByRole('button',{name:'Fill empty fields',exact:true}).first().click();
 await dialog.getByRole('button',{name:'Add card',exact:true}).click();
 await page.waitForFunction(() => document.querySelector('[role=dialog] input[name=source]')?.value === '');
 await dialog.getByRole('button',{name:'Close dialog',exact:true}).click();
 await page.goto(`${BASE}/app/decks`);
 await page.getByText('Quick JS',{exact:true}).first().click();
 await page.getByRole('button',{name:/Edit deck/}).click();
 assert.equal(await page.locator('input[name=contentLanguage]').inputValue(),'Polish');
 assert(await page.getByText('Programming',{exact:true}).isVisible());
 await page.locator('.deck-word__open').filter({hasText:'Closure?'}).click();
 assert.equal(await page.locator('.deck-word-editor textarea[name=code]').inputValue(),cards[0].subjectFields.code);
 // Per-function preferences persist and gate the actual controls independently.
 const quickEditorUrl = page.url();
 await page.goto(`${BASE}/app/settings?tab=assistant`);
 await page.getByRole('switch',{name:'Subject card suggestions',exact:true}).uncheck();
 await page.getByRole('switch',{name:'Word suggestions while typing',exact:true}).uncheck();
 await page.getByRole('switch',{name:'Complete a word list',exact:true}).uncheck();
 await page.getByText('3 / 6 functions on',{exact:true}).waitFor();
 await page.reload();
 assert.equal(await page.getByRole('switch',{name:'Subject card suggestions',exact:true}).isChecked(),false);
 assert.equal(await page.getByRole('switch',{name:'Word suggestions while typing',exact:true}).isChecked(),false);
 assert.equal(await page.getByRole('switch',{name:'Collect words by topic',exact:true}).isChecked(),true);
 assert.equal(await page.getByRole('switch',{name:'Explanations after Again',exact:true}).isChecked(),true);
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(() => document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).every(a => a.playState === 'finished'));
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 if (process.env.ACCEPTANCE_SCREENSHOTS) await page.screenshot({path:path.join(process.env.ACCEPTANCE_SCREENSHOTS,'ai-settings-mobile.png')});
 await page.setViewportSize({width:1280,height:900});
 if (process.env.ACCEPTANCE_SCREENSHOTS) await page.screenshot({path:path.join(process.env.ACCEPTANCE_SCREENSHOTS,'ai-settings-desktop.png')});
 const noAsks = asks;
 await page.goto(quickEditorUrl);
 await page.locator('input[name=source]').fill('Hoisting');
 assert.equal(await page.getByRole('button',{name:'Suggest a card',exact:true}).count(),0);
 assert.equal(asks,noAsks);
 await page.goto(`${BASE}/app/settings?tab=assistant`);
 await page.getByRole('switch',{name:'Subject card suggestions',exact:true}).check();
 await page.getByText('4 / 6 functions on',{exact:true}).waitFor();
 await page.goto(quickEditorUrl);
 await page.locator('input[name=source]').fill('Hoisting');
 await page.getByRole('button',{name:'Suggest a card',exact:true}).click();
 await page.getByText('Suggestions ready',{exact:true}).waitFor();
 assert.equal(asks,noAsks+1);
 await page.goto(`${BASE}/app/learn`);
 await page.getByRole('button',{name:'Add card',exact:true}).click();
 await dialog.getByRole('combobox',{name:'Deck',exact:true}).click();
 await page.getByRole('option',{name:'New deck…',exact:true}).click();
 await dialog.getByRole('combobox',{name:'Subject',exact:true}).click();
 await page.getByRole('option',{name:'Languages',exact:true}).click();
 await dialog.getByRole('tab',{name:'Paste a list',exact:true}).click();
 assert(await dialog.getByRole('button',{name:'Collect words',exact:true}).isVisible());
 await dialog.locator('textarea.quick-add__paste-box').fill('apple');
 await dialog.getByRole('button',{name:'Check the list',exact:true}).click();
 assert.equal(await dialog.getByRole('button',{name:'Fill in the rest',exact:true}).count(),0);
 await dialog.getByRole('button',{name:'Close dialog',exact:true}).click();
 await dialog.getByRole('button',{name:'Discard them',exact:true}).click();
 await page.goto(`${BASE}/app/settings?tab=assistant`);
 await page.getByRole('switch',{name:'Collect words by topic',exact:true}).uncheck();
 await page.getByRole('switch',{name:'Complete a word list',exact:true}).check();
 await page.getByText('4 / 6 functions on',{exact:true}).waitFor();
 await page.goto(`${BASE}/app/learn`);
 await page.getByRole('button',{name:'Add card',exact:true}).click();
 await dialog.getByRole('combobox',{name:'Deck',exact:true}).click();
 await page.getByRole('option',{name:'New deck…',exact:true}).click();
 // New dialog starts with the default language subject.
 await dialog.getByRole('tab',{name:'Paste a list',exact:true}).click();
 assert.equal(await dialog.getByRole('button',{name:'Collect words',exact:true}).count(),0);
 await dialog.locator('textarea.quick-add__paste-box').fill('apple');
 await dialog.getByRole('button',{name:'Check the list',exact:true}).click();
 assert(await dialog.getByRole('button',{name:'Fill in the rest',exact:true}).isVisible());
 assert.equal(asks,noAsks+1);
 assert.deepEqual(errors,[]);
 console.log('PASS: explicit request, review 2 candidates, fill, code side, save, stale response, quota, mobile layout, no AI from Learn, independent settings with persistence and list/topic controls');
 } finally { await browser?.close(); server.kill(); }
};
main().catch(error => { console.error(error); process.exitCode = 1; });
