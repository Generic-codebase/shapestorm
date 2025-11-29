// ============================================================================
// SHAPE STORM - Retro Wave Music Game
// ============================================================================

// Game Constants
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 700;
const BASE_BALL_SPEED = 1.5; // Even slower baseline
const BALL_SPEED_INCREMENT = 0.15; // Speed increase per level
const MAX_BALLS = 8; // Maximum balls allowed
const SHAPE_SPAWN_TIME = 4000; // 4 seconds
const POWERUP_DURATION = 4000; // 4 seconds
const BOSS_HP = 50;
const SHAPE_SIZE = 320; // Larger shape (was 280)

// Music Track Configuration
const TRACK_CONFIG = {
    1: { bpm: 122, laserBeams: false },
    2: { bpm: 120, laserBeams: true },
    3: { bpm: 220, laserBeams: false, boss: true }
};

// Color Palette
const COLORS = {
    cyan: '#0ff',
    magenta: '#f0f',
    yellow: '#ff0',
    green: '#0f0',
    red: '#f00',
    orange: '#f80',
    purple: '#80f'
};

// ============================================================================
// SOUND SYSTEM
// ============================================================================

class SoundSystem {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
    }

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API not supported');
            this.enabled = false;
        }
    }

    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = type;
        oscillator.frequency.value = frequency;

        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    blockBreak() {
        this.playTone(800, 0.1, 'square', 0.2);
        setTimeout(() => this.playTone(400, 0.1, 'square', 0.15), 50);
    }

    powerUp() {
        this.playTone(523.25, 0.1, 'sine', 0.2);
        setTimeout(() => this.playTone(659.25, 0.1, 'sine', 0.2), 80);
        setTimeout(() => this.playTone(783.99, 0.15, 'sine', 0.2), 160);
    }

    wallBounce() {
        this.playTone(200, 0.05, 'triangle', 0.15);
    }

    bossHit() {
        this.playTone(100, 0.2, 'sawtooth', 0.25);
    }

    shapeReady() {
        this.playTone(440, 0.1, 'sine', 0.15);
        setTimeout(() => this.playTone(554.37, 0.1, 'sine', 0.15), 100);
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function randomRange(min, max) {
    return Math.random() * (max - min) + min;
}

function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// ============================================================================
// BALL CLASS
// ============================================================================

class Ball {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.radius = 4; // 50% smaller
        this.color = COLORS.cyan;
        this.trail = [];
        this.maxTrail = 10;
        this.wallContactTime = 0;
        this.lastContactPoint = null;
        this.supercharged = false;
        this.superchargedEndTime = 0;
    }

    update(speedMultiplier = 1) {
        // Extended trail for supercharged balls
        const maxTrail = this.supercharged ? 20 : 10;
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > maxTrail) {
            this.trail.shift();
        }

        // Apply supercharge speed boost
        const superchargeMultiplier = this.supercharged ? 2 : 1;
        this.x += this.vx * speedMultiplier * superchargeMultiplier;
        this.y += this.vy * speedMultiplier * superchargeMultiplier;
    }

    draw(ctx) {
        const displayColor = this.supercharged ? COLORS.yellow : this.color;

        // Draw trail (afterimage effect when supercharged)
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = i / this.trail.length;
            ctx.beginPath();
            ctx.arc(this.trail[i].x, this.trail[i].y, this.radius * alpha, 0, Math.PI * 2);
            ctx.fillStyle = displayColor + Math.floor(alpha * 100).toString(16).padStart(2, '0');
            ctx.fill();
        }

        // Draw ball
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = displayColor;
        ctx.fill();
        ctx.strokeStyle = this.supercharged ? COLORS.orange : '#fff';
        ctx.lineWidth = this.supercharged ? 3 : 2;
        ctx.stroke();

        // Enhanced glow for supercharged
        ctx.shadowBlur = this.supercharged ? 30 : 20;
        ctx.shadowColor = displayColor;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    clone() {
        return new Ball(this.x, this.y, -this.vx, -this.vy);
    }
}

// ============================================================================
// GEOMETRIC SHAPES
// ============================================================================

class GeometricShape {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.rotation = 0;
        this.walls = []; // Array of wall states (true = intact, false = broken)
        this.color = COLORS.magenta;
        this.vertices = [];
        this.initWalls();
    }

    initWalls() {
        const sides = this.getSides();
        this.walls = new Array(sides).fill(true);
    }

    getSides() {
        return 3; // Override in subclasses
    }

    getVertices() {
        const sides = this.getSides();
        const vertices = [];
        for (let i = 0; i < sides; i++) {
            const angle = (Math.PI * 2 * i) / sides + this.rotation;
            vertices.push({
                x: this.x + Math.cos(angle) * this.size,
                y: this.y + Math.sin(angle) * this.size
            });
        }
        return vertices;
    }

    draw(ctx, scale = 1.0, alpha = 1.0) {
        const vertices = this.getVertices();

        // Determine color (flash to yellow if shape ready)
        const displayColor = this.flashReady ? COLORS.yellow : this.color;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Draw filled shape (transparent center - no fill)
        // ctx.beginPath();
        // ctx.moveTo(vertices[0].x, vertices[0].y);
        // for (let i = 1; i < vertices.length; i++) {
        //     ctx.lineTo(vertices[i].x, vertices[i].y);
        // }
        // ctx.closePath();
        // ctx.fillStyle = this.color + '11';
        // ctx.fill();

        // Apply scale transformation
        ctx.translate(this.x, this.y);
        ctx.scale(scale, scale);
        ctx.translate(-this.x, -this.y);

        // Draw walls
        for (let i = 0; i < vertices.length; i++) {
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % vertices.length];

            if (this.walls[i]) {
                ctx.strokeStyle = displayColor;
                ctx.lineWidth = this.flashReady ? 5 : 4;
            } else {
                // Broken walls - flickering dimly colored lines
                const flicker = Math.random() > 0.5 ? 0.2 : 0.1;
                ctx.strokeStyle = this.color + Math.floor(flicker * 100).toString(16).padStart(2, '0');
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
            }

            ctx.beginPath();
            ctx.moveTo(v1.x, v1.y);
            ctx.lineTo(v2.x, v2.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Glow effect for intact walls
            if (this.walls[i]) {
                ctx.shadowBlur = this.flashReady ? 20 : 15;
                ctx.shadowColor = displayColor;
                ctx.beginPath();
                ctx.moveTo(v1.x, v1.y);
                ctx.lineTo(v2.x, v2.y);
                ctx.stroke();
                ctx.shadowBlur = 0;
            }
        }

        // Draw vertices
        vertices.forEach(v => {
            ctx.beginPath();
            ctx.arc(v.x, v.y, this.flashReady ? 5 : 4, 0, Math.PI * 2);
            ctx.fillStyle = displayColor;
            ctx.fill();
        });

        ctx.restore();
    }

    breakWall(wallIndex) {
        if (wallIndex >= 0 && wallIndex < this.walls.length) {
            this.walls[wallIndex] = false;
        }
    }

    regenerateWalls() {
        this.walls.fill(true);
    }

    rotate(angle) {
        this.rotation += angle;
    }

    isPointInside(px, py) {
        const vertices = this.getVertices();
        let inside = false;

        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const xi = vertices[i].x, yi = vertices[i].y;
            const xj = vertices[j].x, yj = vertices[j].y;

            const intersect = ((yi > py) !== (yj > py)) &&
                (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }

        return inside;
    }

    checkCollision(ball) {
        const vertices = this.getVertices();

        for (let i = 0; i < vertices.length; i++) {
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % vertices.length];

            // Check distance from ball to line segment
            const { distance: dist, point } = this.pointToLineDistance(
                ball.x, ball.y, v1.x, v1.y, v2.x, v2.y
            );

            if (dist < ball.radius) {
                return { collision: true, wallIndex: i, point };
            }
        }

        return { collision: false };
    }

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;

        return {
            distance: Math.sqrt(dx * dx + dy * dy),
            point: { x: xx, y: yy }
        };
    }

    reflectBall(ball, wallIndex) {
        const vertices = this.getVertices();
        const v1 = vertices[wallIndex];
        const v2 = vertices[(wallIndex + 1) % vertices.length];

        // Calculate wall normal
        const dx = v2.x - v1.x;
        const dy = v2.y - v1.y;
        const nx = -dy;
        const ny = dx;
        const len = Math.sqrt(nx * nx + ny * ny);
        const normalX = nx / len;
        const normalY = ny / len;

        // Reflect velocity
        const dot = ball.vx * normalX + ball.vy * normalY;
        ball.vx = ball.vx - 2 * dot * normalX;
        ball.vy = ball.vy - 2 * dot * normalY;

        // Add some randomness
        ball.vx += randomRange(-0.5, 0.5);
        ball.vy += randomRange(-0.5, 0.5);

        // Normalize speed
        const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
        const targetSpeed = BASE_BALL_SPEED;
        ball.vx = (ball.vx / speed) * targetSpeed;
        ball.vy = (ball.vy / speed) * targetSpeed;
    }
}

