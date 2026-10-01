"use strict";
const stage = document.querySelector("#stage");
const display = document.querySelector("#display");
const startScreen = document.querySelector("#start-screen");
const play = document.querySelector("#play");
const status = document.querySelector("#status");
const hint = document.querySelector("#hint");
let launching = false;

// Scale the iframe, keeping the Java display's own viewport at its native size.
function fitDisplay() {
  const scale = Math.min(stage.clientWidth / 1500, stage.clientHeight / 640);
  display.style.transform = `scale(${scale})`;
  display.style.left = `${(stage.clientWidth - 1500 * scale) / 2}px`;
  display.style.top = `${(stage.clientHeight - 640 * scale) / 2}px`;
}
new ResizeObserver(fitDisplay).observe(stage);
document.querySelector("#fullscreen").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await stage.requestFullscreen();
  } catch (error) { hint.textContent = "Fullscreen is unavailable in this browser."; }
});
document.querySelector("#exit-fullscreen").addEventListener("click", () => document.exitFullscreen());

play.addEventListener("click", () => {
  if (launching) {
    location.reload();
    return;
  }
  launching = true;
  play.disabled = true;
  play.textContent = "Loading…";
  status.textContent = "Loading the game. This may take a moment on the first launch.";
  const gameUrl = new URL("web/game.html", document.baseURI);
  gameUrl.search = location.search;
  display.src = gameUrl.href;
});

window.addEventListener("message", event => {
  if (event.origin !== location.origin || event.source !== display.contentWindow) return;
  if (event.data.type === "game-ready") {
    startScreen.hidden = true;
  } else if (event.data.type === "game-restart") {
    startScreen.hidden = false;
    status.textContent = "Restarting the game…";
    const gameUrl = new URL("web/game.html",document.baseURI);
    gameUrl.search = location.search;
    gameUrl.searchParams.set("restart","1");
    display.src = gameUrl.href;
  } else if (event.data.type === "game-error" || event.data.type === "game-exit") {
    startScreen.hidden = false;
    play.textContent = "Reload game";
    play.disabled = false;
    status.textContent = event.data.message;
  }
});
