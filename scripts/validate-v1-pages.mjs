import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require = createRequire(import.meta.url), cache = new Map();
function load(stem) {
  const path = [stem, stem+'.ts', stem+'.tsx', stem+'.json', resolve(stem, 'index.ts')].find(p=>existsSync(p) && /\.(?:tsx?|json)$/.test(p));
  assert.ok(path, stem);if(cache.has(path))return cache.get(path).exports;
  const loaded={exports:{}};cache.set(path,loaded);
  if(path.endsWith('.json'))loaded.exports=JSON.parse(readFileSync(path,'utf8'));
  else {
    const output=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
    const port=name=>{
      if(name==='server-only')return {};
      if(name==='next/link')return {__esModule:true,default:({href,children,prefetch,...props})=>{void prefetch;return React.createElement('a',{href,...props},children);}};
      if(name.startsWith('@/'))return load(resolve('src',name.slice(2)));
      if(name.startsWith('.'))return load(resolve(dirname(path),name));
      return require(name);
    };
    new Function('require','module','exports',output)(port,loaded,loaded.exports);
  }
  return loaded.exports;
}
const originalOrigin=process.env.NOVARIS_SITE_URL, originalEmail=process.env.NOVARIS_CONTACT_EMAIL;
let cases=0;const check=(name,fn)=>{fn();cases++;console.log('PASS V1 pages: '+name);};
try {
  const config=load(resolve('src/lib/site-config.ts'));
  delete process.env.NOVARIS_SITE_URL;delete process.env.NOVARIS_CONTACT_EMAIL;
  check('unconfigured origin does not fabricate canonicals or contact details',()=>{assert.equal(config.siteOrigin(),undefined);assert.equal(config.contactEmail(),undefined);assert.equal(config.pageMetadata('Test','Description','/guide').alternates,undefined);});
  for(const invalid of ['http://example.test','https://user:secret@example.test','https://example.test/path','https://example.test/?token=private','https://example.test/#private','broken'])check('reject invalid public origin '+invalid,()=>{process.env.NOVARIS_SITE_URL=invalid;assert.equal(config.siteOrigin(),undefined);});
  check('configured HTTPS origin supplies page canonical and OG',()=>{process.env.NOVARIS_SITE_URL='https://example.test';const m=config.pageMetadata('Study guide','Guide','/guide');assert.equal(m.alternates.canonical,'https://example.test/guide');assert.equal(m.openGraph.url,'https://example.test/guide');});
  for(const invalid of ['private','name\n@example.test','user@example.test?bcc=private',''])check('reject unusable contact value',()=>{process.env.NOVARIS_CONTACT_EMAIL=invalid;assert.equal(config.contactEmail(),undefined);});
  delete process.env.NOVARIS_SITE_URL;delete process.env.NOVARIS_CONTACT_EMAIL;
  for(const path of ['tutors','discussion','blog'])check(path+' honestly planned without prototype profiles',()=>{const Page=load(resolve('src/app',path,'page.tsx')).default;const html=renderToStaticMarkup(React.createElement(Page));assert.match(html,/Coming soon/);assert.match(html,/href="\/archive"/);assert.doesNotMatch(html,/Sample profile|verified tutor|Available sessions|name="availability"|mailto:/i);});
  const Contact=load(resolve('src/app/contact/page.tsx')).default;
  const html=renderToStaticMarkup(await Contact({searchParams:Promise.resolve({problem:'Test task'})}));
  check('unconfigured Contact has no fake mailbox or submission',()=>{assert.match(html,/Contact details pending/);assert.doesNotMatch(html,/mailto:|team@novaris|tutors@novaris|<form/);});
  process.env.NOVARIS_CONTACT_EMAIL='owner@example.test';
  const configured=renderToStaticMarkup(await Contact({searchParams:Promise.resolve({problem:'Test task'})}));
  check('confirmed mailto uses only configured address and preserves problem context',()=>{assert.match(configured,/mailto:owner@example.test/);assert.match(configured,/Test task/);assert.doesNotMatch(configured,/<form/);});
  delete process.env.NOVARIS_CONTACT_EMAIL;
  for(const path of ['privacy','guide'])check(path+' offers real information and recovery links',()=>{const Page=load(resolve('src/app',path,'page.tsx')).default;const h=renderToStaticMarkup(React.createElement(Page));assert.match(h,/<h1/);assert.match(h,/href="\/(?:contact|archive)"/);});
} finally {for(const [key,value] of [['NOVARIS_SITE_URL',originalOrigin],['NOVARIS_CONTACT_EMAIL',originalEmail]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
console.log(`V1 page/config checks passed: ${cases}; isolated SSR and configuration only, not a legal or browser certification.`);
