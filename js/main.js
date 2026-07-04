/* ============================================================
   PEDRO HENRIK — ADVOGADO · Interações
   Vanilla JS, sem dependências.
   ============================================================ */

/* ------------------------------------------------------------
   CONFIGURAÇÃO — edite apenas aqui
   ------------------------------------------------------------ */
const CONFIG = {
  // WhatsApp do Dr. Pedro Henrik (+55 13 97417-4819)
  whatsappNumber: '5513974174819',
  // Mensagem padrão ao abrir o WhatsApp
  whatsappMessage: 'Olá, Dr. Pedro! Vim pelo site e preciso de orientação jurídica.',
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ------------------------------------------------------------
   WHATSAPP — monta os links de todos os elementos [data-wa].
   [data-wa-msg] permite mensagem específica por contexto.
   ------------------------------------------------------------ */
document.querySelectorAll('[data-wa]').forEach((el) => {
  const msg = el.dataset.waMsg || CONFIG.whatsappMessage;
  el.href = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(msg)}`;
  el.target = '_blank';
  el.rel = 'noopener';
});

/* ------------------------------------------------------------
   PRELOADER — contagem 0→100 e revelação da página
   ------------------------------------------------------------ */
const preloader = document.getElementById('preloader');
const preCounter = document.getElementById('preCounter');

function finishLoading() {
  preloader.classList.add('done');
  document.body.removeAttribute('data-loading');
  // Dispara a animação das linhas do título do hero
  document.querySelector('.hero__title')?.classList.add('lines-in');
  // Revela os elementos do hero já visíveis
  revealVisible();
  setTimeout(() => preloader.remove(), 1100);
}

if (prefersReducedMotion) {
  finishLoading();
} else {
  let progress = 0;
  const tick = setInterval(() => {
    // Avanço irregular — parece carregamento real, não uma barra linear
    progress = Math.min(100, progress + Math.ceil((100 - progress) * 0.12) + 1);
    preCounter.textContent = String(progress).padStart(2, '0');
    if (progress >= 100) {
      clearInterval(tick);
      setTimeout(finishLoading, 350);
    }
  }, 55);
}

/* ------------------------------------------------------------
   HEADER — muda de estado ao rolar
   ------------------------------------------------------------ */
const header = document.getElementById('header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const y = window.scrollY;
  header.classList.toggle('scrolled', y > 40);
  lastScroll = y;
}, { passive: true });

/* ------------------------------------------------------------
   MENU MOBILE
   ------------------------------------------------------------ */
const menuToggle = document.getElementById('menuToggle');
const mobileMenu = document.getElementById('mobileMenu');

function setMenu(open) {
  menuToggle.classList.toggle('open', open);
  mobileMenu.classList.toggle('open', open);
  document.body.classList.toggle('menu-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  mobileMenu.setAttribute('aria-hidden', String(!open));
  menuToggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
}

menuToggle.addEventListener('click', () => setMenu(!mobileMenu.classList.contains('open')));

/* ------------------------------------------------------------
   NAVEGAÇÃO SUAVE — fecha o menu mobile ao navegar
   ------------------------------------------------------------ */
document.querySelectorAll('[data-nav]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href');
    if (!id || !id.startsWith('#')) return;
    e.preventDefault();
    setMenu(false);
    document.querySelector(id)?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  });
});

/* ------------------------------------------------------------
   REVEAL AO ROLAR — IntersectionObserver
   ------------------------------------------------------------ */
const revealEls = document.querySelectorAll('[data-reveal]');
const maskTitles = document.querySelectorAll('.mask-lines');

// Delay opcional por elemento: data-reveal-delay="200" (ms)
revealEls.forEach((el) => {
  const delay = el.dataset.revealDelay;
  if (delay) el.style.setProperty('--reveal-delay', `${delay}ms`);
});

const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add(entry.target.classList.contains('mask-lines') ? 'lines-in' : 'in');
    io.unobserve(entry.target);
  });
}, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });

revealEls.forEach((el) => io.observe(el));
maskTitles.forEach((el) => io.observe(el));

// Força o reveal do que já está na tela (chamado ao fim do preloader)
function revealVisible() {
  document.querySelectorAll('.hero [data-reveal]').forEach((el) => el.classList.add('in'));
}

/* ------------------------------------------------------------
   CURSOR CUSTOMIZADO — ponto + anel com inércia
   Elementos com [data-cursor="Texto"] mostram um selo com rótulo.
   ------------------------------------------------------------ */
if (finePointer && !prefersReducedMotion) {
  const dot = document.createElement('div');
  const ring = document.createElement('div');
  dot.className = 'cursor-dot';
  ring.className = 'cursor-ring';
  ring.innerHTML = '<span></span>';
  document.body.append(dot, ring);
  const label = ring.querySelector('span');

  let mx = -100, my = -100;   // posição real do mouse
  let rx = -100, ry = -100;   // posição do anel (com atraso)

  window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });

  (function animateCursor() {
    // O anel persegue o ponto com suavização (lerp)
    rx += (mx - rx) * 0.16;
    ry += (my - ry) * 0.16;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(animateCursor);
  })();

  // Hover em elementos interativos → anel cresce
  document.querySelectorAll('a, button').forEach((el) => {
    el.addEventListener('mouseenter', () => ring.classList.add('is-hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('is-hover'));
  });

  // Áreas com rótulo (ex.: trilho de cards → "Arraste")
  document.querySelectorAll('[data-cursor]').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      label.textContent = el.dataset.cursor;
      ring.classList.add('has-label');
    });
    el.addEventListener('mouseleave', () => ring.classList.remove('has-label'));
  });
}

/* ------------------------------------------------------------
   BOTÕES MAGNÉTICOS — atração sutil ao passar o mouse
   ------------------------------------------------------------ */
if (finePointer && !prefersReducedMotion) {
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      el.style.transform = `translate(${x * 0.18}px, ${y * 0.18}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });
}

