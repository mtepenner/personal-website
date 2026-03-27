import React, { useEffect, useRef, useState, useCallback } from 'react';

// --- Web Audio API for Retro Sound Effects ---
let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

const playShootSound = () => {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Ignore audio errors if blocked
  }
};

const playExplosionSound = () => {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(10, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) { }
};

const playAlertSound = () => {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(440, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) { }
};

// --- Game Constants ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GROUND_Y = 550;
const SILO_X = CANVAS_WIDTH / 2;
const SILO_Y = GROUND_Y;

export default function App() {
  const canvasRef = useRef(null);
  const requestRef = useRef();
  
  // Expose React state for the UI overlay (menus)
  const [uiState, setUiState] = useState({
    status: 'START', // START, PLAYING, GAME_OVER, WAVE_TRANSITION
    score: 0,
    wave: 1,
    ammo: 30,
    message: ''
  });

  // Mutable game state for the high-performance update loop
  const gameState = useRef({
    status: 'START',
    score: 0,
    wave: 1,
    ammo: 30,
    cities: [],
    enemies: [],
    playerMissiles: [],
    explosions: [],
    particles: [],
    enemiesToSpawn: 0,
    spawnTimer: 0,
    messageTimer: 0,
    message: ''
  });

  // Initialize standard game entities
  const initLevel = (wave, retainCities = false) => {
    const state = gameState.current;
    state.status = 'PLAYING';
    state.wave = wave;
    state.ammo = 30 + (wave * 5); // Gain some ammo each wave
    state.enemies = [];
    state.playerMissiles = [];
    state.explosions = [];
    state.particles = [];
    state.enemiesToSpawn = 8 + (wave * 4);
    state.spawnTimer = 60;
    
    // Create cities if starting fresh
    if (!retainCities) {
      state.score = 0;
      state.cities = [
        { x: 100, y: GROUND_Y - 20, w: 40, h: 20, alive: true },
        { x: 200, y: GROUND_Y - 20, w: 40, h: 20, alive: true },
        { x: 300, y: GROUND_Y - 20, w: 40, h: 20, alive: true },
        // Skip center (Silo)
        { x: 460, y: GROUND_Y - 20, w: 40, h: 20, alive: true },
        { x: 560, y: GROUND_Y - 20, w: 40, h: 20, alive: true },
        { x: 660, y: GROUND_Y - 20, w: 40, h: 20, alive: true },
      ];
    }
    syncUi();
  };

  const syncUi = () => {
    setUiState({
      status: gameState.current.status,
      score: gameState.current.score,
      wave: gameState.current.wave,
      ammo: gameState.current.ammo,
      message: gameState.current.message
    });
  };

  const handleStart = () => {
    getAudioContext(); // Init audio on user gesture
    playAlertSound();
    initLevel(1, false);
  };

  // The main game loop
  const gameLoop = useCallback(() => {
    const state = gameState.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Hard pixelation
    ctx.imageSmoothingEnabled = false;

    // 1. Update Logic
    if (state.status === 'PLAYING') {
      // Spawning enemies
      if (state.enemiesToSpawn > 0) {
        state.spawnTimer--;
        if (state.spawnTimer <= 0) {
          const startX = Math.random() * CANVAS_WIDTH;
          // Pick a random alive city or silo as target
          const targets = state.cities.filter(c => c.alive).map(c => ({x: c.x + c.w/2, y: c.y}));
          targets.push({x: SILO_X, y: SILO_Y}); // Silo is always a valid target
          const target = targets[Math.floor(Math.random() * targets.length)];
          
          state.enemies.push({
            x: startX, y: 0,
            startX, startY: 0,
            targetX: target.x, targetY: target.y,
            speed: 0.5 + (state.wave * 0.15),
            active: true
          });
          
          state.enemiesToSpawn--;
          state.spawnTimer = Math.random() * 60 + 20; // Random delay between spawns
        }
      }

      // Move Enemies
      state.enemies.forEach(e => {
        if (!e.active) return;
        const dx = e.targetX - e.startX;
        const dy = e.targetY - e.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        e.x += (dx / dist) * e.speed;
        e.y += (dy / dist) * e.speed;

        // Ground collision
        if (e.y >= e.targetY) {
          e.active = false;
          createExplosion(e.x, e.y, 40, true);
          playExplosionSound();
        }
      });

      // Move Player Missiles
      state.playerMissiles.forEach(p => {
        if (!p.active) return;
        const dx = p.targetX - p.startX;
        const dy = p.targetY - p.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        p.x += (dx / dist) * p.speed;
        p.y += (dy / dist) * p.speed;

        // Reached target
        if (p.y <= p.targetY || (dy > 0 && p.y >= p.targetY)) {
          p.active = false;
          createExplosion(p.targetX, p.targetY, 50, false);
          playExplosionSound();
        }
      });

      // Update Explosions
      state.explosions.forEach(exp => {
        if (!exp.active) return;
        if (exp.expanding) {
          exp.radius += 1.5;
          if (exp.radius >= exp.maxRadius) exp.expanding = false;
        } else {
          exp.radius -= 0.5;
          if (exp.radius <= 0) exp.active = false;
        }

        // Check collisions with enemies
        state.enemies.forEach(e => {
          if (e.active) {
            const dist = Math.sqrt((e.x - exp.x) ** 2 + (e.y - exp.y) ** 2);
            if (dist < exp.radius) {
              e.active = false;
              state.score += 25 * state.wave;
              createExplosion(e.x, e.y, 25, false); // Chain reaction
              playExplosionSound();
              
              // Spawn particles
              for(let i=0; i<5; i++) {
                state.particles.push({
                  x: e.x, y: e.y,
                  vx: (Math.random() - 0.5) * 4,
                  vy: (Math.random() - 0.5) * 4,
                  life: 30
                });
              }
            }
          }
        });

        // If enemy explosion, check city destruction
        if (exp.isEnemy) {
          state.cities.forEach(c => {
            if (c.alive) {
              const cityCenterX = c.x + c.w / 2;
              const cityCenterY = c.y + c.h / 2;
              const dist = Math.sqrt((cityCenterX - exp.x) ** 2 + (cityCenterY - exp.y) ** 2);
              if (dist < exp.radius + 10) {
                c.alive = false;
                playAlertSound();
                for(let i=0; i<10; i++) {
                  state.particles.push({
                    x: cityCenterX, y: cityCenterY,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 1) * 5,
                    life: 50
                  });
                }
              }
            }
          });
        }
      });

      // Update Particles
      state.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
      });

      // Filter inactive entities
      state.enemies = state.enemies.filter(e => e.active);
      state.playerMissiles = state.playerMissiles.filter(p => p.active);
      state.explosions = state.explosions.filter(e => e.active);
      state.particles = state.particles.filter(p => p.life > 0);

      // Check Win/Loss conditions
      const citiesAlive = state.cities.filter(c => c.alive).length;
      if (citiesAlive === 0 && state.explosions.length === 0) {
        state.status = 'GAME_OVER';
        syncUi();
      } else if (state.enemiesToSpawn <= 0 && state.enemies.length === 0 && state.explosions.length === 0) {
        // Wave complete
        state.status = 'WAVE_TRANSITION';
        state.message = `WAVE ${state.wave} SURVIVED`;
        state.messageTimer = 180; // 3 seconds at 60fps
        state.score += citiesAlive * 100 * state.wave;
        state.score += state.ammo * 5 * state.wave; // Bonus for unused ammo
        syncUi();
      }

      // Periodically sync UI for score/ammo updates
      if (Math.random() < 0.1) syncUi();
    } else if (state.status === 'WAVE_TRANSITION') {
      state.messageTimer--;
      if (state.messageTimer <= 0) {
        initLevel(state.wave + 1, true);
      }
    }

    // 2. Render
    // Clear screen with a slight fade to create CRT motion blur
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Ground
    ctx.fillStyle = '#003300';
    ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();

    // Draw Silo (Center Base)
    ctx.fillStyle = '#555555';
    ctx.beginPath();
    ctx.moveTo(SILO_X - 30, GROUND_Y);
    ctx.lineTo(SILO_X - 15, GROUND_Y - 30);
    ctx.lineTo(SILO_X + 15, GROUND_Y - 30);
    ctx.lineTo(SILO_X + 30, GROUND_Y);
    ctx.fill();
    ctx.strokeStyle = '#00FFFF';
    ctx.stroke();

    // Draw Cities
    state.cities.forEach(c => {
      if (c.alive) {
        ctx.fillStyle = '#00FFFF'; // Cyan buildings
        // Main block
        ctx.fillRect(c.x, c.y, c.w, c.h);
        // Little towers
        ctx.fillRect(c.x + 5, c.y - 10, 10, 10);
        ctx.fillRect(c.x + 25, c.y - 15, 8, 15);
      } else {
        // Ruins
        ctx.fillStyle = '#333333';
        ctx.fillRect(c.x, c.y + 10, c.w, 10);
      }
    });

    // Draw Enemy Missiles (Red)
    ctx.strokeStyle = '#FF0000';
    ctx.lineWidth = 2;
    state.enemies.forEach(e => {
      ctx.beginPath();
      ctx.moveTo(e.startX, e.startY);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
      
      // Warhead tip
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(e.x - 2, e.y - 2, 4, 4);
    });

    // Draw Player Missiles (Blue)
    ctx.strokeStyle = '#00AFFF';
    state.playerMissiles.forEach(p => {
      ctx.beginPath();
      ctx.moveTo(p.startX, p.startY);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      
      // Missile tip
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });

    // Draw Explosions
    state.explosions.forEach(exp => {
      // Color alternates based on frame for a retro flicker effect
      const colors = exp.isEnemy ? ['#FF0000', '#FF5500', '#FFFF00'] : ['#FFFFFF', '#00FFFF', '#0000FF'];
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      
      // Draw pixelated explosion (Blocky circle)
      ctx.beginPath();
      ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Particles
    ctx.fillStyle = '#FFAA00';
    state.particles.forEach(p => {
      ctx.fillRect(p.x, p.y, 3, 3);
    });

    // Draw Wave Transition Message on Canvas
    if (state.status === 'WAVE_TRANSITION') {
      ctx.fillStyle = '#00FF00';
      ctx.font = '30px "Courier New", Courier, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(state.message, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      ctx.font = '20px "Courier New", Courier, monospace';
      ctx.fillText(`BONUS POINTS AWARDED`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  }, []);

  const createExplosion = (x, y, maxRadius, isEnemy) => {
    gameState.current.explosions.push({
      x, y,
      radius: 1,
      maxRadius,
      expanding: true,
      active: true,
      isEnemy
    });
  };

  const handleCanvasClick = (e) => {
    const state = gameState.current;
    if (state.status !== 'PLAYING') return;
    if (state.ammo <= 0) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Don't fire below ground
    if (clickY >= GROUND_Y) return;

    // Fire missile
    state.playerMissiles.push({
      startX: SILO_X, startY: SILO_Y,
      x: SILO_X, y: SILO_Y,
      targetX: clickX, targetY: clickY,
      speed: 15,
      active: true
    });

    state.ammo--;
    playShootSound();
    syncUi();
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameLoop]);

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4 font-mono text-green-500 selection:bg-green-900">
      
      {/* Global CSS for CRT Effect & Retro Font loading */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
        
        .retro-font {
          font-family: 'VT323', monospace;
        }
        
        .crt-container {
          position: relative;
          overflow: hidden;
          border-radius: 2rem;
          border: 12px solid #1a1a1a;
          box-shadow: 0 0 50px rgba(0, 255, 0, 0.2), inset 0 0 20px rgba(0,0,0,1);
        }
        
        .crt-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
          background-size: 100% 4px, 6px 100%;
          z-index: 10;
          pointer-events: none;
        }

        .crt-flicker {
          animation: crt-flicker 0.15s infinite;
        }

        @keyframes crt-flicker {
          0% { opacity: 0.95; }
          50% { opacity: 1; }
          100% { opacity: 0.98; }
        }
      `}</style>

      <div className="text-center mb-6">
        <h1 className="text-4xl md:text-6xl retro-font text-red-500 tracking-widest uppercase drop-shadow-[0_0_10px_rgba(255,0,0,0.8)]">
          DEFCON: RED SHIELD
        </h1>
        <p className="text-green-400 mt-2 text-lg retro-font">SOVIET ICBM DEFENSE SIMULATOR - 1983</p>
      </div>

      {/* Main Game Frame */}
      <div className="relative crt-container bg-black w-full max-w-4xl aspect-[4/3] crt-flicker cursor-crosshair">
        
        {/* HUD overlay */}
        {(uiState.status === 'PLAYING' || uiState.status === 'WAVE_TRANSITION') && (
          <div className="absolute top-0 left-0 w-full p-4 flex justify-between z-20 retro-font text-2xl text-green-500 pointer-events-none drop-shadow-[0_0_5px_rgba(0,255,0,1)]">
            <div>SCORE: {uiState.score.toString().padStart(6, '0')}</div>
            <div className="text-red-500 animate-pulse">DEFCON {Math.max(1, 6 - uiState.wave)}</div>
            <div>WAVE: {uiState.wave}</div>
            <div className={uiState.ammo < 10 ? 'text-red-500' : 'text-cyan-400'}>
              AMMO: {uiState.ammo}
            </div>
          </div>
        )}

        {/* Start Screen */}
        {uiState.status === 'START' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/80 retro-font">
            <h2 className="text-5xl text-red-500 mb-8 animate-pulse text-center leading-relaxed">
              WARNING<br/>STRATEGIC LAUNCH DETECTED
            </h2>
            <div className="text-green-400 text-xl text-center space-y-4 max-w-xl p-6 border-2 border-green-800 bg-green-900/20">
              <p>Comrade, the Cold War has gone hot.</p>
              <p>Protect the allied cities from incoming ballistic missiles.</p>
              <p className="text-cyan-400">CLICK anywhere in the sky to launch Anti-Ballistic Missiles (ABMs).</p>
              <p className="text-yellow-400">Watch your ammo reserves.</p>
            </div>
            <button 
              onClick={handleStart}
              className="mt-10 px-8 py-4 bg-red-700 hover:bg-red-500 text-white text-3xl border-4 border-red-900 transition-colors uppercase"
            >
              INITIALIZE DEFENSE GRID
            </button>
          </div>
        )}

        {/* Game Over Screen */}
        {uiState.status === 'GAME_OVER' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-red-900/80 retro-font">
            <h2 className="text-6xl text-white mb-4 tracking-widest">MUTUALLY ASSURED DESTRUCTION</h2>
            <p className="text-3xl text-black bg-yellow-400 px-4 py-1 mb-8">ALL CITIES LOST</p>
            <p className="text-2xl text-white mb-8">FINAL SCORE: {uiState.score}</p>
            <button 
              onClick={handleStart}
              className="px-8 py-4 bg-black hover:bg-gray-800 text-green-500 text-2xl border-2 border-green-500 transition-colors"
            >
              RESTART SIMULATION
            </button>
          </div>
        )}

        <div className="crt-overlay"></div>
        
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="w-full h-full block"
          onClick={handleCanvasClick}
        />
      </div>

      <div className="mt-6 text-gray-500 retro-font text-center max-w-2xl text-lg">
        SYSTEM TERMINAL: ALL SYSTEMS ONLINE. AWAITING COMMANDER INPUT. PREPARE FOR ESCALATION.
      </div>
    </div>
  );
}
