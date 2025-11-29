# Shape Storm - Multi-Track Music System Guide

## Current Music Configuration

The game features a **3-track progressive music system** with BPM synchronization and unique gameplay mechanics for each track!

### Audio Elements (index.html:106-112)
```html
<!-- Track 1: 122 BPM - Opening gameplay -->
<audio id="track-1" src="Track 1.mp3"></audio>

<!-- Track 2: 120 BPM - Mid-game with laser beams -->
<audio id="track-2" src="Track 2.mp3"></audio>

<!-- Track 3: 220 BPM - Boss fight -->
<audio id="track-3" src="Track 3.mp3"></audio>
```

**Music Files Required:**
- Place `Track 1.mp3`, `Track 2.mp3`, and `Track 3.mp3` in the same folder as `index.html`
- Track 1: 122 BPM retrowave/synthwave music
- Track 2: 120 BPM with intense energy (laser chaos phase)
- Track 3: 220 BPM high-energy boss fight music

### Track Progression System
The game automatically transitions between tracks:
1. **Track 1 (122 BPM)**: Plays at game start
2. **Track 2 (120 BPM)**: Plays when Track 1 ends
3. **Track 3 (220 BPM)**: Plays when Track 2 ends (triggers boss fight)

## How to Test the Music

1. **Open the game** in a web browser (Chrome, Firefox, or Edge recommended)
2. **Click "START GAME"** - the music should begin playing automatically
3. **Listen** for the retrowave/tech house background music

## Browser Autoplay Policies

Modern browsers may block autoplay. If you don't hear music:

### Fix 1: User Interaction Required
- Music will only play after you click "START GAME" (user interaction)
- This should work in all browsers

### Fix 2: Check Browser Console
1. Press `F12` to open Developer Tools
2. Check the Console tab for errors like:
   - "Audio play failed: NotAllowedError"
   - "The play() request was interrupted"

### Fix 3: Enable Autoplay (Chrome)
1. Click the lock icon in the address bar
2. Find "Sound" setting
3. Set to "Allow"

## Replacing the Music

### Option 1: Use Your Own File

1. Add your music file to the project folder:
   ```
   /home/user/shapestorm/music/retrowave.mp3
   ```

2. Update index.html line 106:
   ```html
   <audio id="game-music" src="music/retrowave.mp3" loop></audio>
   ```

### Option 2: Use a Different URL

Update the src attribute to any publicly accessible music file:
```html
<audio id="game-music" src="YOUR_MUSIC_URL_HERE.mp3" loop></audio>
```

### Recommended File Formats
- **MP3** - Best browser compatibility
- **OGG** - Good quality, smaller files
- **WAV** - Uncompressed, large files (not recommended)

## Free Royalty-Free Music Sources

1. **Mixkit** (current source)
   - https://mixkit.co/free-stock-music/
   - Free to use, no attribution required

2. **Incompetech**
   - https://incompetech.com/music/royalty-free/
   - Free with attribution

3. **Purple Planet**
   - https://www.purple-planet.com/
   - Free with attribution

4. **Bensound**
   - https://www.bensound.com/
   - Free with attribution

## BPM Configuration and Gameplay Mechanics

### Track 1: 122 BPM - Opening Phase
- **Standard gameplay**: Break blocks, collect powerups, avoid losing balls
- **Duration**: Until track completes (varies by music file)
- **Mechanics**: Normal ball physics and shape rotation

### Track 2: 120 BPM - Laser Chaos
- **WARNING**: "LASER WARNING" message displays when Track 2 begins
- **New Mechanic**: Edge laser beams fire from screen borders
  - Lasers charge for 1 second (dashed line indicator)
  - Lasers fire for 0.5 seconds (solid red beam)
  - Lasers destroy walls AND blocks on contact
  - **Shield powerup** is the only protection
  - Spawns every 8 seconds from random edge (top/bottom/left/right)
- **Strategic Tip**: Prioritize shield powerups during this phase!

### Track 3: 220 BPM - Hypercube Boss Fight
- **Boss**: Hypercube appears at screen center
- **Boss Behavior**:
  - Constantly morphs between 4 shapes (cube, octahedron, diamond, star)
  - Color cycles through spectrum (red → magenta → purple → cyan → yellow)
  - Fires 4-directional lasers every 1.5 seconds
  - 50 HP total
- **Boss Lasers**: Destroy balls on contact (shield protects)
- **Victory**: Defeat Hypercube to win the game
- **Faster BPM**: 220 BPM creates intense, high-speed gameplay

## Music Behavior

| Event | Music Behavior |
|-------|---------------|
| Game Start | Plays Track 1 (122 BPM) |
| Track 1 Ends | Auto-transitions to Track 2 (120 BPM) |
| Track 2 Ends | Auto-transitions to Track 3 (220 BPM) + spawns Hypercube boss |
| Pause | Pauses current track |
| Resume | Resumes current track from pause point |
| Game Over | Fades out current track over 1 second |
| Return to Menu | Stops all tracks and resets to beginning |

## Troubleshooting

### Music doesn't play
1. Check browser console for errors (F12)
2. Verify the audio file URL is accessible
3. Try clicking "START GAME" again (user interaction required)
4. Check your browser's sound settings (not muted)

### Music is too loud/quiet
Add a volume control in index.html:
```html
<audio id="game-music" src="..." loop volume="0.5"></audio>
```
Or adjust programmatically in game.js (line 910):
```javascript
this.music.volume = 0.5; // 50% volume
this.music.play().catch(e => console.log('Audio play failed:', e));
```

### Music stutters or lags
- Use a smaller file size (compress your audio)
- Use MP3 format instead of WAV
- Ensure the file is hosted locally or on a fast CDN

## Current Setup Summary

✅ Music element configured in HTML
✅ Autoplay on game start
✅ Loop enabled
✅ Fade out on game over
✅ Pause/resume functionality
✅ Free royalty-free track included

**The music should already be working!** Just open the game and click "START GAME".
