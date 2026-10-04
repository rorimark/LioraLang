// Deterministic browser acceptance for subject deck generation. All Supabase
// traffic is intercepted: no real account, API call or allowance is used.
// Run with NODE_PATH pointing to Playwright and PLAYWRIGHT_CHROMIUM if needed.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { Buffer } from "node:buffer";
const PORT = Number(process.env.ACCEPTANCE_PORT || 4194);
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

 let asks=0, mode='success', release;
 const requests=[];
 const fixtures={
 programming:{name:'Rust essentials',description:'Ownership and borrowing.',deckTags:['rust'],cards:[
 {source:'What is ownership?',target:'Each value has one owner.',subjectFields:{code:'let value = String::from("hello");\nlet moved = value;',codeSide:'back',difficulty:'medium'},examples:['Moving transfers ownership.'],tags:['ownership']},
 {source:'What is borrowing?',target:'Access through a reference.',subjectFields:{code:'let reference = &value;',codeSide:'front',difficulty:'easy'},examples:[],tags:['borrowing']},
 {source:'What does drop do?',target:'Releases the value and its resources.',subjectFields:{difficulty:'easy'},examples:[],tags:['memory']} ]},
 mathematics:{name:'Quadratic equations',description:'Solving quadratics.',deckTags:['algebra'],cards:[
 {source:'Solve $x^2=4$',target:'$x=\\pm 2$',subjectFields:{formula:'x=\\pm 2',formulaSide:'back',steps:'1. Take the square root.\n2. Include both signs.',difficulty:'easy'},examples:['Both roots satisfy $x^2=4$.'],tags:['roots']},
 {source:'What is the discriminant?',target:'$b^2-4ac$',subjectFields:{formula:'b^2-4ac',formulaSide:'back'},examples:[],tags:[]},
 {source:'What does a positive discriminant mean?',target:'Two real roots.',subjectFields:{difficulty:'easy'},examples:[],tags:[]} ]},
 history:{name:'Ancient Rome',description:'People and events.',deckTags:['rome'],cards:[
 {source:'When was Augustus made emperor?',target:'27 BCE.',subjectFields:{date:'27 BCE',context:'Roman Empire',difficulty:'easy'},examples:['Augustus was the first Roman emperor.'],tags:['augustus']},
 {source:'Which river flows through Rome?',target:'The Tiber.',subjectFields:{context:'Geography'},examples:[],tags:[]},
 {source:'What was the Roman senate?',target:'A governing council.',subjectFields:{context:'Roman politics'},examples:[],tags:[]} ]}
 };
 await context.route('https://liora-acceptance.supabase.co/**',async route=>{
 const url=route.request().url();
 if(url.includes('/functions/v1/suggest-word')){
   const body=route.request().postDataJSON();requests.push(body);asks++;
   if(body.task==='topic')return route.fulfill({json:{result:{name:'Travel words',description:'Travel vocabulary.',deckTags:['travel'],cards:[{source:'ticket',target:'bilet',examples:['I bought a ticket.'],tags:['travel'],level:'A1',part_of_speech:'noun'}]}}});
   assert.equal(body.task,'concept-topic');assert.equal(body.writeIn,'Polish');assert.equal(body.deckFields.contentLanguage,'Polish');
   assert([5,10,20].includes(body.count));assert(!('level' in body));
   if(mode==='late')await new Promise(r=>release=r);
   if(mode==='quota')return route.fulfill({status:429,json:{error:'quota'}});
   return route.fulfill({json:{result:fixtures[body.subject]}});
 }
 if(url.includes('/auth/v1/user'))return route.fulfill({json:user});
 if(url.includes('word_suggestion_allowance'))return route.fulfill({json:[{allowance:300,used:0,remaining:300}]});
 return route.fulfill({json:[]});
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const choose=async (scope,label,value)=>{await scope.getByRole('combobox',{name:label,exact:true}).click();await page.getByRole('option',{name:value,exact:true}).click();};
 const dialog=page.getByRole('dialog');
 const open=async (subject,name)=>{
  await page.goto(`${BASE}/app/decks`);
  await page.getByRole('button',{name:'New deck',exact:true}).click();
  await page.getByRole('menuitem',{name:/Collect a deck with AI/}).click();
  await dialog.getByRole('heading',{name:'Generate a deck',exact:true}).waitFor();
  assert.equal(await dialog.getByRole('combobox',{name:'Deck',exact:true}).count(),0);
  assert.equal(await dialog.getByRole('tab').count(),0);
  await choose(dialog,'Subject',name);
  await choose(dialog,'Answer language','Polish');
  if(subject==='programming')await dialog.locator('input[name=technology]').fill('Rust');
  await dialog.getByLabel('Topic',{exact:true}).fill(subject==='programming'?'Rust ownership':subject==='mathematics'?'Quadratic equations':'Ancient Rome');
 };
 for(const [subject,name] of [['programming','Programming'],['mathematics','Mathematics'],['history','History']]){
  await open(subject,name);
  if(subject==='programming') { await choose(dialog,'How many','5 cards'); await choose(dialog,'Difficulty','Hard'); }
  const before=asks;
  assert.equal(await dialog.locator('.quick-add__generated-card').count(),0);
  await dialog.getByRole('button',{name:'Generate cards',exact:true}).click();
  await dialog.locator('.quick-add__generated-card').first().waitFor();
  assert.equal(asks,before+1);assert.equal(requests.at(-1).subject,subject);assert.equal(requests.at(-1).count,subject==='programming'?5:10);if(subject==='programming')assert.equal(requests.at(-1).difficulty,'hard');
  assert.equal(await dialog.locator('.quick-add__generated-card').count(),3);
  assert.equal(await dialog.locator('input[name=name]').inputValue(),fixtures[subject].name);
  // A response is only a draft: no deck exists until save is pressed.
  assert.equal(await page.locator('.decks-page').getByText(fixtures[subject].name,{exact:true}).count(),0);
  const first=dialog.locator('.quick-add__generated-card').first();
  await first.locator('summary').click();
  const editedAnswer=`Edited answer for ${subject}`;
  await first.locator('textarea').first().fill(editedAnswer);
  if(subject==='programming'){
   await first.locator('textarea[name=code]').fill('let answer = 42;');
   assert(await first.getByRole('radio',{name:'With answer',exact:true}).isChecked());
  }
  if(subject==='mathematics')assert(await first.locator('.katex').count()>0);
  await first.getByLabel('Card tags, separated by commas',{exact:true}).fill('reviewed, example');
  // Excluding a row changes the number saved, without destroying its draft.
  const second=dialog.locator('.quick-add__generated-card').nth(1);
  await second.locator('summary').click();await second.getByLabel('Include this card',{exact:true}).uncheck();
  await dialog.getByRole('button',{name:'Create deck · 2 cards',exact:true}).waitFor();
  if(subject==='programming'){
   if(process.env.ACCEPTANCE_SCREENSHOTS)await page.screenshot({path:path.join(process.env.ACCEPTANCE_SCREENSHOTS,'subject-topic-desktop.png')});
   await page.evaluate(()=>document.documentElement.setAttribute('theme','dark'));
   if(process.env.ACCEPTANCE_SCREENSHOTS)await page.screenshot({path:path.join(process.env.ACCEPTANCE_SCREENSHOTS,'subject-topic-dark.png')});
   await page.evaluate(()=>document.documentElement.setAttribute('theme','light'));
   await page.setViewportSize({width:390,height:844});await first.scrollIntoViewIfNeeded();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(process.env.ACCEPTANCE_SCREENSHOTS)await page.screenshot({path:path.join(process.env.ACCEPTANCE_SCREENSHOTS,'subject-topic-mobile.png')});
   await page.setViewportSize({width:1280,height:900});
  }
  await dialog.getByRole('button',{name:'Create deck · 2 cards',exact:true}).click();
  await dialog.waitFor({state:'hidden'});
  await page.getByText(fixtures[subject].name,{exact:true}).first().click();
  await page.getByRole('button',{name:/Edit deck/}).click();
  assert.equal(await page.locator('input[name=contentLanguage]').inputValue(),'Polish');
  assert.equal(await page.locator('.deck-word__open').count(),2);
  await page.locator('.deck-word__open').filter({hasText:fixtures[subject].cards[0].source}).click();
  assert.equal(await page.locator('.deck-word-editor textarea[name=target]').inputValue(),editedAnswer);
  if(subject==='programming'){
   assert.equal(await page.locator('.deck-word-editor textarea[name=code]').inputValue(),'let answer = 42;');
   assert(await page.locator('.deck-word-editor').getByRole('radio',{name:'With answer',exact:true}).isChecked());
  }
  if(subject==='mathematics')assert.equal(await page.locator('.deck-word-editor textarea[name=formula]').inputValue(),fixtures[subject].cards[0].subjectFields.formula);
  if(subject==='history')assert.equal(await page.locator('.deck-word-editor input[name=date]').inputValue(),'27 BCE');
  await page.reload();await page.locator('.deck-word__open').first().waitFor();assert.equal(await page.locator('.deck-word__open').count(),2);
 }
 // Changing the topic invalidates an in-flight response, even if it arrives later.
 await open('programming','Programming');mode='late';
 await dialog.getByRole('button',{name:'Generate cards',exact:true}).click();
 await dialog.getByText('Generating cards…',{exact:true}).waitFor();
 await dialog.getByLabel('Topic',{exact:true}).fill('Rust traits');
 while(!release)await new Promise(r=>setTimeout(r,10));release();await page.waitForTimeout(200);
 assert.equal(await dialog.locator('.quick-add__generated-card').count(),0);
 mode='quota';await dialog.getByRole('button',{name:'Generate cards',exact:true}).click();
 await dialog.getByText('Suggestions are back tomorrow.').waitFor();
 // Both the individual function switch and the master switch gate generation.
 await dialog.getByRole('button',{name:'Close',exact:true}).last().click();
 await page.goto(`${BASE}/app/settings?tab=assistant`);
 await page.getByRole('switch',{name:'Generate decks by topic',exact:true}).uncheck();
 await page.getByRole('switch',{name:'Enable AI assistant',exact:true}).uncheck();
 await page.reload();await page.getByRole('switch',{name:'Enable AI assistant',exact:true}).check();
 assert.equal(await page.getByRole('switch',{name:'Generate decks by topic',exact:true}).isChecked(),false);
 const disabledAsks=asks;
 await page.goto(`${BASE}/app/learn`);await page.getByRole('button',{name:'Add card',exact:true}).click();
 assert.equal(await dialog.getByRole('tab',{name:'Generate a deck',exact:true}).count(),0);assert.equal(asks,disabledAsks);
 await dialog.getByRole('button',{name:'Close dialog',exact:true}).click();
 await page.goto(`${BASE}/app/settings?tab=assistant`);
 await page.getByRole('switch',{name:'Generate decks by topic',exact:true}).check();mode='success';
 await page.goto(`${BASE}/app/learn`);await page.getByRole('button',{name:'Add card',exact:true}).click();
 await dialog.getByRole('button',{name:'Generate a deck',exact:true}).click();
 await dialog.getByRole('heading',{name:'Generate a deck',exact:true}).waitFor();
 assert.equal(await dialog.getByRole('combobox',{name:'Deck',exact:true}).count(),0);
 await choose(dialog,'Subject','Languages');
 await dialog.getByLabel('Topic',{exact:true}).fill('Travel');
 await dialog.getByRole('button',{name:'Collect words',exact:true}).click();
 await dialog.locator('.quick-add__row').first().waitFor();
 assert.equal(requests.at(-1).task,'topic');
 await dialog.getByRole('button',{name:'Create deck · 1 cards',exact:true}).click();
 await dialog.waitFor({state:'hidden'});
 await page.goto(`${BASE}/app/decks`);await page.getByText('Travel words',{exact:true}).first().waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS: 3 subjects, answer language, technology, 10-card request, editable preview, exclusion, code side, formula rendering, explicit save, persistence, stale response, quota, mobile, independent and master AI settings');
 } finally { await browser?.close(); server.kill(); }
};
main().catch(error => { console.error(error); process.exitCode = 1; });
