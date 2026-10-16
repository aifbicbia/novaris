// Validate the delivered registry and actual runtime helpers without private audit files.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const require=createRequire(import.meta.url), cache=new Map(), root=process.cwd();
const read=p=>JSON.parse(readFileSync(p,'utf8'));
function load(stem) {
 const path=[stem,stem+'.ts',stem+'.tsx',stem+'.json',resolve(stem,'index.ts')].find(p=>existsSync(p)&&/\.(?:tsx?|json)$/.test(p));assert.ok(path,stem);
 if(cache.has(path))return cache.get(path).exports;const loaded={exports:{}};cache.set(path,loaded);
 if(path.endsWith('.json'))loaded.exports=read(path);
 else {const source=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
 const port=name=>name==='server-only'?{}:name.startsWith('@/')?load(resolve(root,'src',name.slice(2))):name.startsWith('.')?load(resolve(dirname(path),name)):require(name);
 new Function('require','module','exports',source)(port,loaded,loaded.exports);}
 return loaded.exports;
}
const manifest=read('src/data/archive-manifest.json'), quality=read('src/data/quality-inventory.json');
const sets=manifest.activeContestSets.filter(x=>x.visibility==='public'),ids=new Set(),slugs=new Set();let total=0,onsite=0,external=0;
for(const set of sets) {
 const data=read(set.dataPath),sols=read(set.solutionPath);assert.equal(data.problems.length,set.expectedProblems,set.id);assert.equal(sols.length,data.problems.length,set.id);
 const byId=new Map(sols.map(s=>[s.problemId,s]));assert.equal(byId.size,sols.length);
 for(const p of data.problems) {
  assert.ok(!ids.has(p.id)&&!slugs.has(p.slug),'Duplicate ID/URL');ids.add(p.id);slugs.add(p.slug);total++;
  const sol=byId.get(p.id);assert.ok(sol);if(p.answerType==='multiple-choice') { const patterns=[/\bchoice\s+(?:\*\*)?([A-E])\b/i,/\\text\{([A-E])(?:\s|})/,/\\boxed\{([A-E])\}/,/\b([A-E])\s*\)/]; const choice=patterns.map(x=>sol.finalAnswer.match(x)?.[1]).find(Boolean);assert.equal(choice,p.answer,`${p.id}: final answer letter mismatch`); }
  else if(p.answerType==='integer') {const digits=sol.finalAnswer.match(/\d+/)?.[0];assert.ok(digits);assert.equal(Number(digits),Number(p.answer),`${p.id}: integer answer mismatch`);}
  else {assert.ok(['proof','code'].includes(p.answerType));assert.ok(p.answer.trim());}
  for(const key of ['id','problemId','finalAnswer','shortExplanation','difficultyNotes','writtenBy','verificationStatus'])assert.ok(typeof sol[key]==='string'&&sol[key].trim(),`${p.id}: empty ${key}`);
  for(const key of ['detailedSteps','keyIdeas','commonMistakes','alternativeMethods'])assert.ok(Array.isArray(sol[key])&&sol[key].every(x=>typeof x==='string'),`${p.id}: ${key}`);
  for(const url of [p.sourceUrl,p.answerSourceUrl,p.officialSourceUrl??data.officialSourceUrl])assert.ok(/^https?:\/\//.test(url),`${p.id}: source URL`);
  const q=quality.records[p.id];assert.ok(q);if(q.rights==='documented-educational-use'){assert.ok(p.problemText);onsite++;}else {assert.equal(p.problemText,'',`${p.id}: private original in public delivery`);external++;}
 }
}
assert.equal(total,Object.keys(quality.records).length);assert.equal(quality.counts.problems,total);assert.equal(quality.counts.papers,sets.length);
const holdRows=read('src/data/solution-display-holds.json');assert.equal(holdRows.length,7);for(const row of holdRows){assert.ok(ids.has(row.problemId));assert.ok(quality.records[row.problemId].issues.includes(row.reason));}
const {archiveRows}=load(resolve(root,'src/lib/archive-data.ts')),packet=load(resolve(root,'src/lib/archive-packet.ts')),index=load(resolve(root,'src/lib/problem-index.ts'));
assert.equal(archiveRows.length,total);assert.deepEqual(packet.unpackArchiveRows(packet.packArchiveRows(archiveRows)),archiveRows);
let navigationChecks=0;for(const set of sets){const data=read(set.dataPath);const expected=data.problems.map(x=>x.id);for(const p of data.problems){assert.equal(index.getProblemBySlug(p.slug).id,p.id);assert.deepEqual(index.getProblemsForPaper(data.contest,data.year,data.division,p.id).map(x=>x.id),expected);navigationChecks++;}}
const rules=load(resolve(root,'src/lib/archive.ts'));
for(const set of sets){const f=rules.readArchiveFilters(new URLSearchParams('paper='+encodeURIComponent(set.id)),archiveRows);assert.equal(rules.filterArchive(archiveRows,f).length,set.expectedProblems,set.id);}
if(existsSync('release-integrity.json'))for(const [path,digest] of Object.entries(read('release-integrity.json').files)){assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),digest,`Delivered file changed: ${path}`);}
console.log(JSON.stringify({status:'PASS_RELEASE_REGISTRY_RIGHTS_ANSWERS_PACKET_AND_ALL_PAPER_LINKS',papers:sets.length,records:total,solutions:total,licensedStatements:onsite,externalOrPendingStatements:external,publicSolutionDisplayHolds:holdRows.length,availableExplanations:total-holdRows.length,navigationChecks,scope:'Structural/source-link and recorded-answer consistency. Formula rendering and recorded mathematical proof checks are separate.'}));
