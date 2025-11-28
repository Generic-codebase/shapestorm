# 🌊 SHAPE STORM

A retro wave music game where you trap bouncing balls inside geometric shapes while destroying blocks and collecting powerups!

## 🎮 Game Overview

Shape Storm is a unique music-driven arcade game with a stunning retro wave aesthetic. Control geometric shapes that bounce to the beat, trap balls inside them, and destroy blocks to earn points. But be careful - each bounce breaks a wall, and if all your balls escape, it's game over!

## ✨ Features

### Retro Wave Aesthetic
- **Animated grid background** with neon colors
- **Black background** with glowing neon elements
- **Cyan, magenta, yellow, and purple** color palette
- **Smooth glow effects** on all game elements

### Core Gameplay
- **Massive rotating container** - Shape covers 80% of screen, acting as a true container
- **Music-driven mechanics** - Shapes move to the beat
- **Rotating blocks** - All blocks inside rotate with the shape!
- **Ball physics** - Realistic bouncing and collision
- **Wall breaking** - Walls disappear when hit (unless protected)
- **Multiple geometric shapes** - Triangle, Square, Pentagon, Hexagon, Octagon
- **Very slow rotation** - Gentle rotation controlled by mouse movement
- **Shape swapping** - Switch between shapes in your pool
- **Transparent center** - See all the action inside the shape

### Power-Up System
Destroy special (yellow) blocks to collect powerful powerups:

1. **×2 Multiply** (Cyan) - Doubles all balls in play
2. **+1 Extra Life** (Yellow) - Respawn once if all balls are lost
3. **🛡 Shield Walls** (Green) - Walls cannot break for 15 seconds
4. **⚡ Power Ball** (Red) - Smash through multiple blocks for 15 seconds
5. **♺ Regeneration** (Magenta) - Continuously regenerate walls for 15 seconds
6. **⚡⚡ Storm** (Orange) - 2x ball speed, faster shape spawning

### Shape Pool System
- **Queue of available shapes** displayed in bottom-right
- **15 second spawn time** for each new shape
- **Space bar** to swap to next available shape
- **Visual timer** shows spawn progress

### Boss Fight
- **End-game boss** appears after the music track ends
- **50 HP** to defeat
- **Rotating attack pattern** with multiple hit points
- **Massive score bonus** for victory

### Scoring
Score is calculated based on:
- **Blocks destroyed** (10 points each)
- **Boss hits** (50 points each)
- **Boss defeat** (1000 point bonus)
- **Difficulty multiplier** (0.75x Easy, 1.0x Normal, 1.5x Hard)

### Persistence
- **High scores saved** to browser localStorage
- **Difficulty settings** persist between sessions

## 🕹️ Controls

| Control | Action |
|---------|--------|
| **Mouse Movement** | Rotate current shape slowly |
| **Space Bar** | Swap to next shape in pool |
| **ESC** | Pause/Unpause game |

## 🎯 How to Play

1. **Start the game** - Select difficulty and press START GAME
2. **Control your shape** - Move your mouse to rotate the shape
3. **Keep balls inside** - The ball bounces inside your shape
4. **Destroy blocks** - Hit blocks to score points
5. **Collect powerups** - Grab falling powerups for special abilities
6. **Manage walls** - Each bounce breaks a wall segment
7. **Swap shapes** - Press SPACE to switch shapes (15s cooldown)
8. **Defeat the boss** - Survive until the music ends to face the boss
9. **Win!** - Destroy the boss to complete the game

## 🎨 Technical Details

### Built With
- **Pure JavaScript** - No frameworks required
- **HTML5 Canvas** - Hardware-accelerated rendering
- **CSS3 Animations** - Smooth visual effects
- **Web Audio API** - Music integration (ready for audio files)

### Game Architecture
- **Object-oriented design** - Clean class structure
- **60 FPS game loop** - Smooth performance
- **Collision detection** - Precise point-to-line distance calculations
- **Vector physics** - Realistic ball reflection
- **State management** - Clean game state transitions

