import java.util.ArrayList;
import java.util.HashMap;

/** Browser display and input adapter; the Java game still owns the simulation. */
final class BrowserRenderer {
  static final boolean ENABLED = Boolean.getBoolean("metalrenamon.browser");
  private static final HashMap<String,int[]> images = new HashMap<>();
  private static final ArrayList<Animation> animations = new ArrayList<>();
  private static native int openImage(int id, String file);
  private static native int frame(String scene, int updates);
  static native void restart();
  private static boolean started;
  private static int remainingUpdates, updates, held, pressed;

  static int[] image(String file) {
    int[] info = images.get(file);
    if (info == null) {
      int id = images.size();
      int size = openImage(id, file);
      info = new int[]{id, size >>> 16, size & 65535};
      images.put(file, info);
    }
    return info;
  }

  static void start() { started = true; }

  static void refresh() {
    if (!started) return;
    for (int i = animations.size() - 1; i >= 0; i--) {
      Animation a = animations.get(i);
      for (EZImage picture : a.pictures) picture.hide();
      if (a.tick >= a.pictures.length * a.duration || (a.player != null && a.player.getHealth() == 0)) {
        animations.remove(i);
        if (a.player != null && a.player.getHealth() > 0) a.player.showCurrentPose();
      } else {
        int picture = a.tick++ / a.duration;
        if (a.player != null) {
          a.player.hidePlayer();
          a.player.translateReloadAnimation(a.player.getXpos(), a.player.getYpos());
          if (a.player.isDamageFlashHidden()) continue;
        }
        a.pictures[picture].show();
      }
    }
    updates++;
    if (remainingUpdates-- > 0) return;
    StringBuilder scene = new StringBuilder(4096);
    for (EZElement element : EZ.app.elements) {
      if (!element.isShowing) continue;
      if (element instanceof EZImage) {
        EZImage image = (EZImage) element;
        double radius = (image.getWidth() + image.getHeight()) * image.getScale() / 2;
        if (image.xCenter + radius < 0 || image.xCenter - radius > 1500
            || image.yCenter + radius < 0 || image.yCenter - radius > 600) continue;
        scene.append("i\t").append(image.browserImageId).append('\t')
          .append(image.xCenter).append('\t').append(image.yCenter).append('\t')
          .append(image.getScale()).append('\t').append(image.getRotation()).append('\n');
      } else if (element instanceof EZText) {
        EZText text = (EZText) element;
        scene.append("t\t").append(text.xCenter).append('\t').append(text.yCenter).append('\t')
          .append(text.fontSize).append('\t').append(text.color.getRGB() & 0xffffff).append('\t')
          .append(text.msg.replace('\n',' ').replace('\t',' ')).append('\n');
      }
    }
    int input = frame(scene.toString(), updates);
    updates = 0;
    // Keep even a short movement tap for one update batch instead of losing it between frames.
    held = (input & 4095) | ((input >>> 12) & (1 | 2 | 4 | 8 | 32 | 256));
    pressed |= (input >>> 12) & 4095;
    remainingUpdates = Math.max(1, input >>> 24) - 1;
  }

  static int key(int code) {
    switch(code) {
      case 65: case 97: return 1; // A
      case 68: case 100: return 2; // D
      case 87: case 119: return 4; // W
      case 83: case 115: return 8; // S
      case 32: return 16;
      case 74: case 106: return 32; // J
      case 75: case 107: return 64; // K
      case 76: case 108: return 128; // L
      case 80: case 112: return 256; // P
      case 79: case 111: return 512; // O
      case 82: case 114: return 1024; // R
      default: return 0;
    }
  }
  static boolean down(int code) { return (held & key(code)) != 0; }
  static boolean pressed(int code) {
    int bit = key(code);
    boolean value = (pressed & bit) != 0;
    pressed &= ~bit;
    return value;
  }

  static void animate(EZImage[] pictures, int duration) {
    animate(pictures, duration, null);
  }
  static void animate(EZImage[] pictures, int duration, Player player) {
    if (pictures.length > 0) animations.add(new Animation(pictures, duration, player));
  }
  private static final class Animation {
    final EZImage[] pictures;
    final int duration;
    final Player player;
    int tick;
    Animation(EZImage[] pictures, int duration, Player player) {
      this.pictures = pictures; this.duration = duration; this.player = player;
    }
  }
}
