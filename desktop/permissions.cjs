'use strict';
// Only the trusted local main document may enter HTML fullscreen. Everything else stays denied.
function allowAppFullscreen(mainWindow,entry,contents,permission,details){
 return Boolean(permission==='fullscreen'&&mainWindow&&!mainWindow.isDestroyed()&&contents===mainWindow.webContents&&contents.getURL()===entry&&details?.isMainFrame===true&&details.requestingUrl===entry);
}
module.exports={allowAppFullscreen};
