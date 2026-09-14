const {test}=require('node:test');
const assert=require('node:assert/strict');
const {allowAppFullscreen}=require('../permissions.cjs');
test('only the main local app document may request fullscreen; unrelated permissions stay denied',()=>{
 const entry='file:///app/index.html',webContents={getURL:()=>entry},main={webContents,isDestroyed:()=>false},details={requestingUrl:entry,isMainFrame:true};
 assert.equal(allowAppFullscreen(main,entry,webContents,'fullscreen',details),true);
 for(const permission of ['media','geolocation','notifications','pointerLock','fileSystem'])assert.equal(allowAppFullscreen(main,entry,webContents,permission,details),false);
 for(const value of [{...details,isMainFrame:false},{...details,requestingUrl:'https://example.com'},{}])assert.equal(allowAppFullscreen(main,entry,webContents,'fullscreen',value),false);
 assert.equal(allowAppFullscreen(main,entry,{getURL:()=>entry},'fullscreen',details),false);
 assert.equal(allowAppFullscreen(null,entry,webContents,'fullscreen',details),false);
});
