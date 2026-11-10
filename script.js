/**
 * Bouncing Memojis Background
 * Duplica la imagen memoji.png y genera físicas de rebote continuo
 * en toda la pantalla del explorador (chocando con los bordes y entre sí).
 */

(function () {
  const canvas = document.getElementById('bouncing-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  // Lista de todas las imágenes de memojis disponibles (memoji.png hasta memoji26.png)
  const memojiSources = [
    'memoji.png',
    ...Array.from({ length: 25 }, (_, i) => `memoji${i + 2}.png`)
  ];

  const images = [];
  let loadedImagesCount = 0;

  memojiSources.forEach((src) => {
    const im = new Image();
    im.src = src;
    im.onload = () => {
      loadedImagesCount++;
    };
    if (im.complete && im.naturalWidth !== 0) {
      loadedImagesCount++;
    }
    images.push(im);
  });

  let dpr = window.devicePixelRatio || 1;
  let width = window.innerWidth;
  let height = window.innerHeight;
  let particles = [];
  let isImageLoaded = false;
  let animationFrameId = null;

  // Detección de la tarjeta central como pared sólida
  const cardElement = document.querySelector('.card');
  let cardRect = null;

  function updateCardRect() {
    if (cardElement) {
      const r = cardElement.getBoundingClientRect();
      cardRect = {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom
      };
    }
  }

  // Interacción suave con el cursor del mouse
  const mouse = { x: null, y: null };

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
  });

  // Soporte táctil en móviles
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      mouse.x = e.touches[0].clientX;
      mouse.y = e.touches[0].clientY;
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    mouse.x = null;
    mouse.y = null;
  });

  // Impulso expansivo al hacer click o tap
  window.addEventListener('click', (e) => {
    for (const p of particles) {
      const dx = p.x - e.clientX;
      const dy = p.y - e.clientY;
      const dist = Math.hypot(dx, dy);
      const impulseRadius = 250;

      if (dist < impulseRadius && dist > 0) {
        const force = (1 - dist / impulseRadius) * 8;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
        p.vRot = (Math.random() - 0.5) * 0.08;
      }
    }
  });

  class MemojiParticle {
    constructor(x, y, radius, img) {
      this.radius = radius;
      this.x = x;
      this.y = y;
      this.img = img;
      this.mass = radius * radius;

      // Velocidad aleatoria inicial
      const speed = 1.2 + Math.random() * 1.5;
      const angle = Math.random() * Math.PI * 2;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;

      // Rotación sutil
      this.rotation = Math.random() * Math.PI * 2;
      this.vRot = (Math.random() - 0.5) * 0.02;
    }

    update() {
      // Movimiento
      this.x += this.vx;
      this.y += this.vy;
      this.rotation += this.vRot;

      // Rebote contra bordes horizontales
      if (this.x - this.radius < 0) {
        this.x = this.radius;
        this.vx = Math.abs(this.vx);
      } else if (this.x + this.radius > width) {
        this.x = width - this.radius;
        this.vx = -Math.abs(this.vx);
      }

      // Rebote contra bordes verticales
      if (this.y - this.radius < 0) {
        this.y = this.radius;
        this.vy = Math.abs(this.vy);
      } else if (this.y + this.radius > height) {
        this.y = height - this.radius;
        this.vy = -Math.abs(this.vy);
      }

      // Rebote contra la tarjeta central como obstáculo sólido
      if (cardRect) {
        const closestX = Math.max(cardRect.left, Math.min(this.x, cardRect.right));
        const closestY = Math.max(cardRect.top, Math.min(this.y, cardRect.bottom));

        const dx = this.x - closestX;
        const dy = this.y - closestY;
        const dist = Math.hypot(dx, dy);

        if (dist < this.radius) {
          if (dist === 0) {
            // Expulsar al borde más cercano si quedó dentro
            const dl = Math.abs(this.x - cardRect.left);
            const dr = Math.abs(cardRect.right - this.x);
            const dt = Math.abs(this.y - cardRect.top);
            const db = Math.abs(cardRect.bottom - this.y);
            const min = Math.min(dl, dr, dt, db);
            if (min === dl) { this.x = cardRect.left - this.radius; this.vx = -Math.abs(this.vx); }
            else if (min === dr) { this.x = cardRect.right + this.radius; this.vx = Math.abs(this.vx); }
            else if (min === dt) { this.y = cardRect.top - this.radius; this.vy = -Math.abs(this.vy); }
            else { this.y = cardRect.bottom + this.radius; this.vy = Math.abs(this.vy); }
          } else {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = this.radius - dist;

            // Separar la partícula del borde
            this.x += nx * overlap;
            this.y += ny * overlap;

            // Reflejar velocidad (rebote elástico)
            const dot = this.vx * nx + this.vy * ny;
            if (dot < 0) {
              this.vx -= 2 * dot * nx;
              this.vy -= 2 * dot * ny;
            }

            this.vRot = (Math.random() - 0.5) * 0.04;
          }
        }
      }

      // Interacción con mouse/touch (efecto empuje)
      if (mouse.x !== null && mouse.y !== null) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        const repelRadius = 130;

        if (dist < repelRadius && dist > 0) {
          const force = (1 - dist / repelRadius) * 1.8;
          this.vx += (dx / dist) * force;
          this.vy += (dy / dist) * force;
        }
      }

      // Normalizar velocidad para mantener el movimiento perpetuo fluido
      const currentSpeed = Math.hypot(this.vx, this.vy);
      const minSpeed = 1.0;
      const maxSpeed = 3.5;

      if (currentSpeed < minSpeed && currentSpeed > 0) {
        this.vx = (this.vx / currentSpeed) * minSpeed;
        this.vy = (this.vy / currentSpeed) * minSpeed;
      } else if (currentSpeed > maxSpeed) {
        this.vx = (this.vx / currentSpeed) * maxSpeed;
        this.vy = (this.vy / currentSpeed) * maxSpeed;
      }
    }

    draw(context) {
      const imageToDraw = (this.img && this.img.complete && this.img.naturalWidth > 0)
        ? this.img
        : images.find((im) => im.complete && im.naturalWidth > 0);

      if (!imageToDraw) return;

      context.save();
      context.translate(this.x, this.y);
      context.rotate(this.rotation);

      const size = this.radius * 2;
      context.drawImage(imageToDraw, -this.radius, -this.radius, size, size);

      context.restore();
    }
  }

  // Resolver colisiones elásticas entre memojis
  function resolveCollisions() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = p1.radius + p2.radius;

        if (dist < minDist && dist > 0) {
          // Vector normal
          const nx = dx / dist;
          const ny = dy / dist;

          // Separar partículas para evitar solapamientos
          const overlap = (minDist - dist) * 0.5;
          p1.x -= nx * overlap;
          p1.y -= ny * overlap;
          p2.x += nx * overlap;
          p2.y += ny * overlap;

          // Choque elástico 2D
          const kx = p1.vx - p2.vx;
          const ky = p1.vy - p2.vy;
          const impulse = (2 * (nx * kx + ny * ky)) / (p1.mass + p2.mass);

          p1.vx -= impulse * p2.mass * nx;
          p1.vy -= impulse * p2.mass * ny;
          p2.vx += impulse * p1.mass * nx;
          p2.vy += impulse * p1.mass * ny;

          // Variar rotación al chocar
          p1.vRot = (Math.random() - 0.5) * 0.03;
          p2.vRot = (Math.random() - 0.5) * 0.03;
        }
      }
    }
  }

  function initParticles() {
    particles = [];
    updateCardRect();

    // Cantidad adaptativa según el tamaño de la pantalla (entre 8 y 20)
    const count = Math.min(22, Math.max(8, Math.floor((width * height) / 52000)));

    function isInsideCard(px, py, pr) {
      if (!cardRect) return false;
      return (
        px + pr > cardRect.left &&
        px - pr < cardRect.right &&
        py + pr > cardRect.top &&
        py - pr < cardRect.bottom
      );
    }

    // Barajamos las imágenes para repartir variedad entre las partículas
    const shuffledImages = [...images].sort(() => Math.random() - 0.5);

    for (let i = 0; i < count; i++) {
      const imgForParticle = shuffledImages[i % shuffledImages.length];
      // Tamaños variables para darle dinamismo y profundidad
      const radius = 28 + Math.random() * 22; // Diámetro entre 56px y 100px

      let x = radius + Math.random() * (width - radius * 2);
      let y = radius + Math.random() * (height - radius * 2);

      // Evitar colocar partículas superpuestas o dentro de la tarjeta central
      for (let attempt = 0; attempt < 25; attempt++) {
        let invalid = isInsideCard(x, y, radius);
        if (!invalid) {
          for (const p of particles) {
            if (Math.hypot(p.x - x, p.y - y) < p.radius + radius) {
              invalid = true;
              break;
            }
          }
        }
        if (!invalid) break;
        x = radius + Math.random() * (width - radius * 2);
        y = radius + Math.random() * (height - radius * 2);
      }

      particles.push(new MemojiParticle(x, y, radius, imgForParticle));
    }
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    updateCardRect();

    // Reposicionar partículas si quedaron fuera de pantalla o dentro de la tarjeta
    particles.forEach((p) => {
      if (p.x + p.radius > width) p.x = width - p.radius;
      if (p.x - p.radius < 0) p.x = p.radius;
      if (p.y + p.radius > height) p.y = height - p.radius;
      if (p.y - p.radius < 0) p.y = p.radius;

      if (cardRect) {
        const closestX = Math.max(cardRect.left, Math.min(p.x, cardRect.right));
        const closestY = Math.max(cardRect.top, Math.min(p.y, cardRect.bottom));
        const dist = Math.hypot(p.x - closestX, p.y - closestY);
        if (dist < p.radius) {
          const dl = Math.abs(p.x - cardRect.left);
          const dr = Math.abs(cardRect.right - p.x);
          const dt = Math.abs(p.y - cardRect.top);
          const db = Math.abs(cardRect.bottom - p.y);
          const min = Math.min(dl, dr, dt, db);
          if (min === dl) p.x = cardRect.left - p.radius;
          else if (min === dr) p.x = cardRect.right + p.radius;
          else if (min === dt) p.y = cardRect.top - p.radius;
          else p.y = cardRect.bottom + p.radius;
        }
      }
    });
  }

  function animate() {
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (loadedImagesCount > 0) {
      resolveCollisions();
      for (const p of particles) {
        p.update();
        p.draw(ctx);
      }
    }

    ctx.restore();
    animationFrameId = requestAnimationFrame(animate);
  }

  window.addEventListener('resize', () => {
    resize();
  });

  // Respetar preferencia de reducción de movimiento si el usuario la tiene activa
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  function checkMotionPreference() {
    if (motionQuery.matches) {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    } else {
      if (!animationFrameId) animate();
    }
  }

  motionQuery.addEventListener('change', checkMotionPreference);

  // Inicialización
  resize();
  initParticles();
  animate();
})();