/* ------------------------------------------------------------
   TRILHO HORIZONTAL — arraste, setas, barra de progresso e
   "nudge" de apresentação (mostra que o conteúdo desliza)
   ------------------------------------------------------------ */
const rail = document.getElementById('rail');
const railWrap = document.querySelector('.rail-wrap');
const railPrev = document.getElementById('railPrev');
const railNext = document.getElementById('railNext');
const railProgress = document.getElementById('railProgress');

if (rail) {
  // Passo de rolagem = largura de um card + o gap do flex
  const step = () => {
    const card = rail.querySelector('.card');
    return card ? card.offsetWidth + 20 : 400;
  };

  // Barra de progresso + estado das setas
  function updateRail() {
    const max = rail.scrollWidth - rail.clientWidth;
    const ratio = max > 0 ? rail.scrollLeft / max : 0;
    if (railProgress) railProgress.style.transform = `scaleX(${Math.max(0.06, ratio)})`;
    if (railPrev) railPrev.disabled = rail.scrollLeft <= 4;
    if (railNext) railNext.disabled = rail.scrollLeft >= max - 4;
  }
  rail.addEventListener('scroll', updateRail, { passive: true });
  window.addEventListener('resize', updateRail, { passive: true });
  updateRail();

  railPrev?.addEventListener('click', () => rail.scrollBy({ left: -step(), behavior: 'smooth' }));
  railNext?.addEventListener('click', () => rail.scrollBy({ left: step(), behavior: 'smooth' }));

  // Nudge: na primeira vez que a seção aparece, o trilho dá uma
  // "espiada" para o lado — affordance de que dá para deslizar
  if (!prefersReducedMotion) {
    const nudge = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || rail.scrollLeft > 0) return;
      nudge.disconnect();
      setTimeout(() => {
        rail.scrollTo({ left: 96, behavior: 'smooth' });
        setTimeout(() => rail.scrollTo({ left: 0, behavior: 'smooth' }), 620);
      }, 650);
    }, { threshold: 0.35 });
    nudge.observe(rail);
  }

  // Arraste com o mouse (touch já rola nativamente)
  if (finePointer) {
    let isDown = false;
    let startX = 0;
    let startScroll = 0;

    rail.addEventListener('pointerdown', (e) => {
      isDown = true;
      startX = e.clientX;
      startScroll = rail.scrollLeft;
      railWrap.classList.add('dragging');
      rail.classList.add('dragging');
    });

    window.addEventListener('pointermove', (e) => {
      if (!isDown) return;
      rail.scrollLeft = startScroll - (e.clientX - startX);
    });

    window.addEventListener('pointerup', () => {
      isDown = false;
      railWrap.classList.remove('dragging');
      rail.classList.remove('dragging');
    });

    // Evita que o arraste dispare o clique nos links dos cards
    rail.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', (e) => {
        if (Math.abs(rail.scrollLeft - startScroll) > 8) e.preventDefault();
      });
    });
  }
}

/* ------------------------------------------------------------
   RODAPÉ — ano automático
   ------------------------------------------------------------ */
document.getElementById('year').textContent = new Date().getFullYear();
