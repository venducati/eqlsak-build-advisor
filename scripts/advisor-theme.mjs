// Refined artwork, bundled locally. Direct URLs avoid Chromium's size limit on
// CSS custom-property values when the lossless 4K image is embedded as base64.
export const muralFile = 'public/eqlsak-mural-refined-4k.webp';
export function shellStyles(imageURL) {
  return `
body{margin:0;min-height:100vh;color:#f5ead4;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#100d0b;background-image:linear-gradient(180deg,#08121b44 0%,#0e121977 46%,#130c09ce 100%),url("${imageURL}");background-position:center top;background-size:cover;background-attachment:fixed;background-repeat:no-repeat}
.advisor-client .ba-heading::before{background-image:linear-gradient(90deg,#0b192af2 0%,#102036cf 48%,#2d180e70 100%),url("${imageURL}")}
*{box-sizing:border-box}main.advisor-client{max-width:1460px;min-height:100vh;margin:auto;padding:24px clamp(16px,3vw,48px) 40px}a{color:#a8d4ee}
.advisor-client .offline-tabs{display:flex;flex-wrap:wrap;gap:5px;align-items:center;margin:0;background:linear-gradient(110deg,#101f2feb,#2b1b13f2);padding:9px 12px;border:1px solid #b18a47;border-bottom:2px solid #d7b16a;box-shadow:0 10px 36px #0006,inset 0 1px #ffe0a032;border-radius:10px 10px 0 0}
.advisor-client .offline-tabs button{display:flex;gap:9px;align-items:center;padding:11px 18px;border:1px solid transparent;border-radius:5px;background:transparent;color:#d6d8d4;font:600 15px system-ui,sans-serif;cursor:pointer}
.advisor-client .offline-tabs button[aria-pressed=true]{background:linear-gradient(#6c4825,#382b1c);color:#ffe6ae;border-color:#af8548;box-shadow:inset 0 1px #ffdf9845}
.advisor-client .offline-tabs button:hover{color:#fff0cd;background-color:#73512744}.advisor-client .offline-tabs button:focus-visible{outline:3px solid #a7d7f8;outline-offset:3px}.advisor-client .offline-tabs svg{width:19px;height:19px}
.advisor-client .build-advisor{margin:0;border-top:0;border-radius:0 0 12px 12px}.advisor-client .combat-meter{margin-top:20px;background:linear-gradient(125deg,#101f2bf5,#241910f5);border-color:#957347;box-shadow:0 20px 60px #0007}
@media(max-width:640px){main.advisor-client{padding:12px 10px 24px}.advisor-client .offline-tabs{padding:6px}.advisor-client .offline-tabs button{flex:1;justify-content:center;padding:10px 8px;font-size:14px}}
`;
}