class Triangle extends GeometricShape {
    getSides() { return 3; }

    getVertices() {
        // Triangles are 15% larger for easier gameplay
        const sides = this.getSides();
        const vertices = [];
        const enlargedSize = this.size * 1.15;
        for (let i = 0; i < sides; i++) {
            const angle = (Math.PI * 2 * i) / sides + this.rotation;
            vertices.push({
                x: this.x + Math.cos(angle) * enlargedSize,
                y: this.y + Math.sin(angle) * enlargedSize
            });
        }
        return vertices;
    }
}

class Square extends GeometricShape {
    getSides() { return 4; }

    getVertices() {
        const half = this.size / Math.sqrt(2);
        const vertices = [];
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI / 4) + (Math.PI / 2) * i + this.rotation;
            vertices.push({
                x: this.x + Math.cos(angle) * half * Math.sqrt(2),
                y: this.y + Math.sin(angle) * half * Math.sqrt(2)
            });
        }
        return vertices;
    }
}

class Pentagon extends GeometricShape {
    getSides() { return 5; }
}

class Hexagon extends GeometricShape {
    getSides() { return 6; }
}

class Octagon extends GeometricShape {
    getSides() { return 8; }
}

// ============================================================================
// BLOCK CLASS
// ============================================================================

class Block {
    constructor(x, y, type = 'normal', shapeX = 0, shapeY = 0) {
        // Store relative position to shape center
        this.relativeX = x - shapeX;
        this.relativeY = y - shapeY;
        this.width = 20; // 50% smaller
        this.height = 20; // 50% smaller
        this.type = type; // 'normal' or 'special' (drops powerup)
        this.hp = type === 'special' ? 2 : 1;
        this.color = type === 'special' ? COLORS.yellow : COLORS.green;
        this.destroyed = false;
    }

    getWorldPosition(shapeX, shapeY, shapeRotation) {
        // Transform relative position based on shape rotation
        const cos = Math.cos(shapeRotation);
        const sin = Math.sin(shapeRotation);

        const rotatedX = this.relativeX * cos - this.relativeY * sin;
        const rotatedY = this.relativeX * sin + this.relativeY * cos;

        return {
            x: shapeX + rotatedX,
            y: shapeY + rotatedY
        };
    }

    draw(ctx, shapeX, shapeY, shapeRotation) {
        if (this.destroyed) return;

        const pos = this.getWorldPosition(shapeX, shapeY, shapeRotation);

        ctx.save();
        ctx.translate(pos.x + this.width / 2, pos.y + this.height / 2);
        ctx.rotate(shapeRotation);

        ctx.fillStyle = this.color + '44';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);

        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.shadowBlur = 0;

        // HP indicator for special blocks
        if (this.type === 'special' && this.hp > 1) {
            ctx.fillStyle = '#fff';
            ctx.font = '12px Orbitron';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.hp, 0, 0);
        }

        ctx.restore();
    }

    checkCollision(ball, shapeX, shapeY, shapeRotation) {
        if (this.destroyed) return false;

        const pos = this.getWorldPosition(shapeX, shapeY, shapeRotation);

        return ball.x + ball.radius > pos.x &&
               ball.x - ball.radius < pos.x + this.width &&
               ball.y + ball.radius > pos.y &&
               ball.y - ball.radius < pos.y + this.height;
    }

    hit() {
        this.hp--;
        if (this.hp <= 0) {
            this.destroyed = true;
            return true; // Block destroyed
        }
        return false;
    }
}

// ============================================================================
// POWERUP CLASS
// ============================================================================

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = 15;
        this.collected = false;
        this.vy = 2;

        const types = {
            'multiply': { color: COLORS.cyan, symbol: '+⚪' },
            'extra_life': { color: COLORS.yellow, symbol: '+1' },
            'shield': { color: COLORS.green, symbol: '🛡' },
            'power': { color: COLORS.red, symbol: '⚡' },
            'regen': { color: COLORS.magenta, symbol: '♺' },
            'storm': { color: COLORS.orange, symbol: '⚡⚡' }
        };

        this.color = types[type].color;
        this.symbol = types[type].symbol;
    }

    update() {
        this.y += this.vy;
    }

    draw(ctx) {
        if (this.collected) return;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color + '44';
        ctx.fill();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#fff';
        ctx.font = '16px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.symbol, this.x, this.y);
    }

    checkCollision(ball) {
        if (this.collected) return false;
        return distance(this.x, this.y, ball.x, ball.y) < this.radius + ball.radius;
    }
}

// ============================================================================
// PARTICLE CLASS
// ============================================================================

class Particle {
    constructor(x, y, color = COLORS.cyan) {
        this.x = x;
        this.y = y;
        this.vx = randomRange(-3, 3);
        this.vy = randomRange(-3, 3);
        this.radius = randomRange(1, 3);
        this.color = color;
        this.lifetime = randomRange(300, 600);
        this.age = 0;
        this.gravity = 0.1;
    }

    update(deltaTime) {
        this.age += deltaTime;
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.vx *= 0.99;
        this.vy *= 0.99;
    }

    draw(ctx) {
        const alpha = 1 - (this.age / this.lifetime);
        if (alpha <= 0) return;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        // Glow
        ctx.shadowBlur = 5;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.age >= this.lifetime;
    }
}

// ============================================================================
// LASER BEAM CLASS (for Track 2)
// ============================================================================

class LaserBeam {
    constructor(side) {
        this.side = side; // 'top', 'right', 'bottom', 'left'
        this.chargeTime = 1000; // 1 second charge
        this.fireTime = 500; // 0.5 second fire
        this.age = 0;
        this.state = 'charging'; // 'charging', 'firing', 'done'
        this.width = 3; // Narrow beam
        this.color = COLORS.red;

        // Calculate beam position and direction
        switch(side) {
            case 'top':
                this.x1 = Math.random() * CANVAS_WIDTH;
                this.y1 = 0;
                this.x2 = this.x1;
                this.y2 = CANVAS_HEIGHT;
                break;
            case 'bottom':
                this.x1 = Math.random() * CANVAS_WIDTH;
                this.y1 = CANVAS_HEIGHT;
                this.x2 = this.x1;
                this.y2 = 0;
                break;
            case 'left':
                this.x1 = 0;
                this.y1 = Math.random() * CANVAS_HEIGHT;
                this.x2 = CANVAS_WIDTH;
                this.y2 = this.y1;
                break;
            case 'right':
                this.x1 = CANVAS_WIDTH;
                this.y1 = Math.random() * CANVAS_HEIGHT;
                this.x2 = 0;
                this.y2 = this.y1;
                break;
        }
    }

    update(deltaTime) {
        this.age += deltaTime;

        if (this.state === 'charging' && this.age >= this.chargeTime) {
            this.state = 'firing';
            this.age = 0;
        } else if (this.state === 'firing' && this.age >= this.fireTime) {
            this.state = 'done';
        }
    }

