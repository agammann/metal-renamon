"use strict";
function notify(type, message) { parent.postMessage({type, message}, location.origin); }
const sounds = [];
function startAudio(record) {
  record.audio.play().catch(error => {
    if (error.name !== "NotAllowedError" && error.name !== "AbortError") console.error(error);
  });
}
function focusGame() {
  browserRenderer.focus();
  for (const record of sounds) if (record.active && record.audio.paused) startAudio(record);
}
document.addEventListener("pointerup", () => setTimeout(focusGame, 0));
document.addEventListener("focusin", event => {
  if (event.target instanceof HTMLTextAreaElement && event.target.readOnly) setTimeout(focusGame, 0);
}, true);
document.addEventListener("keydown", () => {
  for (const record of sounds) if (record.active && record.audio.paused) startAudio(record);
});
async function launch() {
  try {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cjrtnc.leaningtech.com/4.3/loader.js";
      script.onload = resolve;
      script.onerror = () => reject(new Error("The browser runtime could not be downloaded. Check your connection and reload."));
      document.head.append(script);
    });
    const assets = "/app" + new URL("../Metal_Slug/", document.baseURI).pathname;
    const jar = "/app" + new URL("metal-renamon.jar", document.baseURI).pathname;
    await cheerpjInit({version:17, status:"splash", enableInputMethods:false,
      natives:{
        ...browserRenderer.natives,
        async Java_EZ_browserReady() { notify("game-ready"); focusGame(); },
        async Java_EZSound_browserOpen(lib, file) {
          const audio = new Audio(new URL("../Metal_Slug/" + file, document.baseURI).href);
          audio.preload = "metadata";
          audio.hidden = true;
          audio.addEventListener("error", () => console.error("Unable to play sound: " + file));
          document.body.append(audio);
          sounds.push({audio, active:false});
          return sounds.length - 1;
        },
        async Java_EZSound_browserCommand(lib, handle, command) {
          const record = sounds[handle];
          const audio = record.audio;
          if (command === 1 || command === 4) {
            if (command === 4 || audio.ended || (audio.currentTime !== 0 && !audio.paused)) audio.currentTime = 0;
            if (command === 4) audio.loop = true;
            record.active = true;
            startAudio(record);
          } else {
            record.active = false;
            audio.pause();
            if (command === 2) audio.currentTime = 0;
          }
        },
        async Java_EZSound_browserTime(lib, handle) { return sounds[handle].audio.currentTime; },
        async Java_EZSound_browserSeek(lib, handle, seconds) { sounds[handle].audio.currentTime = Math.max(0, seconds); }
      }, javaProperties:[
      `metalrenamon.assets=${assets}`, "metalrenamon.browser=true"
    ]});
    cheerpjCreateDisplay(1500,640,document.body);
    const exitCode = await cheerpjRunMain("MetalSlug", jar);
    notify("game-exit", exitCode === 0 ? "The game closed. Reload to play again." : "The game could not finish loading. Reload to try again.");
  } catch (error) {
    console.error(error);
    notify("game-error", error.message || "The game could not load. Reload to try again.");
  }
}
launch();
