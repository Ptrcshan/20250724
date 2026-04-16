/* =============================================
   main.js — Particle text engine
   - "TAP DIMANA AJA" muncul langsung (~0.8s)
   - Responsif portrait & landscape
   - Support backsound.mp3
   - Progress dots
   ============================================= */

;(function (window) {

  window.requestAnimationFrame =
    window.requestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.msRequestAnimationFrame;

  /* ---- CONFIG ---- */
  const FRAME_RATE   = 50;
  const PARTICLE_NUM = 4500;
  const RADIUS       = Math.PI * 2;
  const CANVAS_H     = 160;   // canvas text strip height
  const CANVAS_ID    = 'canvas';

  const texts = [
    'TAP DIMANA AJA',
    'JANGAN LUPA',
    'PAKAI LANDSCAPE MODE',
    'HALLO FALDINO!',
    'MINTA WAKTU KAMU 5 MENIT YA',
    'BACA INI BAIK-BAIK',
    'DAN HARUS SABAR YA',
    'AKU GA MAU UCAPIN GOOD NIGHT',
    'AKU MAU UCAPIN',
    'SEMANGAT TERUS YA, DIN',
    'SEMANGAT KERJANYA',
    'SEMANGAT MENITI KARIERNYA',
    'TERCAPAI SEMUA RENCANAMU',
    'SEGALA URUSANMU DILANCARKAN',
    'YANG KAMU DOAKAN TERKABUL',
    'SELALU SEHAT',
    'KALAU CAPEK, ISTIRAHAT YA',
    'SEMOGA TIDURMU NYENYAK',
    'MAKANMU TERATUR',
    'JANGAN LUPA BERDOA',
    'OKE?',
    'GOD BLESS YOU',
    'FALDINO OCTAVIO RITONGA',
    'ORANG HEBAT',
    'ONE MORE',
    'ALWAYS'
  ];

  /* ---- STATE ---- */
  let canvas, ctx;
  let particles  = [];
  let textIndex  = 0;
  let text       = texts[0];
  let quiver     = true;
  let canvasW    = 0;
  let textSize   = 60;
  let audio      = null;
  let audioReady = false;
  let muted      = false;

  /* ---- CALCULATE CANVAS WIDTH & TEXT SIZE ---- */
  function calcDimensions() {
    const vw = window.innerWidth;
    // Canvas width: full viewport width, clamped to 1500
    canvasW  = Math.min(vw, 1500);
    // Text size: responsive to viewport width
    textSize = Math.max(28, Math.min(72, vw * 0.07));
  }

  /* ---- SET CANVAS DIMENSIONS & POSITION ---- */
  function setDimensions() {
    calcDimensions();
    canvas.width  = canvasW;
    canvas.height = CANVAS_H;
    canvas.style.width  = canvasW + 'px';
    canvas.style.height = CANVAS_H + 'px';
    // Center vertically, slightly above mid
    const topOffset = (window.innerHeight * 0.42) - (CANVAS_H / 2);
    canvas.style.marginTop  = Math.max(topOffset, 60) + 'px';
    canvas.style.marginLeft = '0px';
  }

  /* ---- DRAW LOOP ---- */
  function draw() {
    ctx.clearRect(0, 0, canvasW, CANVAS_H);
    ctx.fillStyle    = 'rgb(255,255,255)';
    ctx.textBaseline = 'middle';
    ctx.font         = `bold ${textSize}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillText(
      text,
      (canvasW - ctx.measureText(text).width) * 0.5,
      CANVAS_H * 0.5
    );

    const imgData = ctx.getImageData(0, 0, canvasW, CANVAS_H);
    ctx.clearRect(0, 0, canvasW, CANVAS_H);

    for (let i = 0; i < particles.length; i++) {
      particles[i].inText = false;
    }

    particleText(imgData);
    window.requestAnimationFrame(draw);
  }

  function particleText(imgData) {
    const pxls = [];
    for (let w = canvasW; w > 0; w -= 3) {
      for (let h = 0; h < CANVAS_H; h += 3) {
        const index = (w + h * canvasW) * 4;
        if (imgData.data[index] > 1) {
          pxls.push([w, h]);
        }
      }
    }

    let j = Math.floor((particles.length - pxls.length) / 2);
    j = j < 0 ? 0 : j;

    for (let i = 0; i < pxls.length && j < particles.length; i++, j++) {
      try {
        const p = particles[j];
        let X, Y;
        if (quiver) {
          X = pxls[i][0] - (p.px + Math.random() * 8);
          Y = pxls[i][1] - (p.py + Math.random() * 8);
        } else {
          X = pxls[i][0] - p.px;
          Y = pxls[i][1] - p.py;
        }
        const T = Math.sqrt(X * X + Y * Y);
        const A = Math.atan2(Y, X);
        const C = Math.cos(A);
        const S = Math.sin(A);
        p.x = p.px + C * T * p.delta;
        p.y = p.py + S * T * p.delta;
        p.px = p.x;
        p.py = p.y;
        p.inText = true;
        p.fadeIn();
        p.draw(ctx);
      } catch (e) { /* ignore */ }
    }

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (!p.inText) {
        p.fadeOut();
        const X = p.mx - p.px;
        const Y = p.my - p.py;
        const T = Math.sqrt(X * X + Y * Y);
        const A = Math.atan2(Y, X);
        p.x = p.px + Math.cos(A) * T * p.delta / 2;
        p.y = p.py + Math.sin(A) * T * p.delta / 2;
        p.px = p.x;
        p.py = p.y;
        p.draw(ctx);
      }
    }
  }

  /* ---- PROGRESS DOTS ---- */
  function buildProgressDots() {
    const container = document.getElementById('progress-dots');
    container.innerHTML = '';
    texts.forEach((_, i) => {
      const d = document.createElement('div');
      d.className = 'dot' + (i === 0 ? ' active' : '');
      d.id = 'dot-' + i;
      container.appendChild(d);
    });
  }

  function updateDots() {
    texts.forEach((_, i) => {
      const d = document.getElementById('dot-' + i);
      if (!d) return;
      d.className = 'dot' +
        (i === textIndex ? ' active' : i < textIndex ? ' done' : '');
    });
  }

  /* ---- ADVANCE TEXT ---- */
  function nextText() {
    // Start audio on first tap (browser policy)
    if (!audioReady && audio) {
      audio.play().catch(() => {});
      audioReady = true;
    }

    if (textIndex >= texts.length - 1) return;
    textIndex++;
    text = texts[textIndex];
    updateDots();

    // Show/hide tap hint
    const hint = document.getElementById('tap-hint');
    if (hint) {
      hint.classList.toggle('visible', textIndex < texts.length - 1);
    }
  }

  /* ---- EVENTS ---- */
  function attachEvents() {
    document.addEventListener('click',      nextText, false);
    document.addEventListener('touchstart', nextText, { passive: true });
  }

  /* ---- MUSIC ---- */
  function initAudio() {
    audio = new Audio('backsound.mp3');
    audio.loop   = true;
    audio.volume = 0.55;

    const btn = document.getElementById('music-btn');
    if (!btn) return;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();  // don't advance text
      muted = !muted;
      audio.muted = muted;
      btn.classList.toggle('muted', muted);
    });

    // Also stop touch from propagating (so music btn tap doesn't advance text)
    btn.addEventListener('touchstart', function (e) {
      e.stopPropagation();
    }, { passive: true });
  }

  /* ---- TAP HINT ---- */
  function showTapHint() {
    const hint = document.getElementById('tap-hint');
    if (hint) {
      // Show after particles settle (~800ms)
      setTimeout(function () {
        hint.classList.add('visible');
      }, 820);
    }
  }

  /* ---- RESIZE ---- */
  function onResize() {
    setDimensions();
    // Re-scatter particles to new canvas size
    particles.forEach(p => p.resetPosition(canvas));
  }

  /* ---- INIT ---- */
  function init() {
    canvas = document.getElementById(CANVAS_ID);
    if (!canvas || !canvas.getContext) return;
    ctx = canvas.getContext('2d');

    setDimensions();
    buildProgressDots();
    attachEvents();
    initAudio();
    showTapHint();

    for (let i = 0; i < PARTICLE_NUM; i++) {
      particles[i] = new Particle(canvas, canvasW);
    }

    draw();

    window.addEventListener('resize', onResize, false);
  }

  /* ---- PARTICLE CLASS ---- */
  class Particle {
    constructor(canvas, cw) {
      this.resetPosition(canvas, cw);
    }

    resetPosition(canvas) {
      const spread = canvas.height;
      const size   = Math.random() * 1.3;

      this.delta = 0.07;   // slightly snappier than original (0.06)

      this.px = Math.random() * canvas.width;
      this.py = (canvas.height * 0.5) + ((Math.random() - 0.5) * spread);

      this.x  = this.px;
      this.y  = this.py;

      this.mx = this.px;
      this.my = this.py;

      this.size  = size;
      this.inText = false;

      this.opacity      = 0;
      this.fadeInRate   = 0.006;
      this.fadeOutRate  = 0.03;
      this.opacityTresh = 0.98;
      this.fadingOut    = true;
      this.fadingIn     = true;
    }

    fadeIn() {
      this.fadingIn = this.opacity <= this.opacityTresh;
      if (this.fadingIn) {
        this.opacity += this.fadeInRate;
      } else {
        this.opacity = 1;
      }
    }

    fadeOut() {
      this.fadingOut = this.opacity > 0;
      if (this.fadingOut) {
        this.opacity -= this.fadeOutRate;
        if (this.opacity < 0) this.opacity = 0;
      } else {
        this.opacity = 0;
      }
    }

    draw(ctx) {
      ctx.fillStyle = `rgba(226,225,142,${this.opacity})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, RADIUS, true);
      ctx.closePath();
      ctx.fill();
    }
  }

  /* ---- KICK OFF ---- */
  // No delay — show immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