    draw(ctx) {
        if (this.state === 'charging') {
            // Draw charging indicator
            const alpha = (this.age / this.chargeTime) * 0.7;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.width;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(this.x1, this.y1);
            ctx.lineTo(this.x2, this.y2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            // Draw charging glow at origin
            ctx.save();
            ctx.shadowBlur = 30;
            ctx.shadowColor = this.color;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x1, this.y1, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (this.state === 'firing') {
            // Draw firing beam
            ctx.save();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.width;
            ctx.shadowBlur = 20;
            ctx.shadowColor = this.color;
            ctx.beginPath();
            ctx.moveTo(this.x1, this.y1);
            ctx.lineTo(this.x2, this.y2);
            ctx.stroke();

            // Draw intense glow
            ctx.lineWidth = this.width * 2;
            ctx.globalAlpha = 0.5;
            ctx.stroke();
            ctx.restore();
        }
    }

    isDone() {
        return this.state === 'done';
    }

    isFiring() {
        return this.state === 'firing';
    }

    // Check if point intersects beam (for collision detection)
    intersectsPoint(x, y, radius = 0) {
        if (!this.isFiring()) return false;

        // Point-to-line distance
        const A = x - this.x1;
        const B = y - this.y1;
        const C = this.x2 - this.x1;
        const D = this.y2 - this.y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;

        if (param < 0) {
            xx = this.x1;
            yy = this.y1;
        } else if (param > 1) {
            xx = this.x2;
            yy = this.y2;
        } else {
            xx = this.x1 + param * C;
            yy = this.y1 + param * D;
        }

        const dx = x - xx;
        const dy = y - yy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        return dist < (this.width + radius);
    }

    // Check if beam intersects a line segment (for walls)
    intersectsLine(x1, y1, x2, y2) {
        if (!this.isFiring()) return false;

        // Line-line intersection
        const denom = ((this.y2 - this.y1) * (x2 - x1)) - ((this.x2 - this.x1) * (y2 - y1));
        if (denom === 0) return false;

        const ua = (((this.x2 - this.x1) * (y1 - this.y1)) - ((this.y2 - this.y1) * (x1 - this.x1))) / denom;
        const ub = (((x2 - x1) * (y1 - this.y1)) - ((y2 - y1) * (x1 - this.x1))) / denom;

        return (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1);
    }
}

// ============================================================================
// FLOATING TEXT CLASS (for score display)
// ============================================================================

class FloatingText {
    constructor(x, y, text, color = '#fff') {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.lifetime = 1000; // 1 second
        this.age = 0;
        this.vy = -2; // Float upward
    }

    update(deltaTime) {
        this.age += deltaTime;
        this.y += this.vy;
        this.vy *= 0.95; // Slow down
    }

    draw(ctx) {
        const alpha = 1 - (this.age / this.lifetime);
        if (alpha <= 0) return;

        ctx.save();
        ctx.font = 'bold 20px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha;

        // Glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillText(this.text, this.x, this.y);
        ctx.shadowBlur = 0;

        ctx.restore();
    }

    isDead() {
        return this.age >= this.lifetime;
    }
}

// ============================================================================
// BLACK HOLE EFFECT (for shape swapping)
// ============================================================================

class BlackHole {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 0;
        this.maxRadius = 80;
        this.age = 0;
        this.lifetime = 1000; // 1 second
        this.active = true;
    }

    update(deltaTime) {
        this.age += deltaTime;

        // Grow radius for first half, then shrink
        const progress = this.age / this.lifetime;
        if (progress < 0.3) {
            // Grow quickly
            this.radius = (progress / 0.3) * this.maxRadius;
        } else if (progress > 0.7) {
            // Shrink quickly at the end
            this.radius = ((1 - progress) / 0.3) * this.maxRadius;
        } else {
            // Stay at max size in the middle
            this.radius = this.maxRadius;
        }

        if (this.age >= this.lifetime) {
            this.active = false;
        }
    }

    applyGravity(ball) {
        // Calculate direction to black hole center
        const dx = this.x - ball.x;
        const dy = this.y - ball.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 1) { // Avoid division by zero
            // Normalize direction
            const nx = dx / dist;
            const ny = dy / dist;

            // Gentle gravity that gets stronger as balls get closer
            // Use inverse distance for natural gravity feel
            const maxPullDistance = 300; // Maximum distance at which gravity has effect
            if (dist < maxPullDistance) {
                // Gentle pull that increases as balls get closer
                const pullStrength = 0.08; // Very gentle base strength
                const distanceFactor = 1 - (dist / maxPullDistance); // 0 to 1, higher when closer
                const force = pullStrength * distanceFactor;

                ball.vx += nx * force;
                ball.vy += ny * force;
            }

            // Apply slight damping to slow balls down as they approach center
            if (dist < this.maxRadius * 2) {
                const dampingFactor = 0.98;
                ball.vx *= dampingFactor;
                ball.vy *= dampingFactor;
            }
        }
    }

