# Shape Storm - Background Music Setup Guide

## Current Music Configuration

The game is already configured to play background music automatically! Here's what's set up:

### Audio Element (index.html:106)
```html
<audio id="game-music" src="https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3" loop></audio>
```

### Game Integration (game.js:906-912)
The music automatically starts when you click "START GAME":
- Music starts from the beginning (currentTime = 0)
- Loops continuously during gameplay
- Fades out on game over
- Pauses when you pause the game

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

## Music Behavior

| Event | Music Behavior |
|-------|---------------|
| Game Start | Plays from beginning, loops |
| Pause | Pauses music |
| Resume | Resumes from pause point |
| Game Over | Fades out over 1 second |
| Return to Menu | Stops and resets to beginning |
| Boss Fight | Continues playing (boss spawns after ~2 minutes) |

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
