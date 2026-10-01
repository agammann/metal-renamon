import java.lang.reflect.Field;
import java.awt.event.KeyEvent;

/** Direct regression checks against the real game classes and sprite assets. */
public final class GameRegression {
  static void check(boolean result, String message) { if (!result) throw new AssertionError(message); }
  static void keys(String... keys) throws Exception {
    EZInteraction.app.keysDown.clear();
    EZInteraction.app.keysPressed.clear();
    Field initiated = EZInteraction.class.getDeclaredField("keypCheckInitiated");
    initiated.setAccessible(true); initiated.setBoolean(null,false);
    for (String key : keys) {
      int code = key.equals("space") ? KeyEvent.VK_SPACE : key.toUpperCase().charAt(0);
      EZInteraction.app.keysDown.put(key,code); EZInteraction.app.keysPressed.put(key,code);
    }
  }
  static void clearDamageCooldown(Player player) throws Exception {
    Field ticks = Player.class.getDeclaredField("damageTicks");
    ticks.setAccessible(true); ticks.setInt(player,0);
  }
  public static void main(String[] args) throws Exception {
    new EZ(1500,600); EZ.setFrameRateASAP(true);
    Player player = new Player(150,500); player.animationInit();
    Projectile shot = new Projectile(0,-10,"scientistBullet"); shot.projectileInit();
    shot.resetEnemyProjectile(500,500);
    for (int i=0;i<148;i++) shot.processEnemyProjectile(500,500,15);
    check(!shot.isPointInElement(150,500), "Fixture must reproduce upstream center-only miss");
    check(shot.hitsPlayer(player), "Body overlap must register damage");
    player.collision(); check(player.getHealth()==720, "One hit must remove 80 health");
    player.collision(); check(player.getHealth()==720, "Damage cooldown must prevent repeat hits");
    shot.resetEnemyProjectile(500,500); check(!shot.hitsPlayer(player), "Consumed enemy shot must not hit again");
    keys("s"); player.processPlayer();
    shot.resetEnemyProjectile(500,500);
    for (int i=0;i<148;i++) shot.processEnemyProjectile(500,500,15);
    check(!shot.hitsPlayer(player), "Crouching must dodge the scientist's head-height shot");
    keys(); player.processPlayer(); keys("space"); player.processPlayer();
    int jumpX = player.getXpos(); keys("d"); player.processPlayer();
    check(player.getXpos()>jumpX, "Horizontal movement must work during a jump");
    keys("a"); player.processPlayer();
    for (int i=0;i<20;i++) { keys(); player.processPlayer(); }
    check(!shot.hitsPlayer(player), "Jumping above a shot must dodge it");
    for (int i=0;i<100;i++) { keys(); player.processPlayer(); }
    check(player.getYpos()==500, "Jump must land back at ground height");
    for(int i=0;i<40;i++) { keys("d"); player.processPlayer(); }
    check(player.getXpos()==300, "Movement must preserve fractional 3.75-pixel speed");
    for(int i=0;i<40;i++) { keys("a"); player.processPlayer(); }
    check(player.getXpos()==150, "Left and right movement must be symmetric");
    keys("d","k"); check(player.processPlayer()=='k' && player.getXpos()>150,
      "Firing must not stop horizontal movement");
    keys("a"); player.processPlayer();
    Projectile bullet = new Projectile(-200,-200,"playerbullet"); bullet.projectileInit(); bullet.animationInit();
    bullet.switchState(); bullet.translateObject(200,500); bullet.advancePlayerProjectile();
    check(Math.abs(bullet.getXpos()-206.3)<0.0001, "Bullet speed must equal 42 original substeps");
    Enemy enemy = new Enemy(245,500,"scientist",1500,600); enemy.unitsInit();
    check(bullet.hitsEnemy(enemy), "Bullet must hit enemy body before its center");
    enemy.collision(); bullet.consumePlayerProjectile();
    check(!bullet.beingUsed() && !bullet.hitsEnemy(enemy), "One bullet can damage an enemy once");
    Projectile grenade = new Projectile(-200,-200,"playergrenade"); grenade.projectileInit(); grenade.animationInit();
    grenade.switchState(); grenade.translateObjectUp(150,400); grenade.advancePlayerProjectile();
    check(Math.abs(grenade.getYpos()-395.8)<0.0001, "Grenade speed and upward direction must be preserved");
    Enemy air = new Enemy(1000,150,"helicopter",1500,600); air.unitsInit();
    int deaths = air.returnDeathcounter();
    for(int i=0;i<5;i++) air.collision();
    check(air.getHealth()==0 && !air.getAliveOrDead() && air.returnDeathcounter()==deaths+1,
      "Air enemy must die and count exactly once at zero health");
    air.collision(); check(air.returnDeathcounter()==deaths+1, "Dead enemy must not count twice");
    for(int i=0;i<9;i++) { clearDamageCooldown(player); player.collision(); }
    check(player.getHealth()==0, "Ten hits must reach zero health");
    int before = player.getXpos(); keys("d"); player.processPlayer();
    check(player.getXpos()==before, "Dead player must stop moving");
    player.collision(); check(player.getHealth()==0, "Health must not become negative");
    System.out.println("PASS: body hits, damage, cooldown, consumed shots, crouch/jump dodges, movement, weapon speeds, enemy deaths and player death.");
    System.exit(0);
  }
}
