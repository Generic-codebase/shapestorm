// ============================================================================
// SHAPE STORM - Retro Wave Music Game
// ============================================================================

// Game Constants
const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 700;
const BASE_BALL_SPEED = 4;
const SHAPE_SPAWN_TIME = 15000; // 15 seconds
const POWERUP_DURATION = 15000; // 15 seconds
const BOSS_HP = 50;

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
        this.radius = 8;
        this.color = COLORS.cyan;
        this.trail = [];
        this.maxTrail = 10;
    }

    update(speedMultiplier = 1) {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.maxTrail) {
            this.trail.shift();
        }

        this.x += this.vx * speedMultiplier;
        this.y += this.vy * speedMultiplier;
    }

    draw(ctx) {
        // Draw trail
        for (let i = 0; i < this.trail.length; i++) {
            const alpha = i / this.trail.length;
            ctx.beginPath();
            ctx.arc(this.trail[i].x, this.trail[i].y, this.radius * alpha, 0, Math.PI * 2);
            ctx.fillStyle = this.color + Math.floor(alpha * 100).toString(16).padStart(2, '0');
            ctx.fill();
        }

        // Draw ball
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Glow effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
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

    draw(ctx) {
        const vertices = this.getVertices();

        // Draw filled shape
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            ctx.lineTo(vertices[i].x, vertices[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = this.color + '11';
        ctx.fill();

        // Draw walls
        for (let i = 0; i < vertices.length; i++) {
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % vertices.length];

            if (this.walls[i]) {
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 4;
            } else {
                ctx.strokeStyle = this.color + '33';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
            }

            ctx.beginPath();
            ctx.moveTo(v1.x, v1.y);
            ctx.lineTo(v2.x, v2.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Glow effect for intact walls
            if (this.walls[i]) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = this.color;
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
            ctx.arc(v.x, v.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
        });
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
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.type = type; // 'normal' or 'special' (drops powerup)
        this.hp = type === 'special' ? 2 : 1;
        this.color = type === 'special' ? COLORS.yellow : COLORS.green;
        this.destroyed = false;
    }

    draw(ctx) {
        if (this.destroyed) return;

        ctx.fillStyle = this.color + '44';
        ctx.fillRect(this.x, this.y, this.width, this.height);

        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);

        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;

        // HP indicator for special blocks
        if (this.type === 'special' && this.hp > 1) {
            ctx.fillStyle = '#fff';
            ctx.font = '12px Orbitron';
            ctx.textAlign = 'center';
            ctx.fillText(this.hp, this.x + this.width / 2, this.y + this.height / 2 + 4);
        }
    }

    checkCollision(ball) {
        if (this.destroyed) return false;

        return ball.x + ball.radius > this.x &&
               ball.x - ball.radius < this.x + this.width &&
               ball.y + ball.radius > this.y &&
               ball.y - ball.radius < this.y + this.height;
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
            'multiply': { color: COLORS.cyan, symbol: '×2' },
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
// BOSS CLASS
// ============================================================================

class Boss {
    constructor() {
        this.x = CANVAS_WIDTH / 2;
        this.y = 100;
        this.width = 150;
        this.height = 150;
        this.hp = BOSS_HP;
        this.maxHp = BOSS_HP;
        this.phase = 1;
        this.color = COLORS.red;
        this.defeated = false;
        this.attackTimer = 0;
        this.attackInterval = 2000;
    }

    draw(ctx) {
        // Boss body
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(Date.now() / 1000);

        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6;
            const x = Math.cos(angle) * 50;
            const y = Math.sin(angle) * 50;

            ctx.beginPath();
            ctx.arc(x, y, 20, 0, Math.PI * 2);
            ctx.fillStyle = this.color + '66';
            ctx.fill();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        ctx.restore();

        // Boss core
        ctx.beginPath();
        ctx.arc(this.x, this.y, 40, 0, Math.PI * 2);
        ctx.fillStyle = this.color + '88';
        ctx.fill();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.shadowBlur = 30;
        ctx.shadowColor = this.color;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // HP Bar
        const barWidth = 200;
        const barHeight = 20;
        const barX = this.x - barWidth / 2;
        const barY = this.y - 100;

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const hpWidth = (this.hp / this.maxHp) * barWidth;
        ctx.fillStyle = this.color;
        ctx.fillRect(barX, barY, hpWidth, barHeight);

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        ctx.fillStyle = '#fff';
        ctx.font = '12px Orbitron';
        ctx.textAlign = 'center';
        ctx.fillText(`BOSS: ${this.hp}/${this.maxHp}`, this.x, barY - 10);
    }

    update(deltaTime) {
        this.attackTimer += deltaTime;
    }

    checkCollision(ball) {
        return distance(this.x, this.y, ball.x, ball.y) < 40 + ball.radius;
    }

    hit() {
        this.hp--;
        if (this.hp <= 0) {
            this.defeated = true;
        }
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

        this.balls = [];
        this.currentShape = null;
        this.shapePool = [];
        this.blocks = [];
        this.powerups = [];
        this.activePowerups = new Map();
        this.boss = null;
        this.bossMode = false;

        this.mouseX = 0;
        this.mouseY = 0;
        this.lastShapeSwap = 0;
        this.shapeSpawnTimers = [];

        this.music = document.getElementById('game-music');
        this.musicStartTime = 0;
        this.musicDuration = 120000; // 2 minutes default
        this.beatInterval = 500;
        this.lastBeat = 0;

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
        this.balls = [];
        this.blocks = [];
        this.powerups = [];
        this.activePowerups.clear();
        this.shapePool = [];
        this.shapeSpawnTimers = [];
        this.bossMode = false;
        this.boss = null;

        // Create initial ball
        const centerX = CANVAS_WIDTH / 2;
        const centerY = CANVAS_HEIGHT / 2;
        const angle = Math.random() * Math.PI * 2;
        const speed = BASE_BALL_SPEED * this.difficulty;
        this.balls.push(new Ball(
            centerX,
            centerY,
            Math.cos(angle) * speed,
            Math.sin(angle) * speed
        ));

        // Create initial shape
        this.currentShape = new Square(centerX, centerY, 100);

        // Add shapes to pool
        this.addShapeToPool();
        this.addShapeToPool();

        // Generate blocks
        this.generateBlocks();

        // Start music (in a real game, you'd load an actual audio file)
        this.musicStartTime = Date.now();

        // Hide menu
        document.getElementById('menu-overlay').classList.remove('active');

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

    swapShape() {
        if (this.shapePool.length === 0) return;

        const now = Date.now();
        const nextShape = this.shapePool[0];

        // Check if shape is ready
        if (now < nextShape.spawnTime) return;

        // Create new shape at current position
        const ShapeClass = nextShape.class;
        this.currentShape = new ShapeClass(this.currentShape.x, this.currentShape.y, 100);

        // Remove from pool
        this.shapePool.shift();

        // Add new shape to pool
        this.addShapeToPool();

        this.lastShapeSwap = now;
        this.updateShapePool();
    }

    generateBlocks() {
        this.blocks = [];
        const rows = 5;
        const cols = 10;
        const padding = 50;
        const spacing = 10;
        const blockWidth = (CANVAS_WIDTH - padding * 2 - spacing * (cols - 1)) / cols;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = padding + col * (blockWidth + spacing);
                const y = padding + row * 50;
                const isSpecial = Math.random() < 0.15;
                this.blocks.push(new Block(x, y, isSpecial ? 'special' : 'normal'));
            }
        }
    }

    update(deltaTime) {
        if (this.state !== 'playing') return;

        const now = Date.now();

        // Check if music ended and spawn boss
        if (!this.bossMode && now - this.musicStartTime > this.musicDuration) {
            this.spawnBoss();
        }

        // Get speed multiplier
        const stormActive = this.activePowerups.has('storm');
        const speedMultiplier = stormActive ? 2 : 1;

        // Update balls
        for (let i = this.balls.length - 1; i >= 0; i--) {
            const ball = this.balls[i];
            ball.update(speedMultiplier);

            // Check if ball is out of bounds
            if (ball.x < 0 || ball.x > CANVAS_WIDTH || ball.y < 0 || ball.y > CANVAS_HEIGHT) {
                this.balls.splice(i, 1);
                continue;
            }

            // Check collision with current shape
            if (this.currentShape) {
                const collision = this.currentShape.checkCollision(ball);
                if (collision.collision) {
                    const wallIndex = collision.wallIndex;
                    const shieldActive = this.activePowerups.has('shield');
                    const regenActive = this.activePowerups.has('regen');

                    if (this.currentShape.walls[wallIndex] || shieldActive) {
                        // Reflect ball
                        this.currentShape.reflectBall(ball, wallIndex);

                        // Break wall if not shielded
                        if (!shieldActive && !regenActive) {
                            this.currentShape.breakWall(wallIndex);
                        }
                    }
                }
            }

            // Check collision with blocks
            const powerBallActive = this.activePowerups.has('power');
            for (let j = this.blocks.length - 1; j >= 0; j--) {
                const block = this.blocks[j];
                if (block.checkCollision(ball)) {
                    const destroyed = block.hit();

                    if (!powerBallActive) {
                        // Bounce ball
                        const blockCenterX = block.x + block.width / 2;
                        const blockCenterY = block.y + block.height / 2;

                        if (Math.abs(ball.x - blockCenterX) > Math.abs(ball.y - blockCenterY)) {
                            ball.vx *= -1;
                        } else {
                            ball.vy *= -1;
                        }
                    }

                    if (destroyed) {
                        this.score += 10 * this.difficulty;

                        // Spawn powerup
                        if (block.type === 'special') {
                            const powerupTypes = ['multiply', 'extra_life', 'shield', 'power', 'regen', 'storm'];
                            const type = randomChoice(powerupTypes);
                            this.powerups.push(new PowerUp(block.x + block.width / 2, block.y + block.height / 2, type));
                        }

                        this.blocks.splice(j, 1);

                        // Regenerate blocks if all destroyed
                        if (this.blocks.length === 0 && !this.bossMode) {
                            this.generateBlocks();
                        }
                    }

                    if (!powerBallActive) break;
                }
            }

            // Check collision with boss
            if (this.boss && !this.boss.defeated) {
                if (this.boss.checkCollision(ball)) {
                    this.boss.hit();
                    this.score += 50 * this.difficulty;

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
            }

            // Check collision with powerups
            for (let j = this.powerups.length - 1; j >= 0; j--) {
                const powerup = this.powerups[j];
                if (powerup.checkCollision(ball)) {
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

        // Update boss
        if (this.boss) {
            this.boss.update(deltaTime);
        }

        // Update shape rotation based on mouse
        if (this.currentShape) {
            const dx = this.mouseX - this.currentShape.x;
            const dy = this.mouseY - this.currentShape.y;
            const targetRotation = Math.atan2(dy, dx);
            const rotationDiff = targetRotation - this.currentShape.rotation;
            this.currentShape.rotate(rotationDiff * 0.05); // Slow rotation

            // Move shape on beat
            if (now - this.lastBeat > this.beatInterval) {
                this.lastBeat = now;
                this.moveShapeOnBeat();
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
            const extraLifeActive = this.activePowerups.has('extra_life');
            if (extraLifeActive) {
                // Respawn ball
                this.balls.push(new Ball(
                    this.currentShape.x,
                    this.currentShape.y,
                    randomRange(-BASE_BALL_SPEED, BASE_BALL_SPEED),
                    randomRange(-BASE_BALL_SPEED, BASE_BALL_SPEED)
                ));
                this.activePowerups.delete('extra_life');
            } else {
                this.endGame(false);
            }
        }

        this.updateUI();
    }

    moveShapeOnBeat() {
        if (!this.currentShape) return;

        const maxMove = 50;
        const dx = randomRange(-maxMove, maxMove);
        const dy = randomRange(-maxMove, maxMove);

        const newX = clamp(this.currentShape.x + dx, 150, CANVAS_WIDTH - 150);
        const newY = clamp(this.currentShape.y + dy, 150, CANVAS_HEIGHT - 150);

        this.currentShape.x = newX;
        this.currentShape.y = newY;
    }

    activatePowerup(type) {
        const now = Date.now();

        switch (type) {
            case 'multiply':
                const newBalls = [];
                this.balls.forEach(ball => {
                    newBalls.push(ball.clone());
                });
                this.balls.push(...newBalls);
                break;

            case 'extra_life':
            case 'shield':
            case 'power':
            case 'regen':
            case 'storm':
                this.activePowerups.set(type, now + POWERUP_DURATION);
                break;
        }

        this.updatePowerupsDisplay();
    }

    spawnBoss() {
        this.bossMode = true;
        this.boss = new Boss();
        this.blocks = [];
    }

    endGame(victory) {
        this.state = 'gameover';

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

    pauseGame() {
        this.state = 'paused';
        document.getElementById('pause-overlay').classList.add('active');
    }

    resumeGame() {
        this.state = 'playing';
        document.getElementById('pause-overlay').classList.remove('active');
    }

    showMenu() {
        this.state = 'menu';
        document.getElementById('menu-overlay').classList.add('active');
        document.getElementById('pause-overlay').classList.remove('active');
        document.getElementById('gameover-overlay').classList.remove('active');
        this.updateUI();
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw blocks
        this.blocks.forEach(block => block.draw(this.ctx));

        // Draw current shape
        if (this.currentShape) {
            this.currentShape.draw(this.ctx);
        }

        // Draw balls
        this.balls.forEach(ball => ball.draw(this.ctx));

        // Draw powerups
        this.powerups.forEach(powerup => powerup.draw(this.ctx));

        // Draw boss
        if (this.boss && !this.boss.defeated) {
            this.boss.draw(this.ctx);
        }
    }

    updateUI() {
        document.getElementById('score').textContent = Math.floor(this.score);
        document.getElementById('lives').textContent = this.balls.length;
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
