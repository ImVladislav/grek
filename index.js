// TL;DR of all inline comments:
// Particles magnetize to mouse position; grayscale shifting lines connect the particles and the mouse position
// Particle amount changes based on canvas size
// Particles gain momentum from mouse movement and bounce off the edges of the canvas
// Click to create a particle "explosion", clicking rapidly makes it more intense
// Try collecting some particles with the mouse, then clicking rapidly as the particles rotate around the mouse
// Dust particles created to add background texture; they do not interact with the mouse
// Background gradient shifts from black to dark gray

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const particles = [];
const fireworkParticles = [];
const dustParticles = [];
const ripples = [];
const techRipples = [];

const mouse = (() => {
  let state = { x: null, y: null };
  return {
    get x() {
      return state.x;
    },
    get y() {
      return state.y;
    },
    set({ x, y }) {
      state = { x, y };
    },
    reset() {
      state = { x: null, y: null };
    }
  };
})();

let frameCount = 0;
let autoDrift = true;

function adjustParticleCount() {
  const particleConfig = {
    heightConditions: [200, 300, 400, 500, 600],
    widthConditions: [450, 600, 900, 1200, 1600],
    particlesForHeight: [40, 60, 70, 90, 110],
    particlesForWidth: [40, 50, 70, 90, 110]
  };

  let numParticles = 130;

  for (let i = 0; i < particleConfig.heightConditions.length; i++) {
    if (canvas.height < particleConfig.heightConditions[i]) {
      numParticles = particleConfig.particlesForHeight[i];
      break;
    }
  }

  for (let i = 0; i < particleConfig.widthConditions.length; i++) {
    if (canvas.width < particleConfig.widthConditions[i]) {
      numParticles = Math.min(numParticles, particleConfig.particlesForWidth[i]);
      break;
    }
  }

  return numParticles;
}

class Particle {
  constructor(x, y, isFirework = false) {
    const baseSpeed = isFirework ? Math.random() * 2 + 1 : Math.random() * 0.5 + 0.3;

    Object.assign(this, {
      isFirework,
      x,
      y,
      vx: Math.cos(Math.random() * Math.PI * 2) * baseSpeed,
      vy: Math.sin(Math.random() * Math.PI * 2) * baseSpeed,
      size: isFirework ? Math.random() * 2 + 2 : Math.random() * 3 + 1,
      gray: Math.random() * 255,
      alpha: 1,
      sizeDirection: Math.random() < 0.5 ? -1 : 1,
      trail: []
    });
  }

  update(mouse) {
    const dist = mouse.x !== null ? (mouse.x - this.x) ** 2 + (mouse.y - this.y) ** 2 : 0;

    if (!this.isFirework) {
      const force = dist && dist < 22500 ? (22500 - dist) / 22500 : 0;

      if (mouse.x === null && autoDrift) {
        this.vx += (Math.random() - 0.5) * 0.03;
        this.vy += (Math.random() - 0.5) * 0.03;
      }

      if (dist) {
        const sqrtDist = Math.sqrt(dist);
        this.vx += ((mouse.x - this.x) / sqrtDist) * force * 0.1;
        this.vy += ((mouse.y - this.y) / sqrtDist) * force * 0.1;
      }

      this.vx *= mouse.x !== null ? 0.99 : 0.998;
      this.vy *= mouse.y !== null ? 0.99 : 0.998;
    } else {
      this.alpha -= 0.02;
    }

    this.x += this.vx;
    this.y += this.vy;

    if (this.x <= 0 || this.x >= canvas.width - 1) this.vx *= -0.9;
    if (this.y < 0 || this.y > canvas.height) this.vy *= -0.9;

    this.size += this.sizeDirection * 0.1;
    if (this.size > 4 || this.size < 1) this.sizeDirection *= -1;
  }

  draw(ctx) {
    ctx.fillStyle = `rgba(${this.gray}, ${this.gray}, ${this.gray}, ${Math.max(this.alpha, 0)})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }

  isDead() {
    return this.isFirework && this.alpha <= 0;
  }
}

function createParticles() {
  particles.length = 0;
  const numParticles = adjustParticleCount();

  for (let i = 0; i < numParticles; i++) {
    particles.push(new Particle(Math.random() * canvas.width, Math.random() * canvas.height));
  }
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  createParticles();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "black");
  gradient.addColorStop(1, "darkgray");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function connectParticles() {
  const gridSize = 120;
  const grid = new Map();

  particles.forEach((p) => {
    const key = `${Math.floor(p.x / gridSize)},${Math.floor(p.y / gridSize)}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(p);
  });

  ctx.lineWidth = 1.5;
  particles.forEach((p) => {
    const gridX = Math.floor(p.x / gridSize);
    const gridY = Math.floor(p.y / gridSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${gridX + dx},${gridY + dy}`;
        if (grid.has(key)) {
          grid.get(key).forEach((neighbor) => {
            if (neighbor !== p) {
              const diffX = neighbor.x - p.x;
              const diffY = neighbor.y - p.y;
              const dist = diffX * diffX + diffY * diffY;
              if (dist < 10000) {
                ctx.strokeStyle = `rgba(200, 200, 200, ${1 - Math.sqrt(dist) / 100})`;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(neighbor.x, neighbor.y);
                ctx.stroke();
              }
            }
          });
        }
      }
    }
  });
}

function animate() {
  drawBackground();
  particles.forEach((p) => {
    p.update(mouse);
    p.draw(ctx);
  });
  connectParticles();
  frameCount++;
  requestAnimationFrame(animate);
}

canvas.addEventListener("mousemove", (e) => {
  mouse.set({ x: e.clientX, y: e.clientY });
});

canvas.addEventListener("mouseleave", () => {
  mouse.reset();
});

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
animate();
