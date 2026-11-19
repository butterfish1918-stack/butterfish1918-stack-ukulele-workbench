import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const load=path=>readFileSync(new URL(path,root),'utf8');
const index=load('index.html'),styles=load('styles.css'),app=load('src/app.js');
test('approved industrial-racing identity is self-contained and PWA-aware',()=>{
 assert.match(index,/data-edition="underground-racing"/);
 assert.match(styles,/--lime:#b9f700/);
 assert.match(styles,/--orange:#ff7a24/);
 assert.match(styles,/--display:Impact/);
 assert.doesNotMatch(styles,/@import\s+url\(/);
});
test('notation-first score canvas and inspector are separate functional regions',()=>{
 for(const cls of ['studio-layout','studio-score-sheet','studio-inspector','studio-fret-panel','studio-transport','studio-paper-label'])
  assert.ok(app.includes(cls),`missing ${cls}`);
 assert.match(app,/renderScoreView\(score,\{mode:state.display/);
 assert.match(app,/id="scorePlaybackToggle" data-action="score-play"/);
 assert.match(app,/data-action="score-save-song"/);
 assert.match(app,/data-action="score-export-xml"/);
});
test('all eight existing destinations remain in desktop and mobile navigation',()=>{
 for(const mode of ['score','practice','notation','technique','explorer','progression','rhythm','songbook']){
  const matches=index.match(new RegExp(`data-page="${mode}"`,'g'))||[];
  assert.equal(matches.length,2,`${mode} should appear in both nav rails`);
 }
});
test('activity-specific layouts, reduced motion and mobile score scrolling retained',()=>{
 for(const id of ['practice','notation','technique','songbook','rhythm'])
  assert.ok(styles.includes(`[data-mode="${id}"]`),`${id} distinct treatment`);
 assert.match(styles,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(styles,/\.studio-layout\s*\.score-editor-view/);
 assert.match(styles,/\.mobile-nav/);
});
