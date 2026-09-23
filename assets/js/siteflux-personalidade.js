/* Siteflux — camada "personalidade".
   Sem este arquivo as pastas de #projetos seguem completas: leque e deslize da capa são CSS, e "Explorar projeto" é um
   <details> nativo com a descrição e as telas. Aqui: (1) a galeria em tela cheia de cada projeto, lida desse mesmo
   <details>, com o anel de telas; (2) o carrossel de capas; (3) a contagem de telas e o carregamento adiantado das capas;
   (4) o sumiço do ícone de imagem quebrada nas capas decorativas; (5) as letras em rolagem dos links da cortina do menu. */
(function () {
  'use strict';

  var STEP_MS = 18, CAP_MS = 130; // atraso por letra, com teto para o conjunto
  var segmenter = null; // um só Intl.Segmenter (criar um por chamada custava ~190 ms num celular médio)

  function graphemes(text) {
    if (window.Intl && Intl.Segmenter) {
      if (!segmenter) { segmenter = new Intl.Segmenter('pt', { granularity: 'grapheme' }); }
      var out = [], it = segmenter.segment(text)[Symbol.iterator](), s;
      while (!(s = it.next()).done) { out.push(s.value.segment); }
      return out;
    }
    return Array.from ? Array.from(text) : text.split('');
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) { node.className = cls; }
    if (text != null) { node.textContent = text; }
    return node;
  }

  /* <a>Texto</a> vira <a><span.roll aria-hidden>letras em duas cópias</span><span.sr-only>Texto</span></a>:
     um único nome acessível; a altura vem de em/line-height, então não depende de medir a fonte. */
  function buildRoll(link) {
    if (link.children.length || link.classList.contains('has-roll')) { return; } // só links de texto puro
    var label = link.textContent.replace(/\s+/g, ' ').trim();
    if (!label || label.length > 24) { return; }
    var words = label.split(' ');
    var total = graphemes(label.replace(/ /g, '')).length;
    var step = total > 1 ? Math.min(STEP_MS, CAP_MS / (total - 1)) : 0;
    var roll = el('span', 'roll'), n = 0;
    roll.setAttribute('aria-hidden', 'true');
    words.forEach(function (word, w) {
      if (w) { roll.appendChild(document.createTextNode(' ')); }
      var box = el('span', 'roll-w');
      graphemes(word).forEach(function (ch) {
        var cell = el('span', 'roll-c'), track = el('span', 'roll-t');
        track.style.setProperty('--d', Math.round(n * step) + 'ms');
        track.appendChild(el('span', '', ch));
        track.appendChild(el('span', '', ch));
        cell.appendChild(track); box.appendChild(cell); n++;
      });
      roll.appendChild(box);
    });
    link.textContent = '';
    link.appendChild(roll);
    link.appendChild(el('span', 'sr-only', label));
    link.classList.add('has-roll');
  }

  /* ------------------------------------------------------------------
     Galeria do projeto (skill hero-imersiva-miniaturas). Um <dialog> só, preenchido com o <li> clicado:
     cores (--p-*), nome, tipo, descrição e as telas (src/srcset/alt/legenda) vêm do HTML, que é a fonte única.
     Um índice governa tela, anel, posição ("2 de 5 telas") e legenda — e todos só mudam quando a imagem nova aparece
     de fato: a troca usa duas camadas depois de a próxima imagem decodificar; um token descarta carregamentos antigos;
     se a imagem falhar ficam a última tela válida e a informação dela. Se nem a primeira carregar, a moldura traz um
     aviso e as setas seguem disponíveis — nunca um modal vazio.
     ------------------------------------------------------------------ */
  var ICON_PREV = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7"/></svg>';
  var ICON_NEXT = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>';
  var gal = null;
  var galleryMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // FLIP da moldura real: nenhuma cópia de DOM, imagem ou estilo no clique.
  function coverBounds(node) {
    if (!node || !node.isConnected) { return null; }
    var r = node.getBoundingClientRect();
    return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight ? r : null;
  }
  function cancelGalleryPreparation(g) {
    if (g.prepareFrame) { cancelAnimationFrame(g.prepareFrame); g.prepareFrame = 0; }
    g.prepare = null; g.el.classList.remove('is-preparing');
  }
  function finishGalleryPreparation(g, immediate) {
    var prepare = g.prepare;
    cancelGalleryPreparation(g);
    if (prepare && g.el.open) { prepare(immediate); }
  }
  function clearGalleryFlight(g) {
    cancelGalleryPreparation(g);
    var m = g.motion;
    if (!m) { return; }
    g.motion = null;
    m.animations.forEach(function (a) { a.onfinish = null; a.cancel(); });
    g.el.classList.remove('is-morphing');
    if (m.source) { m.source.style.visibility = m.visibility; }
  }

  function settleGalleryFlight(g) {
    if (g && g.prepare) { finishGalleryPreparation(g, true); return; }
    if (!g || !g.motion) { return; }
    var closing = g.motion.closing;
    clearGalleryFlight(g);
    if (closing && g.el.open) { g.el.close(); }
    else if (g.el.open && g.onEntered) { var entered = g.onEntered; g.onEntered = null; entered(); }
  }

  function flyGallery(g, bounds, closing) {
    if (galleryMotion.matches || !g.moldura.animate) { clearGalleryFlight(g); return false; }
    // Reads precede writes. An interrupted opening retargets the live matrix.
    var current = getComputedStyle(g.moldura).transform;
    var shade = closing ? getComputedStyle(g.fundo).opacity : '0';
    var chrome = closing ? g.chrome.map(function (node) { return getComputedStyle(node).opacity; }) : [];
    clearGalleryFlight(g);
    var target = g.moldura.getBoundingClientRect();
    if (!target.width || !target.height) { return false; }
    var transported = bounds ? 'translate3d(' + (bounds.left - target.left) + 'px,' + (bounds.top - target.top) + 'px,0) scale(' + bounds.width / target.width + ',' + bounds.height / target.height + ')' : 'scale(.985)';
    var source = bounds ? g.sourceElement : null;
    var m = g.motion = { closing: closing, animations: [], source: source, visibility: source ? source.style.visibility : '' };
    g.el.classList.add('is-morphing');
    if (source) { source.style.visibility = 'hidden'; }
    var duration = bounds ? (closing ? 300 : (innerWidth <= 760 ? 360 : 420)) : 160;
    function animate(node, frames, ms, delay) {
      var a = node.animate(frames, { duration: ms || duration, delay: delay || 0, easing: closing ? 'cubic-bezier(.4,0,.25,1)' : 'cubic-bezier(.22,.8,.25,1)', fill: 'both' });
      m.animations.push(a); return a;
    }
    var main = animate(g.moldura, closing ? [{ transform: current, opacity: 1 }, { transform: transported, opacity: bounds ? 1 : 0 }] : [{ transform: transported, opacity: bounds ? 1 : 0 }, { transform: 'none', opacity: 1 }]);
    animate(g.fundo, [{ opacity: shade }, { opacity: closing ? 0 : 1 }], closing ? duration : Math.min(240, duration));
    g.chrome.forEach(function (node, i) { animate(node, [{ opacity: closing ? chrome[i] : 0 }, { opacity: closing ? 0 : 1 }], closing ? 100 : 180, closing ? 0 : 50); });
    main.onfinish = function () { if (g.motion === m) { settleGalleryFlight(g); } };
    return true;
  }

  function visibleCover(li) {
    var screen = li.querySelector('.pasta-janela'), best = null, area = -1;
    if (!screen) { return null; }
    var box = screen.getBoundingClientRect();
    Array.prototype.forEach.call(screen.querySelectorAll('img'), function (im) {
      var r = im.getBoundingClientRect(), overlap = Math.max(0, Math.min(r.bottom, box.bottom) - Math.max(r.top, box.top));
      if (overlap > area && im.complete && im.naturalWidth) { area = overlap; best = im; }
    });
    return best;
  }

  function buildGallery() {
    var d = document.createElement('dialog');
    d.className = 'galeria';
    d.setAttribute('aria-labelledby', 'galeria-titulo');
    d.innerHTML =
      '<div class="galeria-fundo" aria-hidden="true"></div>' +
      '<div class="galeria-in">' +
        // 2.34: sair da galeria é "voltar aos projetos" — a seta oficial da marca girada, e "Fechar" em caixa normal
        '<div class="galeria-topo"><p class="galeria-tipo"></p><button class="galeria-fechar" type="button"><svg class="gf-seta" viewBox="0 0 204.42 204.42" aria-hidden="true" focusable="false"><use href="#sf-seta"></use></svg>Fechar</button></div>' +
        '<h3 class="galeria-titulo" id="galeria-titulo"></h3>' +
        /* 2.29 (pedido do Walter): tela principal centrada → anel giratório embaixo, com uma seta de cada lado → descrição.
           Sem a fila de miniaturas nem o contador numérico; a legenda curta da tela fica sob a moldura. */
        '<div class="galeria-palco"><div class="galeria-moldura"><div class="galeria-barra" aria-hidden="true"><i></i><i></i><i></i></div>' +
          '<div class="galeria-tela"><img alt="" decoding="async" /><img alt="" decoding="async" />' +
          '<p class="galeria-aviso" hidden><b>Esta tela não carregou.</b><span>Use as setas para ver outra tela.</span></p></div></div>' +
          '<p class="galeria-conta" aria-live="polite"><i class="sr-only"></i><span></span></p></div>' +
        '<div class="galeria-nav"><button class="galeria-seta" type="button" data-dir="-1" aria-label="Tela anterior">' + ICON_PREV + '</button>' +
          '<div class="galeria-anel" aria-hidden="true"><div class="ga-palco"><div class="ga-giro"></div></div><i class="ga-regua"></i></div>' +
          '<button class="galeria-seta" type="button" data-dir="1" aria-label="Próxima tela">' + ICON_NEXT + '</button>' +
          '<button class="galeria-ampliar" type="button">Ampliar tela</button></div>' + // o rótulo troca com o estado: sem aria-pressed (seria "Reduzir tela, pressionado")
        '<p class="galeria-pos" aria-hidden="true"></p>' + // 2.30: "2 de 5 telas" abaixo do anel (o aria-live da legenda já anuncia a posição)
        '<p class="galeria-desc"></p>' +
      '</div>';
    document.body.appendChild(d);
    var g = {
      el: d, dentro: d.querySelector('.galeria-in'), tipo: d.querySelector('.galeria-tipo'), titulo: d.querySelector('.galeria-titulo'), desc: d.querySelector('.galeria-desc'),
      legenda: d.querySelector('.galeria-conta span'), posicao: d.querySelector('.galeria-conta .sr-only'), // "Tela 2 de 5" só para leitores de tela
      pos: d.querySelector('.galeria-pos'), nav: d.querySelector('.galeria-nav'), conta: d.querySelector('.galeria-conta'), topo: d.querySelector('.galeria-topo'),
      layers: d.querySelectorAll('.galeria-tela img'), palco: d.querySelector('.galeria-palco'), tela: d.querySelector('.galeria-tela'), moldura: d.querySelector('.galeria-moldura'),
      aviso: d.querySelector('.galeria-aviso'), ampliar: d.querySelector('.galeria-ampliar'),
      fundo: d.querySelector('.galeria-fundo'), chrome: Array.prototype.slice.call(d.querySelectorAll('.galeria-topo, .galeria-titulo, .galeria-conta, .galeria-nav, .galeria-pos, .galeria-desc')),
      slides: [], index: -1, shown: -1, front: 0, token: 0, opener: null, sourceElement: null, motion: null,
      anel: { box: d.querySelector('.galeria-anel'), palco: d.querySelector('.ga-palco'), giro: d.querySelector('.ga-giro'), regua: d.querySelector('.ga-regua'), paineis: [], n: 0, R: 0, ang: 0, raf: 0, drag: null }
    };
    ringBind(g);
    d.querySelector('.galeria-fechar').addEventListener('click', function () { closeGallery(); });
    Array.prototype.forEach.call(d.querySelectorAll('.galeria-seta'), function (btn) {
      btn.addEventListener('click', function () { go(g.index + Number(btn.getAttribute('data-dir'))); });
    });
    g.ampliar.addEventListener('click', function () { setZoom(!g.tela.classList.contains('is-zoom')); });
    d.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) { return; }
      if (e.key === 'Tab') {
        if (g.prepare || (g.motion && !g.motion.closing)) { settleGalleryFlight(g); }
        // o Tab circula dentro do diálogo (sem isso o navegador leva o foco para a própria interface por um instante)
        var foco = Array.prototype.filter.call(d.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])'), function (el) { return !el.disabled && !el.hidden && el.getClientRects().length; });
        if (foco.length) {
          if (e.shiftKey && document.activeElement === foco[0]) { e.preventDefault(); foco[foco.length - 1].focus(); }
          else if (!e.shiftKey && document.activeElement === foco[foco.length - 1]) { e.preventDefault(); foco[0].focus(); }
        }
        return;
      }
      if (e.key === 'ArrowRight') { go(g.index + 1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { go(g.index - 1); e.preventDefault(); }
      else if (e.key === 'Home') { go(0); e.preventDefault(); }
      else if (e.key === 'End') { go(g.slides.length - 1); e.preventDefault(); }
    });
    d.addEventListener('cancel', function (e) { e.preventDefault(); closeGallery(); }); // Esc passa pela mesma saída
    d.addEventListener('close', function () {
      if (d.open) { return; } // o evento close é assíncrono: se a galeria já foi reaberta, a limpeza não pode desfazer a abertura
      g.onEntered = null;
      clearGalleryFlight(g);
      ringStop(g);
      g.anel.drag = null; g.anel.box.classList.remove('is-arrastando');
      g.token++;
      document.documentElement.classList.remove('galeria-aberta');
      if (window.sfLockWidth && !document.documentElement.classList.contains('menu-open')) { window.sfLockWidth(false); }
      document.documentElement.style.backgroundColor = g.rootBackground || '';
      document.dispatchEvent(new Event('siteflux:galleryclose'));
      setZoom(false);
      var focusTarget = g.opener;
      if (focusTarget && (document.activeElement !== focusTarget || g.needsReturnMeasure)) {
        // O diálogo normalmente já devolveu o foco. Só resize ou clique na capa exigem ajuste.
        requestAnimationFrame(function () {
          if (g.el.open || g.opener !== focusTarget || !focusTarget.isConnected) { return; }
          if (document.activeElement !== focusTarget) { focusTarget.focus({ preventScroll: true }); }
          if (g.needsReturnMeasure) {
            var focusBox = focusTarget.getBoundingClientRect();
            if (focusBox.top < 0 || focusBox.bottom > innerHeight) { focusTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }); }
          }
        });
      }
    });
    // swipe horizontal na tela; o gesto vertical continua rolando a galeria (touch-action: pan-y). Ampliada, o arrasto é do zoom.
    // Um dedo só: o segundo dedo de uma pinça cancela o swipe (antes ele trocava a origem e a tela mudava sem pedido).
    var sx = null, sy = null, sid = null;
    g.palco.addEventListener('pointerdown', function (e) {
      // página ampliada com pinça (html.is-pinca, siteflux.js): o arraste é para ver o resto da captura, não para trocar de tela
      if (!e.isPrimary || document.documentElement.classList.contains('is-pinca')) { sx = null; return; }
      if (e.pointerType !== 'mouse' && !g.tela.classList.contains('is-zoom')) { sx = e.clientX; sy = e.clientY; sid = e.pointerId; }
    });
    g.palco.addEventListener('pointerup', function (e) {
      if (sx === null || e.pointerId !== sid) { return; }
      var dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) { go(g.index + (dx < 0 ? 1 : -1)); }
    });
    g.palco.addEventListener('pointercancel', function () { sx = null; });
    // iOS 15 (sem overscroll-behavior): com a galeria inteira na tela, o arraste vertical rolaria a landing por trás
    if (window.CSS && CSS.supports && !CSS.supports('overscroll-behavior', 'contain')) {
      d.addEventListener('touchmove', function (e) {
        if (e.touches && e.touches.length > 1) { return; } // a pinça (zoom) continua com o navegador
        if (d.scrollHeight <= d.clientHeight + 1 && !g.tela.classList.contains('is-zoom')) { e.preventDefault(); }
      }, { passive: false });
    }
    return g;
  }

  /* "Ampliar tela" (só aparece até 899 px): a captura desktop cresce dentro da moldura e rola nos dois eixos; o slide não muda */
  function setZoom(on) {
    var g = gal;
    if (!g) { return; }
    if (g.tela.classList.contains('is-zoom') === !!on) { return; }
    g.tela.classList.toggle('is-zoom', !!on);
    g.ampliar.classList.toggle('is-on', !!on);
    g.ampliar.textContent = on ? 'Reduzir tela' : 'Ampliar tela';
    if (!on) { g.tela.scrollLeft = 0; g.tela.scrollTop = 0; }
    if (g.el.open) { ajusta(g); }
  }

  /* ------------------------------------------------------------------
     Anel cilíndrico dentro da galeria (skill galeria-anel-cilindrico). De um lado, todas as telas do projeto numa faixa 3D
     aberta, de eixo vertical, vista um pouco de cima (aparece a faixa de trás, espelhada e escurecida); do outro, a tela
     normal. Cada tela entra duas vezes para o anel fechar bem mesmo com poucas telas, e cada painel é fatiado em tiras
     para a faixa ficar lisa. O anel não tem estado próprio de "qual tela": ele segue g.index (setas, teclado, swipe na tela)
     e, quando é arrastado, pede a tela mais próxima da frente por go(). É decorativo para leitores de tela (aria-hidden):
     as setas e o teclado (← →) continuam sendo o caminho acessível. Some com movimento reduzido.
     ------------------------------------------------------------------ */
  var RING_SLICES = 8;
  function ringNorm(a) { return ((a + 180) % 360 + 360) % 360 - 180; }
  function ringStop(g) {
    var r = g.anel;
    if (r.raf) { cancelAnimationFrame(r.raf); r.raf = 0; }
    r.giro.style.willChange = '';
  }
  function ringBuild(g) {
    var r = g.anel, n = g.slides.length;
    ringStop(g);
    r.drag = null; r.box.classList.remove('is-arrastando');
    r.giro.textContent = ''; r.paineis = []; r.n = 0;
    r.measuredWidth = 0; r.measuredCount = 0;
    var off = galleryMotion.matches || n < 2 || !('transformStyle' in document.documentElement.style);
    r.box.hidden = off;
    if (off) { return; }
    var copias = n < 8 ? 2 : 1; // poucas telas: cada uma entra duas vezes e o anel fecha redondo
    r.n = n * copias;
    var fragment = document.createDocumentFragment();
    for (var k = 0; k < r.n; k++) {
      var sl = g.slides[k % n], painel = document.createElement('div');
      var src = (sl.srcset.split(',')[0] || sl.src).trim().split(' ')[0]; // o arquivo de 600 px basta para o anel
      painel.className = 'ga-painel';
      for (var t = 0; t < RING_SLICES; t++) {
        var tira = document.createElement('i');
        tira.style.backgroundImage = 'url("' + src + '")';
        painel.appendChild(tira);
      }
      fragment.appendChild(painel);
      r.paineis.push({ el: painel, a: k * 360 / r.n });
    }
    r.giro.appendChild(fragment);
    r.ang = 0;
    // As tiras são absolutas: ajusta() resolve o tamanho CSS antes da única medição.
  }
  function ringMeasure(g) {
    var r = g.anel;
    if (!r.n || r.box.hidden) { return; }
    var W = r.regua.offsetWidth || 260, gap = W * 0.07, arco = W + gap, H = W / 1.6, sw = W / RING_SLICES, porPx = 360 / (r.n * arco);
    if (r.measuredWidth === W && r.measuredCount === r.n) { return; }
    r.measuredWidth = W; r.measuredCount = r.n;
    r.R = r.n * arco / (2 * Math.PI);
    r.paineis.forEach(function (pn) {
      Array.prototype.forEach.call(pn.el.children, function (tira, t) {
        var a = pn.a + ((t + 0.5) * sw - W / 2) * porPx;
        tira.style.cssText += ';width:' + (sw + 1).toFixed(2) + 'px;height:' + H.toFixed(1) + 'px;margin-left:' + (-(sw + 1) / 2).toFixed(2) + 'px;margin-top:' + (-H / 2).toFixed(1) +
          'px;background-size:' + W.toFixed(1) + 'px ' + H.toFixed(1) + 'px;background-position:' + (-t * sw).toFixed(2) + 'px 0;transform:rotateY(' + a.toFixed(3) + 'deg) translateZ(' + r.R.toFixed(1) + 'px)';
      });
    });
    ringRender(g);
  }
  function ringRender(g) {
    var r = g.anel;
    r.giro.style.transform = 'translateZ(' + (-r.R).toFixed(1) + 'px) rotateX(-10deg) rotateY(' + r.ang.toFixed(3) + 'deg)';
  }
  function ringTo(g, i) { // gira pelo caminho mais curto até a cópia mais próxima da tela i
    var r = g.anel, n = g.slides.length;
    if (!r.n || r.box.hidden) { return; }
    ringStop(g); // retoma exatamente do último ângulo pintado, sem acumular animações
    var best = r.ang, dist = Infinity;
    for (var k = i; k < r.n; k += n) { var alvo = r.ang + ringNorm(-r.paineis[k].a - r.ang); if (Math.abs(alvo - r.ang) < dist) { dist = Math.abs(alvo - r.ang); best = alvo; } }
    if (Math.abs(best - r.ang) < .05 || galleryMotion.matches) { r.ang = best; ringRender(g); return; }
    var from = r.ang, started = performance.now(), duration = 340;
    r.giro.style.willChange = 'transform';
    r.raf = requestAnimationFrame(function passo(now) {
      r.raf = 0;
      if (!g.el.open || (r.drag && r.drag.moved)) { ringStop(g); return; }
      var progress = Math.min(1, Math.max(0, (now - started) / duration));
      var eased = 1 - Math.pow(1 - progress, 3);
      r.ang = from + (best - from) * eased;
      ringRender(g);
      if (progress < 1) { r.raf = requestAnimationFrame(passo); }
      else { ringStop(g); }
    });
  }
  function ringBind(g) {
    var r = g.anel;
    r.palco.addEventListener('pointerdown', function (e) {
      if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) { return; } // o segundo dedo não reinicia o gesto
      if (document.documentElement.classList.contains('is-pinca')) { r.drag = null; return; } // página ampliada: o arraste desloca a vista
      ringStop(g);
      r.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, from: r.ang, width: Math.max(260, r.palco.clientWidth), moved: false };
    });
    r.palco.addEventListener('pointermove', function (e) {
      var d = r.drag;
      if (!d || e.pointerId !== d.id) { return; }
      // mouse solto fora do anel: o pointerup não chegou aqui. Sem isto o anel seguia o cursor e travava as setas
      if (e.pointerType === 'mouse' && !(e.buttons & 1)) { soltar(); return; }
      var dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.moved) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) { return; }
        d.moved = true; r.box.classList.add('is-arrastando'); r.giro.style.willChange = 'transform';
        try { r.palco.setPointerCapture(d.id); } catch (err) {}
      }
      r.ang = d.from + dx * (160 / d.width); // largura medida uma vez no início do gesto
      ringRender(g);
    });
    var soltar = function (e) {
      var d = r.drag;
      if (!d || (e && e.pointerId !== d.id)) { return; }
      r.drag = null; r.box.classList.remove('is-arrastando');
      ringStop(g);
      var n = g.slides.length, best = 0, dist = Infinity;
      if (!d.moved) { // clique sem arraste: metade esquerda volta uma tela, metade direita avança
        var box = r.palco.getBoundingClientRect();
        if (e && e.type === 'pointerup') { go(g.index + (e.clientX < box.left + box.width / 2 ? -1 : 1)); }
        else { ringTo(g, g.index); }
        return;
      }
      r.paineis.forEach(function (pn, k) { var dd = Math.abs(ringNorm(pn.a + r.ang)); if (dd < dist) { dist = dd; best = k; } });
      if (best % n === g.index) { ringTo(g, g.index); } else { go(best % n); }
    };
    r.palco.addEventListener('pointerup', soltar);
    r.palco.addEventListener('pointercancel', soltar);
    r.palco.addEventListener('dragstart', function (e) { e.preventDefault(); });
    window.addEventListener('resize', function () { if (g.el.open) { g.needsReturnMeasure = true; settleGalleryFlight(g); ajusta(g); } });
    window.addEventListener('orientationchange', function () { if (g.el.open) { g.needsReturnMeasure = true; settleGalleryFlight(g); setTimeout(function () { if (g.el.open) { ajusta(g); } }, 120); } });
  }

  function loadGallerySlide(slide, size) {
    if (slide.loaded && slide.loaded.size === size) { return slide.loaded.promise; }
    var loader = new Image(), entry = { size: size };
    slide.loaded = entry;
    entry.promise = new Promise(function (resolve) {
      loader.onload = function () {
        if (loader.decode) { loader.decode().then(function () { resolve(loader); }, function () { resolve(loader.naturalWidth ? loader : null); }); }
        else { resolve(loader); }
      };
      loader.onerror = function () { if (slide.loaded === entry) { slide.loaded = null; } resolve(null); };
      loader.decoding = 'async'; loader.sizes = size; loader.srcset = slide.srcset; loader.src = slide.src;
    });
    return entry.promise;
  }

  function go(i, refresh) {
    var g = gal, n = g.slides.length;
    if (g.motion && g.motion.closing) { return; }
    g.onEntered = null;
    settleGalleryFlight(g);
    if (!n) { return; }
    i = ((i % n) + n) % n; // dá a volta nas pontas
    if (i === g.index && !refresh) { return; }
    // tela que já falhou: pula para a seguinte no sentido do pedido (senão a seta ficaria presa nela)
    var sentido = g.index < 0 ? 1 : (((i - g.index) % n) + n) % n <= n / 2 ? 1 : -1, tentativas = 0;
    while (g.slides[i].erro && tentativas < n) { i = ((i + sentido) % n + n) % n; tentativas++; }
    if (tentativas >= n || (i === g.index && !refresh)) { return; }
    g.index = i; // o pedido; g.shown é o que está na tela
    ringTo(g, i); // o anel gira na hora para a tela pedida
    var slide = g.slides[i], token = ++g.token, size = Math.ceil(g.tela.clientWidth) + 'px';
    loadGallerySlide(slide, size).then(function (loader) {
      if (token !== g.token || !g.el.open) { return; }
      if (loader) {
        if (g.shown === i && g.layers[g.front].currentSrc === (loader.currentSrc || loader.src)) {
          if (n > 1) { loadGallerySlide(g.slides[(i + 1) % n], size); }
          return;
        }
        setZoom(false);
        var back = g.layers[1 - g.front];
        back.removeAttribute('srcset'); back.removeAttribute('sizes'); back.src = loader.currentSrc || loader.src; back.alt = slide.alt;
        g.layers[g.front].classList.remove('is-on'); g.layers[g.front].alt = '';
        back.classList.add('is-on');
        g.front = 1 - g.front;
        // só agora a legenda passa a falar desta tela
        g.shown = i; g.aviso.hidden = true;
        g.posicao.textContent = 'Tela ' + (i + 1) + ' de ' + n + ': ';
        g.legenda.textContent = slide.label;
        g.pos.textContent = (i + 1) + ' de ' + n + (n === 1 ? ' tela' : ' telas'); // só o que está de fato na tela (g.shown), nunca "0 de N"
        // Uma vizinha decodificada, sem novos loaders a cada volta do anel.
        if (n > 1) { loadGallerySlide(g.slides[(i + 1) % n], size); }
      } else {
        slide.erro = true;
        if (g.shown < 0) { g.aviso.hidden = false; g.legenda.textContent = 'Tela indisponível'; }
        g.index = g.shown;
        if (g.shown >= 0) { ringTo(g, g.shown); }
      }
    });
  }

  // nome oficial do projeto (o h3 pode conter o botão "Abrir galeria de …", cujo prefixo é só para leitores de tela)
  function nomeDoProjeto(li) {
    var h3 = li.querySelector('h3');
    return h3 ? (h3.getAttribute('data-nome') || h3.textContent.replace(/\s+/g, ' ').trim()) : '';
  }

  function openGallery(li, opener) {
    if (!gal) { gal = buildGallery(); }
    var g = gal, cs = getComputedStyle(li);
    var palette = ['bg', 'soft', 'fg', 'mut', 'acc', 'line'].map(function (k) { return { key: k, value: cs.getPropertyValue('--p-' + k).trim() }; });
    // estado lógico, não g.el.open: numa reabertura antes do evento close, a cor do projeto anterior ainda está no html
    if (!document.documentElement.classList.contains('galeria-aberta')) { g.rootBackground = document.documentElement.style.backgroundColor; }
    clearGalleryFlight(g);
    g.needsReturnMeasure = false;
    var cover = visibleCover(li);
    var source = galleryMotion.matches ? null : coverBounds(li.querySelector('.pasta-capa'));
    g.sourceElement = li.querySelector('.pasta-capa');
    palette.forEach(function (color) {
      if (color.value) { g.el.style.setProperty('--g-' + color.key, color.value); } else { g.el.style.removeProperty('--g-' + color.key); }
    });
    g.titulo.textContent = nomeDoProjeto(li);
    g.tipo.textContent = li.querySelector('.pasta-rotulo').textContent;
    var desc = li.querySelector('.pasta-descricao');
    g.desc.textContent = desc ? desc.textContent : '';
    g.slides = li._gallerySlides || (li._gallerySlides = Array.prototype.map.call(li.querySelectorAll('.pasta-previa'), function (fig) {
      var im = fig.querySelector('img'), cap = fig.querySelector('figcaption');
      return { src: im.getAttribute('src'), srcset: im.getAttribute('srcset') || '', alt: im.getAttribute('alt') || '', label: cap ? cap.textContent : '' };
    }));
    g.slides.forEach(function (slide) { slide.erro = false; });
    Array.prototype.forEach.call(g.layers, function (layer) { layer.className = ''; layer.removeAttribute('srcset'); layer.removeAttribute('src'); layer.alt = ''; });
    g.index = -1; g.shown = -1; g.front = 0; g.token++; g.opener = opener || null;
    g.aviso.hidden = true; g.legenda.textContent = ''; g.posicao.textContent = ''; g.pos.textContent = ''; setZoom(false);
    var initial = 0;
    if (cover) {
      g.slides.forEach(function (slide, i) { if (slide.src === cover.getAttribute('src')) { initial = i; } });
      // A imagem da capa já carregou. Ela sustenta a abertura enquanto a resolução da galeria decodifica.
      var first = g.slides[initial], layer = g.layers[0];
      layer.src = cover.currentSrc || cover.src; layer.alt = first.alt; layer.className = 'is-on';
      g.shown = initial;
      g.legenda.textContent = first.label; g.posicao.textContent = 'Tela ' + (initial + 1) + ' de ' + g.slides.length + ': ';
      g.pos.textContent = (initial + 1) + ' de ' + g.slides.length + (g.slides.length === 1 ? ' tela' : ' telas');
    }
    if (window.sfLockWidth) { window.sfLockWidth(true); } // Safari sem scrollbar-gutter: a página não alarga ao travar
    document.documentElement.classList.add('galeria-aberta');
    document.documentElement.style.backgroundColor = palette[0].value || '#063326'; // também preenche o gutter reservado
    var staged = !galleryMotion.matches && !!g.moldura.animate;
    if (staged) { g.el.classList.add('is-preparing'); }
    if (!g.el.open) { g.el.showModal(); }
    g.el.scrollTop = 0;
    g.index = initial;
    // A capa já decodificada sustenta o morph; alta resolução e prefetch começam depois.
    g.onEntered = function () { go(initial, true); };
    g.prepare = function (immediate) {
      ringBuild(g); // geometria só é medida após o layout final de ajusta()
      ajusta(g);
      if (g.anel.n) { g.anel.ang = -g.anel.paineis[initial].a; ringRender(g); }
      if (immediate || !flyGallery(g, source, false)) { var entered = g.onEntered; g.onEntered = null; if (entered) { entered(); } }
      if (document.activeElement === g.el || !g.el.contains(document.activeElement)) { g.el.querySelector('.galeria-fechar').focus({ preventScroll: true }); }
    };
    if (staged) {
      // A ativação modal e a geometria não disputam o mesmo frame. Sem pré-abertura oculta.
      g.prepareFrame = requestAnimationFrame(function () {
        g.prepareFrame = requestAnimationFrame(function () { finishGalleryPreparation(g, false); });
      });
    } else { finishGalleryPreparation(g, true); }
  }

  /* 2.30: dimensiona a galeria pela LARGURA E ALTURA disponíveis. A moldura principal recebe a maior largura que cabe
     (proporção 1200:750) depois de descontar topo, nome, legenda, anel + setas, contador e descrição; se não couber com o
     anel normal, o anel encolhe (.is-anel-compacto); se ainda não couber, a descrição sai (.is-sem-desc); abaixo de 260 px
     de tela o diálogo rola (limite registrado). Em paisagem curta (≤ 560 px de altura, ≥ 560 de largura, deitado) a tela
     fica à esquerda e nome, anel, contador e descrição numa coluna à direita (.is-paisagem). Só escreve larguras: sem ciclo.
     2.36: o limite de largura caiu de 700 para 560 px: iPhone SE/8 (667×375) e Androids de 640×360 deitados usavam o
     layout empilhado, com a tela presa em 260 px e setas e anel abaixo da dobra. */
  var paisagem = window.matchMedia('(max-height: 560px) and (min-width: 560px) and (orientation: landscape)');
  function ajusta(g) {
    var d = g.el;
    if (!d.open) { return; }
    var lado = paisagem.matches;
    d.classList.toggle('is-paisagem', lado);
    d.classList.remove('is-anel-compacto'); d.classList.remove('is-sem-desc');
    var alto = function (el) { if (!el || el.hidden) { return 0; } var cs = getComputedStyle(el); return el.offsetHeight + (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0); };
    var cs = getComputedStyle(g.dentro);
    var H = d.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
    var W = g.dentro.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    var barra = (g.moldura.firstElementChild && g.moldura.firstElementChild.offsetHeight) || 28; // 28 px no desktop, 22 até 899 px
    var legenda = alto(g.conta) + 10, colW = lado ? Math.floor(W * 0.6) : W;
    var largura = function () {
      var outros = lado ? alto(g.topo) : alto(g.topo) + alto(g.titulo) + alto(g.nav) + alto(g.pos) + alto(g.desc) + 4;
      var altura = H - outros - barra - legenda;
      return Math.min(colW, 960, Math.max(0, altura) * 1.6);
    };
    var w = largura();
    // a tela principal manda: se com o anel normal ela ficar pequena (menos de 55 % da largura ou de 760 px), o anel encolhe
    if (w < Math.min(760, colW * 0.55) && !g.anel.box.hidden) { d.classList.add('is-anel-compacto'); w = largura(); }
    // sem descrição só quando falta ALTURA: abaixo de 340 px de janela a largura nunca chega a 300 e a regra antiga sempre disparava
    if (w < Math.min(300, colW) - 1 && g.desc.textContent) { d.classList.add('is-sem-desc'); w = largura(); }
    if (lado) {
      // paisagem: a coluna da direita (nome, anel, contador, descrição) também precisa caber na altura
      var coluna = function () { return alto(g.titulo) + alto(g.nav) + alto(g.pos) + alto(g.desc); };
      if (coluna() > H - alto(g.topo) && !d.classList.contains('is-anel-compacto') && !g.anel.box.hidden) { d.classList.add('is-anel-compacto'); }
      if (coluna() > H - alto(g.topo) && g.desc.textContent) { d.classList.add('is-sem-desc'); }
      w = largura();
    }
    w = Math.max(Math.min(260, colW), w);
    g.palco.style.width = Math.round(w) + 'px';
    d.style.setProperty('--tela-w', Math.round(w) + 'px');
    ringMeasure(g);
  }

  function closeGallery() {
    var g = gal;
    if (!g || !g.el.open) { return; }
    if (g.motion && g.motion.closing) { return; }
    g.onEntered = null; g.token++;
    if (g.prepare) { cancelGalleryPreparation(g); g.el.close(); return; }
    var target = galleryMotion.matches || g.tela.classList.contains('is-zoom') ? null : coverBounds(g.sourceElement);
    ringStop(g);
    // A última tela converge para a capa já carregada, dentro da mesma moldura.
    var cover = target && visibleCover(g.sourceElement.closest('.pasta')); // target já é nulo com a tela ampliada
    if (cover) {
      var back = g.layers[1 - g.front];
      back.removeAttribute('srcset'); back.src = cover.currentSrc || cover.src; back.alt = '';
      g.layers[g.front].classList.remove('is-on'); back.classList.add('is-on'); g.front = 1 - g.front;
    }
    if (!flyGallery(g, target, true)) { g.el.close(); }
  }

  function galleryPreferenceChanged() {
    if (!gal) { return; }
    settleGalleryFlight(gal);
    ringStop(gal);
    if (gal.el.open) {
      ringBuild(gal);
      ajusta(gal);
      if (gal.anel.n && gal.shown >= 0) { gal.anel.ang = -gal.anel.paineis[gal.shown].a; ringRender(gal); }
    }
  }
  if (galleryMotion.addEventListener) { galleryMotion.addEventListener('change', galleryPreferenceChanged); }
  else if (galleryMotion.addListener) { galleryMotion.addListener(galleryPreferenceChanged); }
  window.addEventListener('pagehide', function () { if (gal) { gal.onEntered = null; clearGalleryFlight(gal); ringStop(gal); if (gal.el.open) { gal.el.close(); } } });

  var canDialog = typeof window.HTMLDialogElement === 'function' && typeof window.HTMLDialogElement.prototype.showModal === 'function';
  if (canDialog) { document.documentElement.classList.add('tem-dialog'); }
  // a ação vai numa descrição única: dentro do botão ela virava o nome do título ("Abrir galeria de …" na lista de títulos)
  var acaoGaleria = null;
  if (canDialog && document.querySelector('.pasta-titulo h3')) {
    acaoGaleria = el('span', null, 'Abre a galeria de telas do projeto'); // oculto, mas vale como descrição (aria-describedby)
    acaoGaleria.id = 'pasta-abrir-acao'; acaoGaleria.hidden = true;
    document.body.appendChild(acaoGaleria);
  }
  Array.prototype.forEach.call(document.querySelectorAll('.pasta'), function (li) {
    var summary = li.querySelector('.pasta-detalhes summary');
    if (!canDialog || !summary || !li.querySelector('.pasta-previa')) { return; } // sem <dialog>: fica o <details> nativo
    summary.setAttribute('aria-haspopup', 'dialog');
    summary.addEventListener('click', function (e) { e.preventDefault(); openGallery(li, summary); });
    // 2.29: no card só aparece o nome do projeto, e o nome é o acionador (botão real: Enter/Espaço, foco visível,
    // aria-haspopup="dialog"). O <details> continua no HTML como fonte das telas e como fallback sem JS.
    var h3 = li.querySelector('.pasta-titulo h3'), abrir = null;
    if (h3) {
      abrir = document.createElement('button');
      abrir.type = 'button'; abrir.className = 'pasta-abrir';
      abrir.setAttribute('aria-haspopup', 'dialog');
      if (acaoGaleria) { abrir.setAttribute('aria-describedby', acaoGaleria.id); }
      var nome = h3.textContent.replace(/\s+/g, ' ').trim();
      h3.setAttribute('data-nome', nome);
      abrir.appendChild(document.createTextNode(nome));
      h3.textContent = ''; h3.appendChild(abrir);
      abrir.addEventListener('click', function () { openGallery(li, abrir); });
    }
    var pilha = li.querySelector('.pasta-pilha'); // clique/toque na capa em si: atalho de ponteiro para a mesma ação
    if (pilha) { pilha.addEventListener('click', function () { openGallery(li, abrir || summary); }); }
  });

  /* ------------------------------------------------------------------
     Projetos em carrossel de capas: a capa do projeto da vez grande no centro, as vizinhas menores, mais baixas, levemente
     giradas e escurecidas. Um índice só (atual) governa as posições; setas, teclado (← →), clique numa vizinha e arraste
     mexem nele. O anel dá a volta: cada item fica no deslocamento mais curto até o centro, e quem precisa atravessar o
     palco por trás entra um passo além do destino, fora da vista, e desliza até ele. As capas fora do centro ficam inertes
     (o foco não entra nelas); um arraste nunca vira clique.
     2.36: o foco do teclado acompanha a capa do centro; o avanço automático para de vez na primeira navegação manual e
     pausa com o foco em qualquer ponto do carrossel; arraste com mouse solto fora da faixa não fica preso; as capas carregam
     quando a seção chega à tela (antes, as que entravam pela primeira vez podiam deslizar vazias).
     ------------------------------------------------------------------ */
  (function sliderPastas() {
    var lista = document.querySelector('.pastas');
    var itens = lista ? Array.prototype.slice.call(lista.querySelectorAll('.pasta')) : [];
    if (itens.length < 3) { return; }
    var janela = document.createElement('div');
    janela.className = 'pastas-janela';
    lista.parentNode.insertBefore(janela, lista);
    janela.appendChild(lista);
    lista.classList.add('is-slider');
    // a entrada por seção esconderia as capas que começam fora da janela (o observador nunca as "vê")
    itens.forEach(function (li) { li.removeAttribute('data-reveal'); li.classList.remove('reveal-pending'); });
    // 2.29 (pedido do Walter): sem contador nem bolinhas; só as duas setas, uma de cada lado da capa do centro (sobre a janela),
    // e o anúncio discreto para leitor de tela
    var nav = document.createElement('div');
    nav.className = 'pastas-nav';
    nav.innerHTML = '<button class="pastas-seta" type="button" data-dir="-1" aria-label="Projeto anterior">' + ICON_PREV + '</button>' +
      '<button class="pastas-seta" type="button" data-dir="1" aria-label="Próximo projeto">' + ICON_NEXT + '</button>' +
      '<span class="sr-only" aria-live="polite"></span>';
    janela.appendChild(nav);
    var status = nav.querySelector('[aria-live]');
    var n = itens.length, atual = 0, drag = null, engolir = false, antes = [], parado = false;
    function desloc(i, pos) { var o = (((i - pos) % n) + n) % n; if (o > n / 2) { o -= n; } return o; }
    function estilo(li, o) {
      var a = Math.abs(o);
      li.style.transform = 'translate3d(' + (o * 106).toFixed(2) + '%,' + (Math.min(a, 1.6) * 8).toFixed(2) + '%,0) rotate(' + (Math.max(-1.6, Math.min(1.6, o)) * 3).toFixed(2) + 'deg) scale(' + (1 - Math.min(a, 1.6) * 0.1).toFixed(3) + ')';
      li.style.filter = a < 0.005 ? '' : 'brightness(' + (1 - Math.min(a, 1) * 0.42).toFixed(2) + ')'; // a do centro sem filtro (sem superfície extra)
      li.style.opacity = a > 1.6 ? '0' : '1';
      li.style.zIndex = String(10 - Math.round(a * 2));
    }
    function coloca(pos) { // pos pode ser fracionário durante o arraste
      itens.forEach(function (li, i) {
        var o = desloc(i, pos);
        // empate na posição oposta (número par de projetos): continua do lado de onde veio, e a travessia fica para quando estiver invisível
        if (antes[i] !== undefined && antes[i] < 0 && Math.abs(o - n / 2) < 1e-9) { o = -o; }
        if (antes[i] !== undefined && Math.abs(o - antes[i]) > 1.5) {
          // atravessa o palco por trás: aparece sem transição um passo além do destino, fora da vista, e desliza até ele
          li.classList.add('is-salto');
          estilo(li, o + (o > antes[i] ? 1 : -1));
          void li.offsetWidth;
          li.classList.remove('is-salto');
        }
        estilo(li, o);
        antes[i] = o;
      });
    }
    function mede() { // o trilho é absoluto: a altura vem da capa mais alta (com o texto)
      var h = 0;
      itens.forEach(function (li) { h = Math.max(h, li.offsetHeight); });
      lista.style.height = Math.ceil(h * 1.04) + 'px';
    }
    // a 2ª tela da capa só serve ao deslize do hover (ponteiro fino, sem movimento reduzido), e só a capa do centro desliza:
    // adianta-se a dela quando a seção já está perto. As outras ficam fora do layout (CSS) e, lazy, não são baixadas.
    var deslizaCapa = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    function adiantaSegunda() {
      if (!carregou || !deslizaCapa.matches) { return; }
      var seg = itens[atual].querySelectorAll('.pasta-tira img')[1];
      if (seg) { seg.loading = 'eager'; }
    }
    function pinta() {
      coloca(atual);
      itens.forEach(function (li, i) {
        li.classList.toggle('is-atual', i === atual);
        if (i === atual) { li.removeAttribute('inert'); } else { li.setAttribute('inert', ''); }
      });
      adiantaSegunda();
    }
    // manual = navegação pedida pelo visitante: anuncia, leva o foco junto e desliga o avanço automático de vez
    function ir(i, manual) {
      var levar = manual && itens[atual].contains(document.activeElement); // o item que sai vira inert: o foco iria para o body
      if (manual) { parado = true; }
      atual = ((i % n) + n) % n;
      pinta();
      if (levar) { var b = itens[atual].querySelector('.pasta-abrir'); if (b) { b.focus({ preventScroll: true }); } }
      else if (manual) { var nome = nomeDoProjeto(itens[atual]); status.textContent = 'Projeto ' + (atual + 1) + ' de ' + n + (nome ? ': ' + nome : ''); }
    }
    Array.prototype.forEach.call(nav.querySelectorAll('.pastas-seta'), function (b) {
      b.addEventListener('click', function () { ir(atual + Number(b.getAttribute('data-dir')), true); });
    });
    janela.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) { return; }
      if (e.key === 'ArrowRight') { ir(atual + 1, true); e.preventDefault(); } else if (e.key === 'ArrowLeft') { ir(atual - 1, true); e.preventDefault(); }
    });
    janela.addEventListener('pointerdown', function (e) {
      if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) { return; } // o segundo dedo (pinça) não reinicia o gesto
      if (document.documentElement.classList.contains('is-pinca')) { drag = null; return; } // página ampliada: o arraste desloca a vista
      if (e.target.closest && e.target.closest('.pastas-nav')) { drag = null; return; } // as setas ficam sobre a janela: o clique nelas não é arraste nem "lado clicado"
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, on: false, dx: 0 };
    });
    janela.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) { return; }
      if (e.pointerType === 'mouse' && !(e.buttons & 1)) { solta(null); return; } // botão solto fora da faixa: o gesto acabou
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.on) {
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) { return; }
        drag.on = true; lista.classList.add('is-dragging'); janela.classList.add('is-dragging');
        // mouse: captura só depois de 10 px (um clique simples continua indo ao botão ou à capa)
        if (e.pointerType === 'mouse') { try { janela.setPointerCapture(e.pointerId); } catch (err) { /* o pointerup no documento encerra */ } }
      }
      drag.dx = dx;
      coloca(atual - dx / Math.max(1, itens[0].offsetWidth * 1.06));
    });
    var solta = function (e) {
      if (!drag || (e && e.pointerId !== drag.id)) { return; }
      var d = drag; drag = null;
      lista.classList.remove('is-dragging'); janela.classList.remove('is-dragging');
      if (!d.on) {
        // clique fora da capa do centro (as vizinhas são inertes, então o alvo é a janela): vai para o lado clicado
        if (e && e.type === 'pointerup' && !(e.target.closest && e.target.closest('.pasta.is-atual'))) {
          var box = janela.getBoundingClientRect(), meio = box.left + box.width / 2, metade = itens[0].offsetWidth / 2;
          if (e.clientX < meio - metade) { ir(atual - 1, true); } else if (e.clientX > meio + metade) { ir(atual + 1, true); }
        }
        return;
      }
      engolir = true; setTimeout(function () { engolir = false; }, 60);
      var passos = Math.round(-d.dx / Math.max(1, itens[0].offsetWidth * 1.06));
      if (!passos && Math.abs(d.dx) > Math.min(120, janela.clientWidth * 0.12)) { passos = d.dx < 0 ? 1 : -1; }
      parado = true; // arrastar é assumir o controle, mesmo sem trocar de projeto
      if (passos) { ir(atual + passos, true); } else { pinta(); }
    };
    janela.addEventListener('pointerup', solta);
    janela.addEventListener('pointercancel', solta);
    // soltou fora da faixa (sem captura): qualquer fim do mesmo ponteiro fora dela encerra o gesto, sem virar "lado clicado"
    ['pointerup', 'pointercancel'].forEach(function (tipo) {
      document.addEventListener(tipo, function (e) { if (drag && e.pointerId === drag.id && !janela.contains(e.target)) { solta(null); } }, true);
    });
    janela.addEventListener('click', function (e) { if (engolir) { e.stopPropagation(); e.preventDefault(); } }, true);
    janela.addEventListener('dragstart', function (e) { e.preventDefault(); });
    window.addEventListener('resize', mede);
    window.addEventListener('load', mede);
    if ('ResizeObserver' in window) { new ResizeObserver(mede).observe(itens[0]); }
    pinta(); mede();
    // avanço automático: um projeto a cada 5 s. Para com o mouse em cima, com o foco em qualquer ponto do carrossel (nome,
    // setas, o foco devolvido pela galeria; a seção focada por um link do menu não conta), durante o
    // arraste, fora da tela, com a aba oculta, com a galeria aberta e com movimento reduzido. Depois da primeira navegação
    // manual (setas, teclado, arraste, clique numa vizinha) não volta mais: o visitante assumiu o controle.
    var AUTO_MS = 5000, timer = 0, sobre = false, naTela = !('IntersectionObserver' in window), carregou = false;
    // lido na hora (não por evento): resiste ao blur da janela do navegador, que dispararia focusout sem destino
    function podeAuto() { return !parado && !galleryMotion.matches && !sobre && !janela.contains(document.activeElement) && !drag && naTela && !document.hidden && !document.documentElement.classList.contains('galeria-aberta'); }
    function arma() {
      clearTimeout(timer);
      if (parado) { return; }
      timer = setTimeout(function () { if (podeAuto()) { ir(atual + 1, false); } arma(); }, AUTO_MS);
    }
    var secao = janela.parentNode;
    janela.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { sobre = true; } }); // só sobre as capas
    janela.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { sobre = false; arma(); } });
    secao.addEventListener('focusout', function (e) { if (!secao.contains(e.relatedTarget)) { arma(); } }); // o foco saiu: a contagem recomeça
    secao.addEventListener('click', arma);
    janela.addEventListener('pointerup', arma);
    // as capas chegam juntas quando a seção entra na tela: as que estão fora da janela não esperam o lazy do navegador
    function carregaCapas() {
      if (carregou) { return; }
      carregou = true;
      itens.forEach(function (li) { var im = li.querySelector('.pasta-tira img'); if (im) { im.loading = 'eager'; } });
      adiantaSegunda();
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        var e = en[en.length - 1];
        if (e.isIntersecting) { carregaCapas(); }
        naTela = e.intersectionRatio >= 0.35; arma();
      }, { threshold: [0, 0.35], rootMargin: '0px' }).observe(janela);
    } else { carregaCapas(); }
    document.addEventListener('visibilitychange', arma);
    document.addEventListener('siteflux:galleryclose', arma); // cinco segundos completos depois do retorno
    arma();
  })();

  /* "5 telas" sai da contagem real das figuras de cada pasta */
  Array.prototype.forEach.call(document.querySelectorAll('.pasta'), function (li) {
    var out = li.querySelector('.pasta-telas'), n = li.querySelectorAll('.pasta-previa').length;
    if (out) { if (n) { out.textContent = n + (n === 1 ? ' tela' : ' telas'); } else { out.hidden = true; } }
  });

  /* A capa não se mexe mais sozinha (a espiada automática saiu). A 2ª tela, que aparece no deslize do hover, é adiantada pelo
     carrossel só para a capa do centro (adiantaSegunda); no toque e com movimento reduzido ela nem entra no layout. */

  /* capa/folha decorativa (alt vazio) que falha: some o ícone do navegador e fica a superfície da marca do CSS.
     As prévias dentro do <details> não entram aqui: nelas o texto alternativo deve aparecer. */
  var pastas = document.querySelector('.pastas');
  if (pastas) {
    var hideBroken = function (img) { if (img.closest && img.closest('.pasta-pilha')) { img.style.visibility = 'hidden'; } };
    pastas.addEventListener('error', function (e) { if (e.target && e.target.tagName === 'IMG') { hideBroken(e.target); } }, true);
    Array.prototype.forEach.call(pastas.querySelectorAll('.pasta-pilha img'), function (img) { if (img.complete && !img.naturalWidth) { hideBroken(img); } });
  }

  /* As letras em rolagem só existem na cortina do menu: são montadas fora da carga (tempo ocioso) ou, no máximo, quando o
     visitante chega ao botão do menu — nunca no clique, para não somar à abertura. */
  var montadas = false;
  function montaLetras() {
    if (montadas) { return; }
    montadas = true;
    Array.prototype.forEach.call(document.querySelectorAll('#siteNav a[href^="#"]:not(.btn)'), function (link) {
      try { buildRoll(link); } catch (e) { /* o link segue como texto comum */ }
    });
  }
  var menuBtn = document.getElementById('menuToggle');
  if (menuBtn) { ['pointerenter', 'pointerdown', 'focus', 'keydown', 'touchstart'].forEach(function (tipo) { menuBtn.addEventListener(tipo, montaLetras, { passive: true }); }); }
  if (window.requestIdleCallback) { requestIdleCallback(montaLetras, { timeout: 3000 }); } else { setTimeout(montaLetras, 1500); }
})();
