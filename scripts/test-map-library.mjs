import {test} from 'node:test';
import assert from 'node:assert/strict';
import {browserMapIndex,mapLocationName,mapLocationMatches,matchMapLocation} from '../lib/map-library.ts';
const file=(name,folder='brewall')=>{const f=new File(['L 0,0,0,1,1,0,0,0,0'],name);Object.defineProperty(f,'webkitRelativePath',{value:folder+'/'+name});f.text=()=>{throw Error('Index must not read file contents');};return f;};
test('browser directory picker groups full packs lazily, with base and layers together',()=>{
 const {index,files}=browserMapIndex([file('unrest.txt'),file('UNREST_1.TXT'),file('cauldron.txt'),file('readme.md'),file('eqlog_Name_Test.txt'),file('unrest.txt','GoodMaps'),file('mystery-dungeon.txt')]);
 assert.equal(index.folders.length,2);const pack=index.folders.find(f=>f.id===index.selectedFolderId);assert.equal(pack.provider,'brewall');assert.equal(pack.zones.length,3);
 const unrest=pack.zones.find(z=>z.stem==='unrest');assert.equal(unrest.fileCount,2);assert.equal(files.get(unrest.id).length,2);assert.equal(mapLocationName('mystery-dungeon'),'mystery-dungeon');
});
test('friendly names and aliases match exact zone navigation; ambiguous maps require a choice',()=>{
 const rows=['cauldron','unrest','guktop','gukbottom','paw','mistmoore'].map(stem=>({id:stem,stem,fileCount:1}));
 for(const [name,stem] of [["Dagnor's Cauldron",'cauldron'],['Estate of Unrest','unrest'],['Upper Guk','guktop'],['Lower Guk','gukbottom'],['Splitpaw Lair','paw'],['Castle Mistmoore','mistmoore']])assert.equal(matchMapLocation(rows,name)?.stem,stem,name);
 assert.equal(matchMapLocation(rows,'Unknown dungeon'),null);assert.equal(matchMapLocation([...rows,rows[0]],"Dagnor's Cauldron"),null);
 assert.ok(mapLocationMatches(rows[0],'dagnors'));assert.ok(mapLocationMatches(rows[3],'lower guk'));assert.ok(mapLocationMatches(rows[4],'paw'));
});
test('duplicate layers, empty folders, and non-map files never become selectable maps',()=>{
 assert.equal(browserMapIndex([]).index.folders.length,0);
 assert.equal(browserMapIndex([file('unrest_1.txt'),file('UNREST_1.TXT'),file('pack.zip')]).index.folders.length,0);
});