    draw(ctx) {
        ctx.save();

        // Draw event horizon (dark core)
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
        gradient.addColorStop(0.3, 'rgba(50, 0, 50, 0.9)');
        gradient.addColorStop(0.6, 'rgba(100, 0, 100, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 0, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw accretion disk (rotating ring)
        const diskRadius = this.radius * 0.7;
        ctx.strokeStyle = COLORS.magenta;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.8;
        ctx.shadowBlur = 20;
        ctx.shadowColor = COLORS.magenta;

        for (let i = 0; i < 3; i++) {
            const r = diskRadius + i * 10;
            ctx.globalAlpha = 0.6 - i * 0.2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw distortion effect (rays)
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = COLORS.cyan;
        ctx.lineWidth = 2;
        const rayCount = 12;
        for (let i = 0; i < rayCount; i++) {
            const angle = (Math.PI * 2 * i) / rayCount + (this.age * 0.002);
            const innerR = this.radius * 0.5;
            const outerR = this.radius * 1.3;

            ctx.beginPath();
            ctx.moveTo(
                this.x + Math.cos(angle) * innerR,
                this.y + Math.sin(angle) * innerR
            );
            ctx.lineTo(
                this.x + Math.cos(angle) * outerR,
                this.y + Math.sin(angle) * outerR
            );
            ctx.stroke();
        }

        ctx.restore();
    }

    isActive() {
        return this.active;
    }
}

// ============================================================================
// HYPERCUBE BOSS CLASS (for Track 3)
// ============================================================================

class Hypercube {
    constructor() {
        this.x = CANVAS_WIDTH / 2;
        this.y = CANVAS_HEIGHT / 2;
        this.size = 80;
        this.hp = BOSS_HP;
        this.maxHp = BOSS_HP;
        this.defeated = false;
        this.rotation = 0;
        this.rotationSpeed = 0.02;

        // Shape morphing
        this.currentShape = 'cube';
        this.shapeTimer = 0;
        this.shapeInterval = 2000; // Change shape every 2 seconds
        this.shapes = ['cube', 'octahedron', 'diamond', 'star'];

        // Laser attacks
        this.laserTimer = 0;
        this.laserInterval = 1500; // Fire laser every 1.5 seconds
        this.lasers = [];

        // Colors cycle through spectrum
        this.colorPhase = 0;
        this.colors = [COLORS.red, COLORS.magenta, COLORS.purple, COLORS.cyan, COLORS.yellow];
    }

    update(deltaTime) {
        this.rotation += this.rotationSpeed;
        this.shapeTimer += deltaTime;
        this.laserTimer += deltaTime;
        this.colorPhase = (this.colorPhase + 0.01) % this.colors.length;

        // Morph to next shape
        if (this.shapeTimer >= this.shapeInterval) {
            this.shapeTimer = 0;
            const currentIndex = this.shapes.indexOf(this.currentShape);
            this.currentShape = this.shapes[(currentIndex + 1) % this.shapes.length];
        }

        // Fire laser
        if (this.laserTimer >= this.laserInterval) {
            this.laserTimer = 0;
            this.fireLaser();
        }

        // Update boss lasers
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            this.lasers[i].update(deltaTime);
            if (this.lasers[i].isDone()) {
                this.lasers.splice(i, 1);
            }
        }
    }

    fireLaser() {
        // Fire 4 lasers in cardinal directions
        const directions = [
            { x: 1, y: 0 },   // right
            { x: -1, y: 0 },  // left
            { x: 0, y: 1 },   // down
            { x: 0, y: -1 }   // up
        ];

        directions.forEach(dir => {
            this.lasers.push({
                x1: this.x,
                y1: this.y,
                x2: this.x + dir.x * 1000,
                y2: this.y + dir.y * 1000,
                age: 0,
                lifetime: 500,
                width: 4
            });
        });
    }

    draw(ctx) {
        // Get current color
        const colorIndex = Math.floor(this.colorPhase);
        const color = this.colors[colorIndex];

        // Draw hypercube based on current shape
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        switch(this.currentShape) {
            case 'cube':
                this.drawCube(ctx, color);
                break;
            case 'octahedron':
                this.drawOctahedron(ctx, color);
                break;
            case 'diamond':
                this.drawDiamond(ctx, color);
                break;
            case 'star':
                this.drawStar(ctx, color);
                break;
        }

        ctx.restore();

        // Draw boss lasers
        this.lasers.forEach(laser => {
            const alpha = 1 - (laser.age / laser.lifetime);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = color;
            ctx.lineWidth = laser.width;
            ctx.shadowBlur = 20;
            ctx.shadowColor = color;
            ctx.beginPath();
            ctx.moveTo(laser.x1, laser.y1);
            ctx.lineTo(laser.x2, laser.y2);
            ctx.stroke();
            ctx.restore();
        });

        // HP Bar
        const barWidth = 200;
        const barHeight = 20;
        const barX = this.x - barWidth / 2;
        const barY = this.y - 120;

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const hpWidth = (this.hp / this.maxHp) * barWidth;
        ctx.fillStyle = color;
        ctx.fillRect(barX, barY, hpWidth, barHeight);

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        ctx.fillStyle = '#fff';
        ctx.font = '12px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(`HYPERCUBE: ${this.hp}/${this.maxHp}`, this.x, barY - 10);
    }

    drawCube(ctx, color) {
        // Draw 3D cube wireframe
        const s = this.size;

        // Front face
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = color;
        ctx.strokeRect(-s/2, -s/2, s, s);

        // Back face (smaller for perspective)
        ctx.strokeRect(-s/3, -s/3, s * 0.66, s * 0.66);

        // Connect corners
        ctx.beginPath();
        ctx.moveTo(-s/2, -s/2);
        ctx.lineTo(-s/3, -s/3);
        ctx.moveTo(s/2, -s/2);
        ctx.lineTo(s/3, -s/3);
        ctx.moveTo(-s/2, s/2);
        ctx.lineTo(-s/3, s/3);
        ctx.moveTo(s/2, s/2);
        ctx.lineTo(s/3, s/3);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    drawOctahedron(ctx, color) {
        const s = this.size;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = color;

        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(-s, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(s, 0);
        ctx.closePath();
        ctx.stroke();

        // Cross lines
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(0, s);
        ctx.moveTo(-s, 0);
        ctx.lineTo(s, 0);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    drawDiamond(ctx, color) {
        const s = this.size;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = color;

        // Diamond shape
        ctx.beginPath();
        ctx.moveTo(0, -s * 1.2);
        ctx.lineTo(-s * 0.7, 0);
        ctx.lineTo(0, s * 1.2);
        ctx.lineTo(s * 0.7, 0);
        ctx.closePath();
        ctx.stroke();

        // Inner lines
        ctx.beginPath();
        ctx.moveTo(0, -s * 1.2);
        ctx.lineTo(0, s * 1.2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    drawStar(ctx, color) {
        const s = this.size;
        const points = 8;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 20;
        ctx.shadowColor = color;

        ctx.beginPath();
        for (let i = 0; i < points; i++) {
            const angle = (Math.PI * 2 * i) / points;
            const radius = i % 2 === 0 ? s : s / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    checkCollision(ball) {
        return distance(this.x, this.y, ball.x, ball.y) < this.size + ball.radius;
    }

    checkLaserHit(ball) {
        for (const laser of this.lasers) {
            if (laser.age < laser.lifetime) {
                // Check if ball intersects laser
                const dist = this.pointToLineDistance(
                    ball.x, ball.y,
                    laser.x1, laser.y1,
                    laser.x2, laser.y2
                );
                if (dist < ball.radius + laser.width) {
                    return true;
                }
            }
        }
        return false;
    }

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;

        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        const dx = px - xx;
        const dy = py - yy;

        return Math.sqrt(dx * dx + dy * dy);
    }

    hit() {
        this.hp--;
        if (this.hp <= 0) {
            this.defeated = true;
        }
    }
}

// ============================================================================
// MENU BACKGROUND
// ============================================================================

class MenuBackground {
    constructor() {
        this.canvas = document.getElementById('menu-background');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        this.rotation = 0;
        this.rotationSpeed = 0.015;
        this.currentShape = 'cube';
        this.shapeTimer = 0;
        this.shapeInterval = 3000;
        this.shapes = ['cube', 'octahedron', 'diamond', 'star'];
        this.colorPhase = 0;
        this.colors = [COLORS.cyan, COLORS.magenta, COLORS.purple, COLORS.yellow];

        // Grid animation
        this.gridOffset = 0;
        this.scanlineOffset = 0;

        // Size and position for background hypercube
        this.size = 200;
        this.x = this.canvas.width / 2;
        this.y = this.canvas.height / 2 - 50; // Slightly above center

        // Handle window resize
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.x = this.canvas.width / 2;
            this.y = this.canvas.height / 2 - 50;
        });
    }

    update(deltaTime) {
        this.rotation += this.rotationSpeed;
        this.shapeTimer += deltaTime;
        this.colorPhase = (this.colorPhase + 0.005) % this.colors.length;
        this.gridOffset = (this.gridOffset + 0.5) % 100;
        this.scanlineOffset = (this.scanlineOffset + 2) % this.canvas.height;

        // Morph to next shape
        if (this.shapeTimer >= this.shapeInterval) {
            this.shapeTimer = 0;
            const currentIndex = this.shapes.indexOf(this.currentShape);
            this.currentShape = this.shapes[(currentIndex + 1) % this.shapes.length];
        }
    }

    draw() {
        const ctx = this.ctx;

        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw perspective grid
        this.drawPerspectiveGrid();

        // Get current color
        const colorIndex = Math.floor(this.colorPhase);
        const nextColorIndex = (colorIndex + 1) % this.colors.length;
        const t = this.colorPhase - colorIndex;
        const color = this.interpolateColor(
            this.colors[colorIndex],
            this.colors[nextColorIndex],
            t
        );

        // Draw hypercube with glow
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // Multiple glow layers for depth
        ctx.globalAlpha = 0.3;
        this.drawShape(ctx, color, this.size * 1.3);
        ctx.globalAlpha = 0.5;
        this.drawShape(ctx, color, this.size * 1.15);
        ctx.globalAlpha = 1.0;
        this.drawShape(ctx, color, this.size);

        ctx.restore();

        // Draw scan lines
        this.drawScanlines();

        // Draw floating particles
        this.drawParticles(color);
    }

    drawShape(ctx, color, size) {
        switch(this.currentShape) {
            case 'cube':
                this.drawCube(ctx, color, size);
                break;
            case 'octahedron':
                this.drawOctahedron(ctx, color, size);
                break;
            case 'diamond':
                this.drawDiamond(ctx, color, size);
                break;
            case 'star':
                this.drawStar(ctx, color, size);
                break;
        }
    }

    drawCube(ctx, color, s) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 30;
        ctx.shadowColor = color;
        ctx.strokeRect(-s/2, -s/2, s, s);
        ctx.strokeRect(-s/3, -s/3, s * 0.66, s * 0.66);

        ctx.beginPath();
        ctx.moveTo(-s/2, -s/2);
        ctx.lineTo(-s/3, -s/3);
        ctx.moveTo(s/2, -s/2);
        ctx.lineTo(s/3, -s/3);
        ctx.moveTo(-s/2, s/2);
        ctx.lineTo(-s/3, s/3);
        ctx.moveTo(s/2, s/2);
        ctx.lineTo(s/3, s/3);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    drawOctahedron(ctx, color, s) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 30;
        ctx.shadowColor = color;

        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(-s, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(s, 0);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(0, s);
        ctx.moveTo(-s, 0);
        ctx.lineTo(s, 0);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    drawDiamond(ctx, color, s) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 30;
        ctx.shadowColor = color;

        ctx.beginPath();
        ctx.moveTo(0, -s * 1.2);
        ctx.lineTo(-s * 0.7, 0);
        ctx.lineTo(0, s * 1.2);
        ctx.lineTo(s * 0.7, 0);
        ctx.closePath();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, -s * 1.2);
        ctx.lineTo(0, s * 1.2);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    drawStar(ctx, color, s) {
        const points = 8;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 30;
        ctx.shadowColor = color;

        ctx.beginPath();
        for (let i = 0; i < points; i++) {
            const angle = (Math.PI * 2 * i) / points;
            const radius = i % 2 === 0 ? s : s / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    drawPerspectiveGrid() {
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = COLORS.cyan;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.15;

        // Vertical lines converging to center
        const centerX = this.canvas.width / 2;
        const horizonY = this.canvas.height * 0.4;
        const gridSpacing = 50;

        for (let i = -10; i <= 10; i++) {
            const x = centerX + (i * gridSpacing) + (this.gridOffset * (i / 5));
            ctx.beginPath();
            ctx.moveTo(x, this.canvas.height);
            ctx.lineTo(centerX, horizonY);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = this.canvas.height; y > horizonY; y -= 30) {
            const progress = (this.canvas.height - y) / (this.canvas.height - horizonY);
            const offset = (this.gridOffset * progress) % 30;
            ctx.beginPath();
            ctx.moveTo(0, y - offset);
            ctx.lineTo(this.canvas.width, y - offset);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawScanlines() {
        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = COLORS.cyan;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.05;

        for (let y = 0; y < this.canvas.height; y += 4) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.canvas.width, y);
            ctx.stroke();
        }

        // Moving bright scanline
        ctx.globalAlpha = 0.3;
        ctx.lineWidth = 2;
        ctx.strokeStyle = COLORS.magenta;
        ctx.beginPath();
        ctx.moveTo(0, this.scanlineOffset);
        ctx.lineTo(this.canvas.width, this.scanlineOffset);
        ctx.stroke();

        ctx.restore();
    }

    drawParticles(color) {
        const ctx = this.ctx;
        ctx.save();

        // Floating particles
        for (let i = 0; i < 30; i++) {
            const x = (i * 73 + this.rotation * 100) % this.canvas.width;
            const y = (i * 97 + this.rotation * 50) % this.canvas.height;
            const size = 1 + (i % 3);

            ctx.globalAlpha = 0.3 + Math.sin(this.rotation + i) * 0.2;
            ctx.fillStyle = color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            ctx.fillRect(x, y, size, size);
        }

        ctx.restore();
    }

    interpolateColor(color1, color2, t) {
        // Simple color interpolation (works for hex colors)
        // For simplicity, just return color1 (full implementation would blend)
        return color1;
    }

    show() {
        this.canvas.classList.add('active');
    }

    hide() {
        this.canvas.classList.remove('active');
    }
}

// ============================================================================
// GAME STATE
// ============================================================================

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;

        this.state = 'menu'; // menu, playing, paused, gameover
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('shapeStormHighScore') || '0');
        this.difficulty = 1.0;
        this.difficultyLevel = 'normal'; // easy, normal, hard
        this.level = 1;
        this.currentBallSpeed = BASE_BALL_SPEED;
        this.lives = 3; // Player starts with 3 lives

        this.balls = [];
        this.currentShape = null;
        this.shapePool = [];
        this.blocks = [];
        this.powerups = [];
        this.activePowerups = new Map();
        this.boss = null;
        this.bossMode = false;
        this.floatingTexts = [];
        this.particles = [];
        this.laserBeams = []; // For Track 2 lasers
        this.blackHole = null; // Black hole effect during shape swap

        // Initialize sound system
        this.soundSystem = new SoundSystem();
        this.soundSystem.init();

        // Initialize menu background
        this.menuBackground = new MenuBackground();
        this.menuBackground.show();

        this.mouseX = 0;
        this.mouseY = 0;
        this.mousePressed = false;
        this.lastShapeSwap = 0;
        this.shapeSpawnTimers = [];

        // Multi-track music system
        this.tracks = {
            1: document.getElementById('track-1'),
            2: document.getElementById('track-2'),
            3: document.getElementById('track-3')
        };
        this.currentTrack = 1;
        this.currentBPM = TRACK_CONFIG[1].bpm;
        this.beatInterval = (60 / this.currentBPM) * 1000; // milliseconds per beat
        this.lastBeat = 0;
        this.laserSpawnTimer = 0;
        this.laserSpawnInterval = 8000; // Spawn laser every 8 seconds during Track 2
        this.fadeInterval = null; // Track fade-out interval

        this.setupEventListeners();
        this.updateUI();
        this.gameLoop();
    }

    setupEventListeners() {
        // Mouse movement
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });

        // Mouse button tracking for fine-tune rotation control
        this.canvas.addEventListener('mousedown', (e) => {
            this.mousePressed = true;
        });

        this.canvas.addEventListener('mouseup', (e) => {
            this.mousePressed = false;
        });

        // Also handle mouse leaving canvas
        this.canvas.addEventListener('mouseleave', (e) => {
            this.mousePressed = false;
        });

        // Keyboard
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && this.state === 'playing') {
                e.preventDefault();
                this.swapShape();
            }
            if (e.code === 'Escape' && this.state === 'playing') {
                e.preventDefault();
                this.pauseGame();
            }
            if (e.code === 'Escape' && this.state === 'paused') {
                e.preventDefault();
                this.resumeGame();
            }
        });