### Files
```
shapestorm/
├── index.html      # Main HTML structure
├── style.css       # Retro wave styling
├── game.js         # Complete game engine
└── README.md       # This file
```

## 🚀 Getting Started

1. **Open `index.html`** in a modern web browser
2. **Select difficulty** (Easy, Normal, or Hard)
3. **Press START GAME**
4. **Enjoy!**

No installation, build process, or dependencies required!

## 🎵 Music Integration

The game is designed to work with music tracks. To add your own music:

1. **Download a music file** (MP3, OGG, etc.) and place it in the game directory
2. **Update the audio source** in `index.html` (line 103):
   ```html
   <audio id="game-music" src="music.mp3" loop></audio>
   ```
3. The game will automatically:
   - Play music when you start
   - Pause music when you pause the game
   - Stop music when the game ends
   - Spawn the boss when the music track ends
   - Sync shape movements to a beat (500ms interval)

### Recommended Music Sources (Free & Royalty-Free):
- **Incompetech** (incompetech.com) - Great for synthwave tracks
- **Free Music Archive** (freemusicarchive.org) - Filter by "Electronic" genre
- **YouTube Audio Library** - Search for "retrowave" or "synthwave"
- **Pixabay Music** (pixabay.com/music) - Free to use

### For Advanced Beat Detection:
- **Web Audio API analyser** for real-time beat detection
- **Pre-processed beat maps** for precise timing
- Modify `this.beatInterval` in game.js to match your track's BPM

## 🎮 Game Tips

1. **Use rotation strategically** - Position walls to bounce balls toward blocks
2. **Save shields for emergencies** - Don't waste powerups
3. **Multiply early** - More balls = more destruction
4. **Storm is risky** - 2x speed is harder to control but spawns shapes faster
5. **Boss strategy** - Use multi-ball and power ball for maximum damage
6. **Shape selection matters** - More sides = more walls, but harder to control

## 🏆 Difficulty Modes

- **Easy (0.75x)** - Slower ball speed, good for learning
- **Normal (1.0x)** - Standard gameplay experience
- **Hard (1.5x)** - Faster balls, higher score potential

## 🔧 Customization

Want to modify the game? Here are some easy tweaks:

### In `game.js`:
```javascript
// Change ball speed
const BASE_BALL_SPEED = 2.5; // Increase for faster gameplay (default: 2.5)

// Change shape spawn time
const SHAPE_SPAWN_TIME = 15000; // Milliseconds

// Change powerup duration
const POWERUP_DURATION = 15000; // Milliseconds

// Change boss HP
const BOSS_HP = 50; // Higher = harder boss

// Change music duration before boss
this.musicDuration = 120000; // 2 minutes
```

### In `style.css`:
```css
/* Change color scheme */
--cyan: #0ff;
--magenta: #f0f;
--yellow: #ff0;
```

## 📊 Game Stats

The game tracks:
- **Current Score** - Points earned this session
- **High Score** - Best score ever (saved)
- **Balls in Play** - Current ball count
- **Difficulty** - Current multiplier
- **Active Powerups** - What's currently boosting you
- **Shape Pool** - Available shapes and spawn timers

## 🐛 Browser Compatibility

Tested and working on:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Opera

Requires:
- HTML5 Canvas support
- ES6 JavaScript
- localStorage API

## 📝 Credits

Created as a retro wave music game experience.

**Inspired by:**
- Retro wave aesthetic and 80s synthwave culture
- Classic breakout and brick-breaker games
- Music rhythm games

## 🎊 Future Enhancements

Potential additions:
- [ ] Real music tracks with beat detection
- [ ] More geometric shapes (star, diamond, etc.)
- [ ] Additional powerups
- [ ] Multiple boss types
- [ ] Level progression system
- [ ] Online leaderboards
- [ ] Custom music upload
- [ ] Particle effects
- [ ] Sound effects

## 📜 License

Free to use, modify, and distribute. Have fun! 🎮

---

**ENJOY THE STORM! ⚡🌊**
