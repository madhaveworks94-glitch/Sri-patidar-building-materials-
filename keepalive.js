// Keeps the owner's phone reachable while the app is in the background (Android APK only).
// It starts a small Android service with a notification. If the APK was built without the service, every call does nothing.
let plugin;
function get(){
 if(plugin!==undefined)return plugin;
 plugin=null;
 try{const C=window.Capacitor;if(C&&C.isNativePlatform&&C.isNativePlatform()&&C.registerPlugin)plugin=C.registerPlugin('KeepAlive')}catch(e){plugin=null}
 return plugin;
}
export const keepAliveAvailable=()=>{try{const C=window.Capacitor;return !!(C&&C.isNativePlatform&&C.isNativePlatform())}catch(e){return false}};
export async function setKeepAlive(on){
 const p=get();if(!p)return false;
 try{if(on)await p.start();else await p.stop();return true}catch(e){return false}
}
export async function openBatterySettings(){const p=get();if(!p)return false;try{await p.openBattery();return true}catch(e){return false}}