        // Menu buttons
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());
        document.getElementById('difficulty-btn').addEventListener('click', () => this.cycleDifficulty());
        document.getElementById('resume-btn').addEventListener('click', () => this.resumeGame());
        document.getElementById('menu-btn').addEventListener('click', () => this.showMenu());
        document.getElementById('restart-btn').addEventListener('click', () => this.startGame());
        document.getElementById('menu2-btn').addEventListener('click', () => this.showMenu());
    }

    cycleDifficulty() {
        const difficulties = ['easy', 'normal', 'hard'];
        const current = difficulties.indexOf(this.difficultyLevel);
        this.difficultyLevel = difficulties[(current + 1) % difficulties.length];

        const difficultyMap = {
            'easy': 0.75,
            'normal': 1.0,
            'hard': 1.5
        };

        this.difficulty = difficultyMap[this.difficultyLevel];
        document.getElementById('difficulty-btn').textContent =
            `DIFFICULTY: ${this.difficultyLevel.toUpperCase()}`;
    }

    startGame() {
        this.state = 'playing';
        this.score = 0;
        this.level = 1;
        this.lives = 3; // Reset lives to 3
        this.currentBallSpeed = BASE_BALL_SPEED;
        this.balls = [];
        this.blocks = [];
        this.powerups = [];
        this.activePowerups.clear();
        this.shapePool = [];
        this.shapeSpawnTimers = [];
        this.bossMode = false;
        this.boss = null;
        this.laserBeams = [];
        this.laserSpawnTimer = 0;

        // Reset to Track 1
        this.currentTrack = 1;
        this.currentBPM = TRACK_CONFIG[1].bpm;
        this.beatInterval = (60 / this.currentBPM) * 1000;

        // Create initial ball
        const centerX = CANVAS_WIDTH / 2;
        const centerY = CANVAS_HEIGHT / 2;
        const angle = Math.random() * Math.PI * 2;
        const speed = this.currentBallSpeed * this.difficulty;
        this.balls.push(new Ball(
            centerX,
            centerY,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        ));

        // Create initial shape (massive - 80% of screen, perfectly centered)
        this.currentShape = new Square(centerX, centerY, SHAPE_SIZE);
        this.currentShape.targetRotation = 0;
        this.currentShape.rotationVelocity = 0;
        this.currentShape.scale = 1.0;
        this.currentShape.alpha = 1.0;

        // Add shapes to pool
        this.addShapeToPool();
        this.addShapeToPool();

        // Generate blocks
        this.generateBlocks();

        // Start Track 1
        this.playTrack(1);

        // Hide all overlays
        document.getElementById('menu-overlay').classList.remove('active');
        document.getElementById('gameover-overlay').classList.remove('active');
        document.getElementById('pause-overlay').classList.remove('active');
        this.menuBackground.hide();

        this.updateUI();
    }

    addShapeToPool() {
        const shapes = [Triangle, Square, Pentagon, Hexagon, Octagon];
        const ShapeClass = randomChoice(shapes);
        const shape = {
            type: ShapeClass.name,
            class: ShapeClass,
            spawnTime: Date.now() + SHAPE_SPAWN_TIME
        };
        this.shapePool.push(shape);
    }

    playTrack(trackNumber) {
        // Clear any active fade interval
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
        }

        // Stop all tracks and reset volumes
        Object.values(this.tracks).forEach(track => {
            track.pause();
            track.currentTime = 0;
            track.volume = 1.0; // Reset volume
        });

        // Play specified track
        const track = this.tracks[trackNumber];
        if (track && track.src) {
            this.currentTrack = trackNumber;
            this.currentBPM = TRACK_CONFIG[trackNumber].bpm;
            this.beatInterval = (60 / this.currentBPM) * 1000;

            track.currentTime = 0;
            track.play().catch(e => console.log(`Track ${trackNumber} play failed:`, e));

            // Set up event listener for track end
            track.onended = () => {
                if (this.state === 'playing') {
                    this.onTrackEnded(trackNumber);
                }
            };
        }
    }

    onTrackEnded(trackNumber) {
        if (trackNumber === 1) {
            // Track 1 finished, start Track 2
            this.playTrack(2);
            this.floatingTexts.push(new FloatingText(
                CANVAS_WIDTH / 2,
                CANVAS_HEIGHT / 2,
                'LASER WARNING',
                COLORS.red
            ));
        } else if (trackNumber === 2) {
            // Track 2 finished, start boss fight with Track 3
            this.playTrack(3);
            this.spawnBoss();
        }
    }

    swapShape() {
        if (this.shapePool.length === 0) return;

        const now = Date.now();
        const nextShape = this.shapePool[0];

        // Check if shape is ready
        if (now < nextShape.spawnTime) return;

        // Create black hole effect at center
        const centerX = CANVAS_WIDTH / 2;
        const centerY = CANVAS_HEIGHT / 2;
        this.blackHole = new BlackHole(centerX, centerY);

        // Fade out current shape if it exists
        if (this.currentShape) {
            this.currentShape.targetAlpha = 0;
        }

        // Create new shape at current position (centered) with zoom animation
        const ShapeClass = nextShape.class;
        this.currentShape = new ShapeClass(centerX, centerY, SHAPE_SIZE);
        this.currentShape.targetRotation = 0;
        this.currentShape.rotationVelocity = 0;
        this.currentShape.scale = 0.3; // Start small
        this.currentShape.alpha = 0.3; // Start transparent
        this.currentShape.targetScale = 1.0;
        this.currentShape.targetAlpha = 1.0;

        // Remove from pool
        this.shapePool.shift();

        // Add new shape to pool
        this.addShapeToPool();

        this.lastShapeSwap = now;
        this.updateShapePool();
    }

    generateBlocks() {
        this.blocks = [];
        if (!this.currentShape) return;

        const blockSize = 20; // 50% smaller
        const spacing = 10; // More spacing
        const gridSize = blockSize + spacing;

        // Calculate grid bounds based on shape size (more padding from edges)
        const gridRadius = this.currentShape.size * 0.5; // 50% of shape size for more edge spacing
        const startX = this.currentShape.x - gridRadius;
        const startY = this.currentShape.y - gridRadius;
        const endX = this.currentShape.x + gridRadius;
        const endY = this.currentShape.y + gridRadius;

        // Generate grid of blocks inside the shape
        for (let x = startX; x < endX; x += gridSize) {
            for (let y = startY; y < endY; y += gridSize) {
                const blockCenterX = x + blockSize / 2;
                const blockCenterY = y + blockSize / 2;

                // Only place block if its center is inside the shape
                if (this.currentShape.isPointInside(blockCenterX, blockCenterY)) {
                    const isSpecial = Math.random() < 0.15;
                    const block = new Block(x, y, isSpecial ? 'special' : 'normal', this.currentShape.x, this.currentShape.y);
                    // Block size already set in constructor
                    this.blocks.push(block);
                }
            }
        }
    }

    update(deltaTime) {
        // Update menu background when in menu state
        if (this.state === 'menu') {
            this.menuBackground.update(deltaTime);
            return;
        }

        if (this.state !== 'playing') return;

        const now = Date.now();

        // Spawn laser beams during Track 2
        if (this.currentTrack === 2 && TRACK_CONFIG[2].laserBeams) {
            this.laserSpawnTimer += deltaTime;
            if (this.laserSpawnTimer >= this.laserSpawnInterval) {
                this.laserSpawnTimer = 0;
                const sides = ['top', 'bottom', 'left', 'right'];
                const randomSide = sides[Math.floor(Math.random() * sides.length)];
                this.laserBeams.push(new LaserBeam(randomSide));
            }
        }

        // Update laser beams
        for (let i = this.laserBeams.length - 1; i >= 0; i--) {
            this.laserBeams[i].update(deltaTime);
            if (this.laserBeams[i].isDone()) {
                this.laserBeams.splice(i, 1);
            }
        }

        // Update black hole effect
        if (this.blackHole) {
            this.blackHole.update(deltaTime);
            if (!this.blackHole.isActive()) {
                this.blackHole = null;
            }
        }

        // Get speed multiplier
        const stormActive = this.activePowerups.has('storm');
        const speedMultiplier = stormActive ? 2 : 1;

        // Check if shape is swapping (pause balls during shape rotation)
        const shapeSwapping = this.currentShape && this.currentShape.scale < 1.0;

        // Update balls (paused during shape swap)
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const ball = this.balls[i];

            // Apply black hole gravity
            if (this.blackHole && this.blackHole.isActive()) {
                this.blackHole.applyGravity(ball);
            }

            // Skip ball physics updates during shape swap
            if (!shapeSwapping) {
                ball.update(speedMultiplier);
            }

            // Check if supercharge has expired
            if (ball.supercharged && now > ball.superchargedEndTime) {
                ball.supercharged = false;
                ball.superchargedEndTime = 0;
            }

            // Check if ball is out of bounds (only when not paused)
            if (!shapeSwapping && (ball.x < 0 || ball.x > CANVAS_WIDTH || ball.y < 0 || ball.y > CANVAS_HEIGHT)) {
                this.balls.splice(i, 1);
                continue;
            }

            // Skip collision detection during shape swap
            if (shapeSwapping) continue;

            // Check collision with current shape
            if (this.currentShape) {
                const collision = this.currentShape.checkCollision(ball);
                if (collision.collision) {
                    const wallIndex = collision.wallIndex;
                    const shieldActive = this.activePowerups.has('shield');
                    const regenActive = this.activePowerups.has('regen');
                    const powerBallActive = this.activePowerups.has('power');

                    // Check if shape is rotating fast enough to act as shield
                    const rotationSpeedThreshold = 0.05; // Adjust this value for desired sensitivity
                    const fastRotating = Math.abs(this.currentShape.rotationVelocity) > rotationSpeedThreshold;

                    // Track wall contact for stuck ball detection
                    if (ball.lastContactPoint &&
                        distance(ball.x, ball.y, ball.lastContactPoint.x, ball.lastContactPoint.y) < 2) {
                        ball.wallContactTime += deltaTime;
                    } else {
                        ball.wallContactTime = 0;
                        ball.lastContactPoint = { x: ball.x, y: ball.y };
                    }

                    // Supercharge if stuck for too long
                    if (ball.wallContactTime > 500 && !ball.supercharged) {
                        this.superchargeBall(ball);
                    }

                    if (this.currentShape.walls[wallIndex] || shieldActive) {
                        // Reflect ball with improved physics
                        this.currentShape.reflectBall(ball, wallIndex);

                        // Normalize speed to prevent acceleration (without rotation influence)
                        const speed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
                        const targetSpeed = this.currentBallSpeed * this.difficulty;
                        ball.vx = (ball.vx / speed) * targetSpeed;
                        ball.vy = (ball.vy / speed) * targetSpeed;

                        // Push ball away from wall to prevent sticking
                        const vertices = this.currentShape.getVertices();
                        const v1 = vertices[wallIndex];
                        const v2 = vertices[(wallIndex + 1) % vertices.length];
                        const dx = v2.x - v1.x;
                        const dy = v2.y - v1.y;
                        const nx = -dy;
                        const ny = dx;
                        const len = Math.sqrt(nx * nx + ny * ny);
                        const normalX = nx / len;
                        const normalY = ny / len;

                        // Ensure ball moves away from wall with increased bounce force
                        ball.x += normalX * 6;
                        ball.y += normalY * 6;

                        // Play wall bounce sound
                        this.soundSystem.wallBounce();

                        // Create wall bounce particles
                        for (let p = 0; p < 5; p++) {
                            this.particles.push(new Particle(ball.x, ball.y, COLORS.cyan));
                        }

                        // Break wall if not shielded, not rotating fast (unless powerball)
                        const canDamage = powerBallActive || !fastRotating;
                        if (!shieldActive && !regenActive && canDamage) {
                            this.currentShape.breakWall(wallIndex);
                        }

                        // Reset contact tracking after successful bounce
                        ball.wallContactTime = 0;
                        ball.lastContactPoint = null;
                    }
                } else {
                    // Reset contact tracking when not colliding
                    ball.wallContactTime = 0;
                    ball.lastContactPoint = null;
                }
            }

            // Check collision with blocks
            const powerBallActive = this.activePowerups.has('power');
            for (let j = this.blocks.length - 1; j >= 0; j--) {
                const block = this.blocks[j];
                if (block.checkCollision(ball, this.currentShape.x, this.currentShape.y, this.currentShape.rotation)) {
                    const destroyed = block.hit();

                    if (!powerBallActive) {
                        // Bounce ball
                        const blockPos = block.getWorldPosition(this.currentShape.x, this.currentShape.y, this.currentShape.rotation);
                        const blockCenterX = blockPos.x + block.width / 2;
                        const blockCenterY = blockPos.y + block.height / 2;

                        if (Math.abs(ball.x - blockCenterX) > Math.abs(ball.y - blockCenterY)) {
                            ball.vx *= -1;
                        } else {
                            ball.vy *= -1;
                        }
                    }

                    if (destroyed) {
                        const points = 10 * this.difficulty;
                        this.score += points;

                        // Play sound effect
                        this.soundSystem.blockBreak();

                        // Show floating points
                        const blockPos = block.getWorldPosition(this.currentShape.x, this.currentShape.y, this.currentShape.rotation);
                        const textX = blockPos.x + block.width / 2;
                        const textY = blockPos.y + block.height / 2;
                        this.floatingTexts.push(new FloatingText(textX, textY, '+' + Math.floor(points), COLORS.green));

                        // Create particle explosion
                        for (let p = 0; p < 15; p++) {
                            this.particles.push(new Particle(textX, textY, block.color));
                        }

                        // Spawn powerup with weighted probabilities (shield 10%, extra_life rare at 5%)
                        if (block.type === 'special') {
                            const rand = Math.random();
                            let type;

                            // Weighted distribution: extra_life is very rare (5%), shield is 10%
                            if (rand < 0.25) {
                                type = 'multiply';
                            } else if (rand < 0.35) {
                                type = 'shield'; // 10% chance
                            } else if (rand < 0.55) {
                                type = 'power';
                            } else if (rand < 0.75) {
                                type = 'regen';
                            } else if (rand < 0.95) {
                                type = 'storm';
                            } else {
                                type = 'extra_life'; // Very rare - only 5% chance
                            }

                            this.powerups.push(new PowerUp(blockPos.x + block.width / 2, blockPos.y + block.height / 2, type));
                        }

                        this.blocks.splice(j, 1);

                        // Level progression when all blocks destroyed
                        if (this.blocks.length === 0 && !this.bossMode) {
                            this.levelUp();
                        }
                    }

                    if (!powerBallActive) break;
                }
            }

            // Check collision with boss
            if (this.boss && !this.boss.defeated) {
                if (this.boss.checkCollision(ball)) {
                    this.boss.hit();
                    const points = 50 * this.difficulty;
                    this.score += points;

                    // Play boss hit sound
                    this.soundSystem.bossHit();

                    // Show floating points
                    this.floatingTexts.push(new FloatingText(this.boss.x, this.boss.y - 50, '+' + Math.floor(points), COLORS.red));

                    // Create boss hit particles
                    for (let p = 0; p < 20; p++) {
                        this.particles.push(new Particle(ball.x, ball.y, COLORS.red));
                    }

                    // Bounce ball
                    const dx = ball.x - this.boss.x;
                    const dy = ball.y - this.boss.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    ball.vx = (dx / dist) * BASE_BALL_SPEED * this.difficulty;
                    ball.vy = (dy / dist) * BASE_BALL_SPEED * this.difficulty;

                    if (this.boss.defeated) {
                        this.score += 1000 * this.difficulty;
                        this.endGame(true);
                    }
                }

                // Check boss laser hits (Hypercube)
                if (this.boss.checkLaserHit && this.boss.checkLaserHit(ball)) {
                    // Destroy ball unless shielded
                    const shieldActive = this.activePowerups.has('shield');
                    if (!shieldActive) {
                        this.balls.splice(i, 1);
                        // Create explosion particles
                        for (let p = 0; p < 15; p++) {
                            this.particles.push(new Particle(ball.x, ball.y, COLORS.orange));
                        }
                        this.soundSystem.bossHit();
                        continue;
                    }
                }
            }

            // Check collision with edge laser beams
            for (const laser of this.laserBeams) {
                if (laser.intersectsPoint(ball.x, ball.y, ball.radius)) {
                    // Destroy ball unless shielded
                    const shieldActive = this.activePowerups.has('shield');
                    if (!shieldActive) {
                        this.balls.splice(i, 1);
                        // Create explosion particles
                        for (let p = 0; p < 15; p++) {
                            this.particles.push(new Particle(ball.x, ball.y, COLORS.red));
                        }
                        break;
                    }
                }
            }

            // Check collision with powerups
            for (let j = this.powerups.length - 1; j >= 0; j--) {
                const powerup = this.powerups[j];
                if (powerup.checkCollision(ball)) {
                    // Play powerup sound
                    this.soundSystem.powerUp();

                    this.activatePowerup(powerup.type);
                    this.powerups.splice(j, 1);
                }
            }
        }

        // Update powerups
        for (let i = this.powerups.length - 1; i >= 0; i--) {
            this.powerups[i].update();

            // Remove if out of bounds
            if (this.powerups[i].y > CANVAS_HEIGHT) {
                this.powerups.splice(i, 1);
            }
        }

        // Check laser beam collisions with walls and blocks
        const shieldActive = this.activePowerups.has('shield');
        for (const laser of this.laserBeams) {
            if (laser.isFiring() && this.currentShape) {
                // Check walls
                const vertices = this.currentShape.getVertices();
                for (let i = 0; i < vertices.length; i++) {
                    const v1 = vertices[i];
                    const v2 = vertices[(i + 1) % vertices.length];

                    if (laser.intersectsLine(v1.x, v1.y, v2.x, v2.y)) {
                        // Destroy wall unless shielded
                        if (!shieldActive && this.currentShape.walls[i]) {
                            this.currentShape.breakWall(i);
                            // Create particles at intersection
                            const midX = (v1.x + v2.x) / 2;
                            const midY = (v1.y + v2.y) / 2;
                            for (let p = 0; p < 10; p++) {
                                this.particles.push(new Particle(midX, midY, COLORS.red));
                            }
                        }
                    }
                }

                // Check blocks
                for (let i = this.blocks.length - 1; i >= 0; i--) {
                    const block = this.blocks[i];
                    const pos = block.getWorldPosition(this.currentShape.x, this.currentShape.y, this.currentShape.rotation);

                    // Check if laser intersects block (check all 4 corners)
                    const corners = [
                        { x: pos.x, y: pos.y },
                        { x: pos.x + block.width, y: pos.y },
                        { x: pos.x + block.width, y: pos.y + block.height },
                        { x: pos.x, y: pos.y + block.height }
                    ];

                    let hit = false;
                    for (let j = 0; j < corners.length; j++) {
                        const c1 = corners[j];
                        const c2 = corners[(j + 1) % corners.length];
                        if (laser.intersectsLine(c1.x, c1.y, c2.x, c2.y)) {
                            hit = true;
                            break;
                        }
                    }

                    if (hit) {
                        // Destroy block
                        const blockCenterX = pos.x + block.width / 2;
                        const blockCenterY = pos.y + block.height / 2;

                        // Create particles
                        for (let p = 0; p < 10; p++) {
                            this.particles.push(new Particle(blockCenterX, blockCenterY, block.color));
                        }

                        this.blocks.splice(i, 1);

                        // Play sound
                        this.soundSystem.blockBreak();

                        // Check level completion
                        if (this.blocks.length === 0 && !this.bossMode) {
                            this.levelUp();
                        }
                    }
                }
            }
        }

        // Update floating texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            this.floatingTexts[i].update(deltaTime);

            // Remove if dead
            if (this.floatingTexts[i].isDead()) {
                this.floatingTexts.splice(i, 1);
            }
        }

        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update(deltaTime);

            // Remove if dead
            if (this.particles[i].isDead()) {
                this.particles.splice(i, 1);
            }
        }

        // Update boss
        if (this.boss) {
            this.boss.update(deltaTime);
        }

        // Update shape rotation with smooth elasticity
        if (this.currentShape) {
            // Animate shape scale and alpha (zoom in effect)
            if (this.currentShape.scale < 1.0) {
                this.currentShape.scale += 0.02;
                if (this.currentShape.scale > 1.0) this.currentShape.scale = 1.0;
            }
            if (this.currentShape.alpha < 1.0) {
                this.currentShape.alpha += 0.03;
                if (this.currentShape.alpha > 1.0) this.currentShape.alpha = 1.0;
            }

            // Check if next shape in pool is ready - flash current shape
            const flashInterval = 500; // Flash every 500ms
            const hasReadyShape = this.shapePool.length > 0 && now >= this.shapePool[0].spawnTime;
            this.currentShape.flashReady = hasReadyShape && (Math.floor(now / flashInterval) % 2 === 0);

            // Calculate target rotation from mouse
            const dx = this.mouseX - this.currentShape.x;
            const dy = this.mouseY - this.currentShape.y;
            const targetRotation = Math.atan2(dy, dx);

            if (this.mousePressed) {
                // Direct rotation control when mouse button is held (fine-tune control)
                // Normalize angle difference to [-PI, PI]
                let angleDiff = targetRotation - this.currentShape.rotation;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                // Apply rotation directly with smooth interpolation
                const directControlSpeed = 0.15; // How quickly it follows the mouse
                this.currentShape.rotation += angleDiff * directControlSpeed;

                // Update velocity based on the actual rotation change
                this.currentShape.rotationVelocity = angleDiff * directControlSpeed;
            } else {
                // Elastic rotation when mouse button is not held
                // Normalize angle difference to [-PI, PI]
                let angleDiff = targetRotation - this.currentShape.rotation;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                // Smooth elastic rotation with acceleration
                const rotationAcceleration = 0.0008; // Very slow acceleration
                const damping = 0.92; // Elasticity/spring effect

                // Apply acceleration towards target
                this.currentShape.rotationVelocity += angleDiff * rotationAcceleration;

                // Apply damping for smooth deceleration
                this.currentShape.rotationVelocity *= damping;

                // Apply velocity to rotation
                this.currentShape.rotation += this.currentShape.rotationVelocity;
            }

            // Regenerate walls if powerup active
            if (this.activePowerups.has('regen')) {
                this.currentShape.regenerateWalls();
            }
        }

        // Update active powerups
        for (const [type, endTime] of this.activePowerups.entries()) {
            if (now > endTime) {
                this.activePowerups.delete(type);
            }
        }

        // Update shape pool timers (storm doubles speed)
        if (stormActive) {
            this.shapePool.forEach(shape => {
                if (shape.spawnTime > now) {
                    shape.spawnTime -= deltaTime;
                }
            });
        }

        // Check game over
        if (this.balls.length === 0) {
            if (this.lives > 0) {
                // Lose a life and respawn ball
                this.lives--;
                this.balls.push(new Ball(
                    this.currentShape.x,
                    this.currentShape.y,
                    randomRange(-BASE_BALL_SPEED, BASE_BALL_SPEED),
                    randomRange(-BASE_BALL_SPEED, BASE_BALL_SPEED)
                ));

                // Show life lost message
                this.floatingTexts.push(new FloatingText(
                    CANVAS_WIDTH / 2,
                    CANVAS_HEIGHT / 2 - 50,
                    `${this.lives} ${this.lives === 1 ? 'LIFE' : 'LIVES'} LEFT`,
                    COLORS.yellow
                ));
            } else {
                this.endGame(false);
            }
        }

        this.updateUI();
    }

    moveShapeOnBeat() {
        if (!this.currentShape) return;

        // Reduced movement since shape is massive
        const maxMove = 20;
        const dx = randomRange(-maxMove, maxMove);
        const dy = randomRange(-maxMove, maxMove);

        // Keep shape centered, allowing minimal movement
        const margin = SHAPE_SIZE + 20; // Shape size + small buffer
        const newX = clamp(this.currentShape.x + dx, margin, CANVAS_WIDTH - margin);
        const newY = clamp(this.currentShape.y + dy, margin, CANVAS_HEIGHT - margin);

        this.currentShape.x = newX;
        this.currentShape.y = newY;
    }

    activatePowerup(type) {
        const now = Date.now();

        switch (type) {
            case 'multiply':
                // Add 1 ball if under max limit (8 balls)
                if (this.balls.length < MAX_BALLS && this.balls.length > 0) {
                    // Clone a random existing ball
                    const randomBall = this.balls[Math.floor(Math.random() * this.balls.length)];
                    this.balls.push(randomBall.clone());
                }
                break;

            case 'extra_life':
                // Add +1 life
                this.lives++;
                this.floatingTexts.push(new FloatingText(
                    this.currentShape.x,
                    this.currentShape.y - 80,
                    '+1 LIFE',
                    COLORS.yellow
                ));
                this.soundSystem.powerUp();
                break;

            case 'shield':
            case 'power':
            case 'regen':
            case 'storm':
                this.activePowerups.set(type, now + POWERUP_DURATION);
                break;
        }

        this.updatePowerupsDisplay();
    }

    superchargeBall(ball) {
        const now = Date.now();

        // Set supercharged state
        ball.supercharged = true;
        ball.superchargedEndTime = now + 1000; // 1 second duration

        // Calculate direction toward shape center
        const dx = this.currentShape.x - ball.x;
        const dy = this.currentShape.y - ball.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Normalize and apply velocity toward center
        const speed = this.currentBallSpeed * this.difficulty * 2; // 2x speed
        ball.vx = (dx / dist) * speed;
        ball.vy = (dy / dist) * speed;

        // Add slight randomness to prevent perfectly straight bounces
        ball.vx += randomRange(-0.3, 0.3);
        ball.vy += randomRange(-0.3, 0.3);

        // Display "SUPERCHARGED" floating text next to ball
        this.floatingTexts.push(new FloatingText(ball.x + 30, ball.y, 'SUPERCHARGED', COLORS.yellow));

        // Create burst particles around the ball
        for (let i = 0; i < 20; i++) {
            this.particles.push(new Particle(ball.x, ball.y, COLORS.yellow));
        }

        // Reset wall contact tracking
        ball.wallContactTime = 0;
        ball.lastContactPoint = null;

        // Play a special sound
        this.soundSystem.powerUp();
    }

    levelUp() {
        this.level++;
        this.currentBallSpeed = BASE_BALL_SPEED + (this.level - 1) * BALL_SPEED_INCREMENT;

        // Clear all powerups
        this.activePowerups.clear();
        this.powerups = [];

        // Update ball speeds to new level speed
        const speedMultiplier = this.currentBallSpeed / BASE_BALL_SPEED;
        this.balls.forEach(ball => {
            const currentSpeed = Math.sqrt(ball.vx ** 2 + ball.vy ** 2);
            const targetSpeed = BASE_BALL_SPEED * this.difficulty * speedMultiplier;
            const ratio = targetSpeed / currentSpeed;
            ball.vx *= ratio;
            ball.vy *= ratio;
        });

        // Generate new blocks
        this.generateBlocks();

        // Add bonus points for level completion
        this.score += 100 * this.level * this.difficulty;

        // Create celebration particles
        const centerX = CANVAS_WIDTH / 2;
        const centerY = CANVAS_HEIGHT / 2;
        for (let i = 0; i < 50; i++) {
            this.particles.push(new Particle(centerX, centerY, randomChoice([COLORS.cyan, COLORS.magenta, COLORS.yellow])));
        }

        // Show level up text
        this.floatingTexts.push(new FloatingText(centerX, centerY, 'LEVEL ' + this.level, COLORS.yellow));

        this.updateUI();
    }

    spawnBoss() {
        this.bossMode = true;
        this.boss = new Hypercube();
        this.blocks = [];
        this.floatingTexts.push(new FloatingText(
            CANVAS_WIDTH / 2,
            CANVAS_HEIGHT / 2 - 50,
            'HYPERCUBE APPROACHING',
            COLORS.red
        ));
    }

    endGame(victory) {
        this.state = 'gameover';

        // Fade out music
        this.fadeOutMusic();

        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('shapeStormHighScore', this.highScore.toString());
            document.getElementById('new-high-score').classList.remove('hidden');
        } else {
            document.getElementById('new-high-score').classList.add('hidden');
        }

        document.getElementById('final-score').textContent = this.score;
        document.getElementById('gameover-overlay').classList.add('active');
        this.updateUI();
    }

    fadeOutMusic() {
        const currentTrack = this.tracks[this.currentTrack];
        if (!currentTrack) return;

        // Clear any existing fade interval
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
        }

        // Start new fade interval
        this.fadeInterval = setInterval(() => {
            if (currentTrack.volume > 0.1) {
                currentTrack.volume -= 0.1;
            } else {
                clearInterval(this.fadeInterval);
                this.fadeInterval = null;
                currentTrack.pause();
                currentTrack.volume = 1.0; // Reset for next play
            }
        }, 100);
    }

    pauseGame() {
        this.state = 'paused';
        const currentTrack = this.tracks[this.currentTrack];
        if (currentTrack) currentTrack.pause();
        document.getElementById('pause-overlay').classList.add('active');
    }

    resumeGame() {
        this.state = 'playing';
        const currentTrack = this.tracks[this.currentTrack];
        if (currentTrack && currentTrack.src) {
            currentTrack.play().catch(e => console.log('Audio resume failed:', e));
        }
        document.getElementById('pause-overlay').classList.remove('active');
    }

    showMenu() {
        this.state = 'menu';

        // Clear any active fade interval
        if (this.fadeInterval) {
            clearInterval(this.fadeInterval);
            this.fadeInterval = null;
        }

        // Stop all tracks and reset volumes
        Object.values(this.tracks).forEach(track => {
            track.pause();
            track.currentTime = 0;
            track.volume = 1.0; // Reset volume
        });

        document.getElementById('menu-overlay').classList.add('active');
        document.getElementById('pause-overlay').classList.remove('active');
        document.getElementById('gameover-overlay').classList.remove('active');
        this.menuBackground.show();
        this.updateUI();
    }

    draw() {
        // Draw menu background when in menu state
        if (this.state === 'menu') {
            this.menuBackground.draw();
            return;
        }

        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw upcoming shapes preview (behind main shape)
        const centerX = CANVAS_WIDTH / 2;
        const centerY = CANVAS_HEIGHT / 2;
        for (let i = Math.min(3, this.shapePool.length) - 1; i >= 0; i--) {
            const shape = this.shapePool[i];
            const ShapeClass = shape.class;
            const previewShape = new ShapeClass(centerX, centerY, SHAPE_SIZE);

            // Calculate scale and alpha based on position in queue
            const scale = 0.3 + (i * 0.15); // 0.3, 0.45, 0.6
            const alpha = 0.15 + (i * 0.1); // 0.15, 0.25, 0.35

            previewShape.walls = new Array(previewShape.getSides()).fill(true);
            previewShape.draw(this.ctx, scale, alpha);
        }

        // Draw current shape
        if (this.currentShape) {
            this.currentShape.draw(this.ctx, this.currentShape.scale || 1.0, this.currentShape.alpha || 1.0);
        }

        // Draw blocks (inside the shape, so they rotate with it)
        if (this.currentShape) {
            this.blocks.forEach(block => block.draw(this.ctx, this.currentShape.x, this.currentShape.y, this.currentShape.rotation));
        }

        // Draw balls
        this.balls.forEach(ball => ball.draw(this.ctx));

        // Draw edge laser beams
        this.laserBeams.forEach(laser => laser.draw(this.ctx));

        // Draw powerups
        this.powerups.forEach(powerup => powerup.draw(this.ctx));

        // Draw boss
        if (this.boss && !this.boss.defeated) {
            this.boss.draw(this.ctx);
        }

        // Draw black hole effect
        if (this.blackHole && this.blackHole.isActive()) {
            this.blackHole.draw(this.ctx);
        }

        // Draw floating texts (points)
        this.floatingTexts.forEach(text => text.draw(this.ctx));

        // Draw particles
        this.particles.forEach(particle => particle.draw(this.ctx));
    }

    updateUI() {
        document.getElementById('score').textContent = Math.floor(this.score);
        document.getElementById('lives').textContent = this.lives;
        document.getElementById('level').textContent = this.level;
        document.getElementById('difficulty').textContent = this.difficulty.toFixed(1) + 'x';
        document.getElementById('high-score').textContent = this.highScore;

        this.updateShapePool();
        this.updatePowerupsDisplay();
    }

    updateShapePool() {
        const poolDiv = document.getElementById('pool-shapes');
        poolDiv.innerHTML = '';

        this.shapePool.forEach((shape, index) => {
            const div = document.createElement('div');
            div.className = 'pool-shape';

            const now = Date.now();
            if (now < shape.spawnTime) {
                div.classList.add('spawning');
            } else {
                // Shape is ready - add flashing class
                div.classList.add('ready');

                // Play sound when shape becomes ready (only once)
                if (!shape.readySoundPlayed) {
                    this.soundSystem.shapeReady();
                    shape.readySoundPlayed = true;
                }
            }

            div.textContent = shape.type.substring(0, 3).toUpperCase();
            poolDiv.appendChild(div);
        });
    }

    updatePowerupsDisplay() {
        const powerupsDiv = document.getElementById('active-powerups');
        powerupsDiv.innerHTML = '';

        for (const [type, endTime] of this.activePowerups.entries()) {
            const div = document.createElement('div');
            div.className = 'powerup-indicator';

            const names = {
                'extra_life': 'EXTRA LIFE',
                'shield': 'SHIELD',
                'power': 'POWER BALL',
                'regen': 'REGEN',
                'storm': 'STORM'
            };

            div.textContent = names[type] || type.toUpperCase();
            powerupsDiv.appendChild(div);
        }
    }

    gameLoop() {
        const now = Date.now();
        const deltaTime = 16; // Approximately 60 FPS

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame(() => this.gameLoop());
    }
}

// ============================================================================
// START GAME
// ============================================================================

window.addEventListener('load', () => {
    new Game();
});
