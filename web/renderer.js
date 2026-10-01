"use strict";
// One canvas batch per display frame; Java continues to update the game at 180 Hz.
const browserRenderer = (() => {
  const images = [];
  const canvas = document.createElement("canvas");
  canvas.id = "game";
  canvas.width = 1500;
  canvas.height = 600;
  canvas.tabIndex = 0;
  canvas.setAttribute("aria-label", "metal-renamon game. Press O to start.");
  canvas.style = "position:absolute;left:0;top:0;width:1500px;height:600px;z-index:10;outline:none";
  document.body.append(canvas);
  const ctx = canvas.getContext("2d", {alpha:false});
  ctx.imageSmoothingEnabled = false;
  const performanceLabel = document.createElement("output");
  performanceLabel.id = "performance";
  performanceLabel.style = "position:absolute;top:8px;right:16px;color:#fff;background:#10151ccc;padding:4px 8px;font:16px sans-serif;z-index:11";
  document.body.append(performanceLabel);
  const stats = new URLSearchParams(location.search).has("stats");
  const keyBits = {KeyA:1,KeyD:2,KeyW:4,KeyS:8,Space:16,KeyJ:32,KeyK:64,KeyL:128,KeyP:256,KeyO:512,KeyR:1024};
  let held = 0, pressed = new URLSearchParams(location.search).has("restart") ? 512 : 0;
  let lastFrame, debt = 0, ready = false, frames = 0, updates = 0, intervalStart;
  let playerPosition = "";
  document.addEventListener("keydown", event => {
    const bit = keyBits[event.code];
    if (!bit) return;
    event.preventDefault();
    held |= bit;
    if (!event.repeat || bit === 64 || bit === 128) pressed |= bit;
  });
  document.addEventListener("keyup", event => { held &= ~(keyBits[event.code] || 0); });
  window.addEventListener("blur", () => { held = 256; pressed = 256; });
  canvas.addEventListener("pointerup", () => canvas.focus());

  function draw(scene) {
    const descriptions = [];
    ctx.fillStyle = "#080c12";
    ctx.fillRect(0,0,1500,600);
    for (const row of scene.trimEnd().split("\n")) {
      const values = row.split("\t");
      if (values[0] === "i") {
        const image = images[+values[1]];
        const x = +values[2], y = +values[3], scale = +values[4], angle = +values[5];
        if (image.src.includes("/Player")) playerPosition = `X: ${Math.round(x)} Y: ${Math.round(y)}`;
        ctx.save();
        ctx.translate(x,y);
        if (angle) ctx.rotate(angle * Math.PI / 180);
        const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
        ctx.drawImage(image,-width/2,-height/2,width,height);
        ctx.restore();
      } else if (values[0] === "t") {
        descriptions.push(values[5]);
        ctx.font = `${values[3]}px Arial,sans-serif`;
        ctx.fillStyle = "#" + (+values[4]).toString(16).padStart(6,"0");
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(values[5],+values[1],+values[2]);
      }
    }
    canvas.setAttribute("aria-label", "metal-renamon. " + descriptions.join(". "));
  }

  return {
    focus() { canvas.focus(); },
    natives: {
      async Java_BrowserRenderer_openImage(lib, id, file) {
        const image = new Image();
        image.src = new URL("../Metal_Slug/" + file,document.baseURI).href;
        try { await image.decode(); }
        catch (error) { notify("game-error", "Unable to load game image: " + file); throw error; }
        images[id] = image;
        return (image.naturalWidth << 16) | image.naturalHeight;
      },
      async Java_BrowserRenderer_frame(lib, scene, logicalUpdates) {
        const now = await new Promise(requestAnimationFrame);
        const elapsed = lastFrame === undefined ? 1000/60 : Math.min(50,now-lastFrame);
        lastFrame = now;
        debt += elapsed * 180 / 1000;
        const budget = Math.max(1,Math.min(9,Math.floor(debt + 0.001)));
        debt -= budget;
        draw(scene);
        if (!ready) { ready = true; notify("game-ready"); canvas.focus(); }
        intervalStart ??= now;
        frames++;
        updates += logicalUpdates;
        if (now - intervalStart >= 1000) {
          const fps = frames * 1000 / (now-intervalStart), tps = updates * 1000 / (now-intervalStart);
          performanceLabel.textContent = stats ? `${fps.toFixed(1)} FPS · ${tps.toFixed(1)} updates/s · ${playerPosition}` : `${Math.round(fps)} FPS`;
          frames = updates = 0; intervalStart = now;
        }
        const input = held | (pressed << 12) | (budget << 24);
        pressed = 0;
        // A blur sends one pause input, then releases all keys.
        if (!document.hasFocus()) held = 0;
        return input;
      },
      async Java_BrowserRenderer_restart() { notify("game-restart"); }
    }
  };
})();
