/* Siteflux — comportamento progressivo. Sem este arquivo a página continua
   completa: menu expandido, FAQ nativo (details) e conteúdo sempre visível. */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- Intro vetorial (1x por sessão) ----------
     O <head> marca html.intro-active só quando a abertura deve rodar. Aqui o
     overlay é montado com os paths oficiais do <symbol id="sf-logo">; qualquer
     falha libera a página na hora. Sem este arquivo, a cobertura CSS some sozinha. */
  (function intro() {
    if (!root.classList.contains('intro-active')) return;

    var overlay = null, done = false, timers = [];
    function release() { root.classList.remove('intro-active', 'intro-leaving'); }
    function cleanup() {
      timers.forEach(clearTimeout);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('visibilitychange', onHidden);
    }
    // natural: a hero espera a dissolução; pulo/falha: conteúdo aparece já
    function finish(natural) {
      if (done) return;
      done = true;
      cleanup();
      if (natural) { root.classList.add('intro-leaving'); root.classList.remove('intro-active'); }
      else release();
      if (!overlay) return;
      overlay.classList.add('is-leaving'); // continua capturando cliques até sair do DOM
      setTimeout(function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }, natural ? 480 : 320);
      if (natural) setTimeout(release, 2400);
    }
    function onKey(e) { if (e.key === 'Escape' || e.key === 'Tab') finish(false); }
    function onHidden() { if (document.hidden) finish(false); }

    try {
      sessionStorage.setItem('sf-intro', '1');
      var symbol = document.getElementById('sf-logo');
      var site = symbol.querySelector('.lg-site').children;
      var flux = symbol.querySelector('.lg-flux').children;
      var accent = symbol.querySelector('.lg-accent');
      if (site.length < 7 || flux.length < 4 || !accent) throw new Error('logo incompleto');

      var outer = function (el) { return new XMLSerializer().serializeToString(el).replace(/ xmlns="[^"]*"/g, ''); };
      var globe = site[0].getAttribute('d');
      // s · i (haste + pingo) · t · e — depois f · l · u · x
      var letters = [[site[1]], [site[2], site[3]], [site[4]], [site[5]], [flux[0]], [flux[1]], [flux[2]], [flux[3]]];
      var word = letters.map(function (parts, n) {
        return '<g class="sfi-l" style="--n:' + n + '" fill="' + (n < 4 ? '#fff' : '#ccd961') + '">' + parts.map(outer).join('') + '</g>';
      }).join('');
      var slogan = Array.prototype.slice.call(site, 6).map(outer).join('');

      overlay = document.createElement('div');
      overlay.className = 'intro';
      overlay.innerHTML =
        '<svg class="intro-logo" viewBox="-8 -8 451.28 111.54" aria-hidden="true" focusable="false">' +
          '<defs>' +
            '<clipPath id="sfi-clip"><ellipse cx="46.78" cy="36.15" rx="46.78" ry="35.15"/></clipPath>' +
            '<mask id="sfi-mask" maskUnits="userSpaceOnUse" x="-4" y="-4" width="102" height="80"><path fill="#fff" d="' + globe + '"/></mask>' +
          '</defs>' +
          '<g class="sfi-bands" clip-path="url(#sfi-clip)">' +
            '<rect class="sfi-band--1" x="-34" y="-2" width="30" height="78" fill="#ccd961" opacity=".3"/>' +
            '<rect class="sfi-band--2" x="-46" y="-2" width="18" height="78" fill="#3cbcd5" opacity=".34"/>' +
          '</g>' +
          '<path class="sfi-stroke" pathLength="1" d="' + globe + '"/>' +
          '<g mask="url(#sfi-mask)">' +
            '<g class="sfi-spin">' +
              '<path fill="#ccd961" d="M46.78,36.15L126.78,36.15A80,80 0 0,1 6.78,105.43Z"/>' +
              '<path fill="#3cbcd5" d="M46.78,36.15L6.78,105.43A80,80 0 0,1 6.78,-33.13Z"/>' +
              '<path fill="#fff" d="M46.78,36.15L6.78,-33.13A80,80 0 0,1 126.78,36.15Z"/>' +
            '</g>' +
            '<rect class="sfi-settle" x="-4" y="-4" width="102" height="80" fill="#fff"/>' +
          '</g>' +
          word +
          '<g class="sfi-accent" fill="#3cbcd5">' + outer(accent).replace(/ (class|fill)="[^"]*"/g, '') + '</g>' +
          '<g class="sfi-slogan" fill="#fff">' + slogan + '</g>' +
        '</svg>';
      document.body.appendChild(overlay);

      document.addEventListener('keydown', onKey, true);
      document.addEventListener('visibilitychange', onHidden);
      // duas oportunidades de pintura antes do primeiro frame animado
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { if (!done) overlay.classList.add('is-playing'); });
      });
      timers.push(setTimeout(function () { finish(true); }, 2400));
      timers.push(setTimeout(function () { finish(false); }, 3800)); // rAF parado etc.
    } catch (err) {
      finish(false);
    }
  })();

  /* ---------- Menu em tela cheia ---------- */
  var toggle = document.getElementById('menuToggle');
  var nav = document.getElementById('siteNav');
  var toggleText = toggle ? toggle.querySelector('[data-label]') : null;
  var desktop = window.matchMedia('(min-width: 1141px)');

  function setMenu(open, restoreFocus) {
    if (!toggle || !nav) return;
    nav.classList.toggle('is-open', open);
    root.classList.toggle('menu-open', open); // cortina em tela cheia: trava o scroll e esconde botão e logo do topo
    var logoEl = document.querySelector('.header .logo'); // pulso curto da logo a cada abrir/fechar (protótipo)
    if (logoEl && !reduceMotion.matches) { logoEl.classList.remove('is-pulse'); void logoEl.offsetWidth; logoEl.classList.add('is-pulse'); }
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
    if (toggleText) toggleText.textContent = open ? 'Fechar' : 'Menu';
    if (open) {
      var first = nav.querySelector('a');
      if (first) first.focus({ preventScroll: true });
    } else if (restoreFocus) {
      toggle.focus();
    }
  }
  function menuIsOpen() { return !!toggle && toggle.getAttribute('aria-expanded') === 'true'; }

  if (toggle && nav) {
    toggle.addEventListener('click', function () { setMenu(!menuIsOpen(), false); });
    nav.addEventListener('click', function (e) {
      var a = e.target.closest('a');
      if (!a) return;
      setMenu(false, false);
      // link para uma seção: o foco vai junto (leitores de tela seguem dali; o Tab seguinte continua na seção)
      var alvo = /^#./.test(a.getAttribute('href') || '') ? document.querySelector(a.getAttribute('href')) : null;
      if (alvo) { if (!alvo.hasAttribute('tabindex')) alvo.setAttribute('tabindex', '-1'); alvo.focus({ preventScroll: true }); }
    });
    // cortina aberta = modal: o Tab circula entre o botão de fechar e os links (a logo e o CTA do topo ficam ocultos)
    document.querySelector('.header').addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !menuIsOpen()) return;
      var links = Array.prototype.filter.call(nav.querySelectorAll('a'), function (a) { return a.offsetParent !== null || a.getClientRects().length; });
      var last = links[links.length - 1];
      if (!last) return;
      if (!e.shiftKey && e.target === last) { e.preventDefault(); toggle.focus(); }
      else if (e.shiftKey && e.target === toggle) { e.preventDefault(); last.focus(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuIsOpen()) setMenu(false, true);
    });
    document.addEventListener('click', function (e) {
      if (menuIsOpen() && !e.target.closest('.header')) setMenu(false, false);
    });
    document.querySelector('.header').addEventListener('focusout', function (e) {
      if (menuIsOpen() && e.relatedTarget && !e.relatedTarget.closest('.header')) setMenu(false, false);
    });
    var onBreakpoint = function () { if (desktop.matches && menuIsOpen()) setMenu(false, false); };
    if (desktop.addEventListener) desktop.addEventListener('change', onBreakpoint);
    else if (desktop.addListener) desktop.addListener(onBreakpoint);
  }

  /* ---------- Tom do cabeçalho ---------- */
  // Lê a cor de fundo que está sob a barra e troca data-tone (claro = sem atributo | dark | blue).
  var headerEl = document.querySelector('.header');
  var headerBar = headerEl ? headerEl.querySelector('.header-bar') : null;
  if (headerBar && document.elementsFromPoint) {
    var TONES = [['dark', 4, 43, 32], ['', 255, 255, 255], ['', 239, 239, 239], ['', 204, 217, 97], ['blue', 60, 188, 213]];
    var toneQueued = false;
    var toneUnder = function () {
      var r = headerBar.getBoundingClientRect();
      var els = document.elementsFromPoint(window.innerWidth / 2, r.top + Math.min(r.height, 76) / 2);
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (headerEl.contains(el) || el.closest('.intro')) continue;
        var c = (getComputedStyle(el).backgroundColor.match(/[\d.]+/g) || []).map(Number);
        if (c.length < 3 || (c.length > 3 && c[3] < 0.5)) continue;
        var best = '', dist = Infinity;
        for (var t = 0; t < TONES.length; t++) {
          var d = Math.pow(c[0] - TONES[t][1], 2) + Math.pow(c[1] - TONES[t][2], 2) + Math.pow(c[2] - TONES[t][3], 2);
          if (d < dist) { dist = d; best = TONES[t][0]; }
        }
        return best;
      }
      return '';
    };
    var applyTone = function () {
      toneQueued = false;
      var tone = toneUnder();
      if (tone === (headerEl.getAttribute('data-tone') || '')) return;
      if (tone) headerEl.setAttribute('data-tone', tone);
      else headerEl.removeAttribute('data-tone');
      // o Chromium pode manter as --lg-* antigas dentro do <use>: refazer a instância garante as cores novas
      var use = headerEl.querySelector('.logo use');
      if (use) use.setAttribute('href', use.getAttribute('href'));
    };
    var queueTone = function () {
      if (toneQueued) return;
      toneQueued = true;
      requestAnimationFrame(applyTone);
    };
    window.addEventListener('scroll', queueTone, { passive: true });
    window.addEventListener('resize', queueTone);
    window.addEventListener('load', queueTone);
    applyTone();
  }

  /* ---------- Entradas de seção ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    var limit = window.innerHeight * 0.92;
    var pending = revealEls.filter(function (el) {
      // só esconde o que ainda está abaixo da dobra: nada visível pisca
      return el.getBoundingClientRect().top > limit;
    });
    pending.forEach(function (el) { el.classList.add('reveal-pending'); });
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add('reveal-run');
        el.classList.remove('reveal-pending');
        revealObserver.unobserve(el);
      });
    }, { rootMargin: '0px 0px -48px 0px', threshold: 0.05 });
    pending.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ---------- Hero: o símbolo se transforma num site ----------
     Os 17 contornos oficiais de <symbol id="sf-tracos"> (a elipse + 16 gomos) viram, por morph
     contínuo, a janela de um navegador e as peças de um wireframe: nenhum traço some, cada um
     encontra seu lugar. Sem biblioteca: os contornos são amostrados em pontos (getPointAtLength),
     alinhados ao alvo e interpolados; nos extremos entram os paths exatos. Uma linha nasce na
     fresta horizontal do símbolo e sobe para dividir o cabeçalho. Sem JS fica o símbolo parado. */
  (function heroMorph() {
    var art = document.querySelector('[data-morph]');
    var symbol = document.getElementById('sf-tracos');
    if (!art || !symbol || !symbol.querySelector('path')) return;
    var svg = art.querySelector('svg');
    var NS = 'http://www.w3.org/2000/svg';
    var CX = 297.9, CY = 223.7;

    function rr(x, y, w, h, r) { // retângulo de cantos redondos, sentido horário
      r = Math.min(r, w / 2, h / 2);
      return 'M' + (x + r) + ',' + y + 'H' + (x + w - r) + 'A' + r + ',' + r + ' 0 0 1 ' + (x + w) + ',' + (y + r) +
        'V' + (y + h - r) + 'A' + r + ',' + r + ' 0 0 1 ' + (x + w - r) + ',' + (y + h) +
        'H' + (x + r) + 'A' + r + ',' + r + ' 0 0 1 ' + x + ',' + (y + h - r) +
        'V' + (y + r) + 'A' + r + ',' + r + ' 0 0 1 ' + (x + r) + ',' + y + 'Z';
    }
    // índice do contorno no símbolo → peça do site (x, y, largura, altura, raio), no espaço 596 × 447
    var TARGETS = {
      0: [30, 40, 536, 367, 24],     // elipse → janela
      14: [54, 63, 70, 14, 7],       // marca no menu
      3: [344, 65, 42, 10, 5],       // links do menu
      6: [398, 65, 42, 10, 5],
      1: [462, 57, 82, 26, 13],      // chamada do menu
      8: [54, 128, 214, 18, 9],      // título, linha 1
      7: [54, 156, 160, 18, 9],      // título, linha 2
      2: [54, 192, 196, 9, 4.5],     // parágrafo
      15: [54, 216, 86, 28, 14],     // botão
      13: [330, 124, 214, 122, 14],  // imagem
      9: [54, 270, 152, 114, 14],    // cartões
      4: [222, 270, 152, 114, 14],
      12: [390, 270, 154, 114, 14],
      10: [70, 352, 84, 9, 4.5],     // linha dentro de cada cartão
      5: [238, 352, 84, 9, 4.5],
      11: [406, 352, 84, 9, 4.5],
      16: [406, 334, 52, 9, 4.5]
    };
    // ordem de saída dos gomos: das pontas para o centro (os de fora saem antes de a janela fechar sobre eles)
    var ORDER = [14, 15, 1, 16, 8, 9, 13, 12, 7, 10, 6, 11, 2, 4, 3, 5];

    var subs = symbol.querySelector('path').getAttribute('d').split(/(?=M)/);
    if (subs.length !== 17) return;

    var group = document.createElementNS(NS, 'g');
    group.setAttribute('class', 'morph');
    svg.appendChild(group);

    function sample(d, n) {
      var p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      group.appendChild(p);
      var len = p.getTotalLength(), pts = [];
      for (var i = 0; i < n; i++) { var q = p.getPointAtLength(len * i / n); pts.push([q.x, q.y]); }
      group.removeChild(p);
      return pts;
    }
    function area(pts) { var a = 0; for (var i = 0, n = pts.length; i < n; i++) { var j = (i + 1) % n; a += pts[i][0] * pts[j][1] - pts[j][0] * pts[i][1]; } return a; }
    function center(pts) { var x = 0, y = 0; pts.forEach(function (q) { x += q[0]; y += q[1]; }); return [x / pts.length, y / pts.length]; }
    function align(from, to) { // mesmo sentido e o giro que menos torce o contorno (formas comparadas pelo centro)
      if (area(from) * area(to) < 0) from.reverse();
      var n = from.length, cf = center(from), ct = center(to), best = 0, bestD = Infinity;
      for (var k = 0; k < n; k++) {
        var d = 0;
        for (var i = 0; i < n; i += 2) {
          var a = from[(i + k) % n], b = to[i];
          d += Math.pow(a[0] - cf[0] - b[0] + ct[0], 2) + Math.pow(a[1] - cf[1] - b[1] + ct[1], 2);
        }
        if (d < bestD) { bestD = d; best = k; }
      }
      return from.slice(best).concat(from.slice(0, best));
    }

    var shapes = [];
    try {
      subs.forEach(function (d, i) {
        var t = TARGETS[i];
        if (!t) throw new Error('alvo');
        var n = i === 0 ? 180 : 96, td = rr(t[0], t[1], t[2], t[3], t[4]);
        var to = sample(td, n), from = align(sample(d, n), to);
        var el = document.createElementNS(NS, 'path');
        el.setAttribute('d', d);
        group.appendChild(el);
        var rank = ORDER.indexOf(i);
        shapes.push({ el: el, from: from, to: to, d0: d, d1: td, start: i === 0 ? 0.4 : 0.55 + rank * 0.035, dur: i === 0 ? 1.1 : 0.9, last: -1 });
      });
    } catch (err) { if (group.parentNode) svg.removeChild(group); return; }
    var bar = document.createElementNS(NS, 'path');
    bar.setAttribute('class', 'morph-bar');
    group.appendChild(bar);
    art.classList.add('is-morph');

    var T = 2.6;
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; } // ≈ cubic-bezier(.65, 0, .35, 1)
    function span(time, a, b) { return Math.min(1, Math.max(0, (time - a) / (b - a))); }
    function draw(time) {
      shapes.forEach(function (s) {
        var t = ease(span(time, s.start, s.start + s.dur));
        if (t === s.last) return;
        s.last = t;
        if (t <= 0) { s.el.setAttribute('d', s.d0); return; }
        if (t >= 1) { s.el.setAttribute('d', s.d1); return; }
        // pontos interpolados, ligados por curvas pelos pontos médios: o contorno nunca fica facetado
        var n = s.from.length, px = [], py = [], out = '';
        for (var i = 0; i < n; i++) { px.push(s.from[i][0] + (s.to[i][0] - s.from[i][0]) * t); py.push(s.from[i][1] + (s.to[i][1] - s.from[i][1]) * t); }
        for (var k = 0; k < n; k++) {
          var j = (k + 1) % n, mx = ((px[k] + px[j]) / 2).toFixed(1), my = ((py[k] + py[j]) / 2).toFixed(1);
          out += k ? 'Q' + px[k].toFixed(1) + ',' + py[k].toFixed(1) + ' ' + mx + ',' + my : 'M' + mx + ',' + my;
        }
        out += 'Q' + px[0].toFixed(1) + ',' + py[0].toFixed(1) + ' ' + ((px[0] + px[1]) / 2).toFixed(1) + ',' + ((py[0] + py[1]) / 2).toFixed(1);
        s.el.setAttribute('d', out + 'Z');
      });
      // a linha nasce na fresta central do símbolo e sobe até dividir o cabeçalho do conteúdo
      var b = ease(span(time, 0.7, 1.6));
      var y = 216.4 + (100 - 216.4) * b, x1 = 8 + (30 - 8) * b, x2 = 588 + (566 - 588) * b;
      bar.setAttribute('d', 'M' + x1.toFixed(1) + ',' + y.toFixed(1) + 'H' + x2.toFixed(1));
      bar.style.opacity = Math.min(1, b * 3).toFixed(3);
      // ganha vida (0,95 → 1) e, no fim, um micro overshoot (1,015 → 1)
      var enter = ease(span(time, 0, 0.4)), over = span(time, 2.0, T);
      var sc = 0.95 + 0.05 * enter + 0.015 * Math.sin(Math.PI * over);
      group.setAttribute('transform', 'translate(' + CX + ' ' + CY + ') scale(' + sc.toFixed(4) + ') translate(' + (-CX) + ' ' + (-CY) + ')');
      group.style.opacity = (0.35 + 0.65 * enter).toFixed(3);
      art.classList.toggle('is-site', time >= 2.1);
    }

    // linha do tempo: monta (2,6 s) → segura → desmonta (mais rápido) → segura → repete
    var HOLD_SITE = 7, BACK = 1.7, HOLD_ICON = 1.6, CYCLE = T + HOLD_SITE + BACK + HOLD_ICON;
    var clock = 0, last = 0, raf = 0, visible = !('IntersectionObserver' in window), started = false;
    function timeAt(c) {
      c = c % CYCLE;
      if (c < T) return c;
      if (c < T + HOLD_SITE) return T;
      if (c < T + HOLD_SITE + BACK) return T * (1 - (c - T - HOLD_SITE) / BACK);
      return 0;
    }
    function canRun() { return started && visible && !document.hidden && !reduceMotion.matches; }
    function tick(now) {
      raf = 0;
      if (!canRun()) return;
      clock += Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      draw(timeAt(clock));
      raf = requestAnimationFrame(tick);
    }
    function wake() {
      if (reduceMotion.matches) { draw(T); return; } // movimento reduzido: o site já montado, parado
      if (!raf && canRun()) { last = 0; raf = requestAnimationFrame(tick); }
    }
    function begin() { // espera a intro sair para o primeiro quadro não acontecer escondido
      if (started) return;
      if (root.classList.contains('intro-active')) { setTimeout(begin, 200); return; }
      started = true;
      wake();
    }

    draw(0);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; wake(); }).observe(art);
    }
    document.addEventListener('visibilitychange', wake);
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', wake);
    else if (reduceMotion.addListener) reduceMotion.addListener(wake);
    setTimeout(begin, 500);
  })();

  /* ---------- Leque das peças da campanha ----------
     Base: a galeria da seção 2 de siteflux-prototipo.html no estado de carrossel aberto
     (mesmas fórmulas de arco, escala, giro, balanço e deslize), sem o scroll preso.
     Um único estado: pos (centro contínuo, em peças), que só o deslize automático move; o mouse
     sobre o leque pausa. Sem controles manuais. A lista HTML é a única fonte das peças. */
  (function fan() {
    var box = document.querySelector('[data-carousel]');
    if (!box) return;
    var viewport = box.querySelector('.carousel-viewport');
    var stage = box.querySelector('.cards');
    var cards = Array.prototype.slice.call(stage.children);
    var n = cards.length;
    if (!viewport || n < 3) return;

    var STEP_DEG = 24, SHRINK = 0.7, DRIFT = 0.13; // DRIFT: peças por segundo (≈ 0,0022 por quadro no protótipo)
    var REST_MS = 4000; // depois de uma interação, tempo de leitura antes de o deslize voltar
    var still = reduceMotion.matches;
    var pos = 0, phase = 0, last = 0, raf = 0;
    var hover = false, focus = false, inView = !('IntersectionObserver' in window);
    var boxW = 0, stageW = 0, stageH = 0, radiusX = 0, radiusY = 0;
    // 2.30 (pedido do Walter): arraste (mouse/toque), clique/toque para centralizar e assentamento. Um único estado contínuo
    // `pos`; `alvo` é para onde ele desliza (snap/centralizar); `drag` é o gesto em curso; `descanso` segura o deslize automático.
    var drag = null, alvo = null, descanso = 0, engolir = false;

    function mod(v) { return ((v % n) + n) % n; }
    function maisCurto(i) { var d = mod(i - pos); if (d > n / 2) d -= n; return pos + d; } // caminho circular mais curto até a peça i
    function pxPorPeca() { return Math.max(40, Math.sin(STEP_DEG * Math.PI / 180) * radiusX); } // deslocamento horizontal de uma peça vizinha

    function measure() {
      boxW = box.clientWidth; stageW = stage.offsetWidth; stageH = stage.offsetHeight;
      if (!stageW) return;
      radiusX = Math.max(boxW * 0.6, stageW * 1.15); // telas estreitas: as vizinhas não somem atrás da central
      radiusY = Math.min(320, stageH * 0.5);
      // a peça central ocupa o miolo do palco (escala SHRINK); as laterais descem pelo arco
      var top = stageH * (1 - SHRINK) / 2;
      var drop = radiusY * (1 - Math.cos(3 * STEP_DEG * Math.PI / 180));
      stage.style.marginTop = (24 - top).toFixed(1) + 'px';
      viewport.style.height = (24 + stageH * SHRINK + Math.max(drop * 0.62, 40) + 28).toFixed(1) + 'px';
      render();
    }

    function render() {
      if (!stageW) return;
      var ambient = !still; // no hover o balanço congela onde está (phase para de avançar); zerá-lo fazia as peças pularem
      for (var i = 0; i < n; i++) {
        var diff = mod(i - pos);
        if (diff > n / 2) diff -= n;
        var rank = Math.abs(diff), side = diff >= 0 ? 1 : -1;
        var front = Math.max(0, 1 - rank); // 1 no centro exato, decai até a vizinha
        var ang = Math.min(3, rank) * STEP_DEG * Math.PI / 180;
        var spread = Math.max(0.56, 1 - rank * 0.1);
        var bob = ambient ? Math.sin(phase * 0.6 + i) * 3 * front : 0;
        var sway = ambient ? Math.sin(phase + i * 1.7) * stageW * 0.014 * (1 - front) : 0;
        var x = side * Math.sin(ang) * radiusX + sway;
        var y = radiusY * (1 - Math.cos(ang)) + bob;
        var rot = side * (8 + rank * 5) * (1 - front);
        var scale = (spread + (1 - spread) * front) * SHRINK;
        var z = Math.round(100 - rank * 12);
        var c = cards[i];
        c.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) scale(' + scale.toFixed(3) + ') rotate(' + rot.toFixed(2) + 'deg)';
        c.style.zIndex = String(z);
      }
    }

    function canRun() { return inView && !document.hidden && (!still || alvo !== null); } // com movimento reduzido só anima o assentamento
    function tick(now) {
      raf = 0;
      if (!canRun()) return;
      var dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      if (alvo !== null && !drag) {
        // desliza até o alvo (peça clicada ou a mais próxima ao soltar) e para; com movimento reduzido chega de uma vez
        var falta = alvo - pos;
        if (still || Math.abs(falta) < 0.002) { pos = alvo; alvo = null; descanso = now + REST_MS; }
        else pos += falta * Math.min(1, 7 * dt);
      } else if (!still && !drag && !hover && !focus && now >= descanso) { pos += DRIFT * dt; phase += 1.08 * dt; }
      render();
      if (!still || alvo !== null) raf = requestAnimationFrame(tick);
    }
    function wake() { if (!raf && canRun()) { last = 0; raf = requestAnimationFrame(tick); } }
    function irPara(i) { alvo = maisCurto(i); descanso = performance.now() + REST_MS; wake(); }

    // as peças giram para o centro: lazy deixaria cartas em branco. Cada peça vira um botão (Enter/Espaço = clique) que a centraliza.
    cards.forEach(function (li, i) {
      var im = li.querySelector('img'); if (im) im.loading = 'eager';
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'card-btn';
      btn.setAttribute('aria-label', 'Centralizar peça ' + (i + 1) + ' de ' + n + (im && im.alt ? ': ' + im.alt : '')); // um nome só: ação + descrição da peça (o alt não se perde)
      while (li.firstChild) btn.appendChild(li.firstChild);
      li.appendChild(btn);
      btn.addEventListener('click', function (e) { if (engolir) { e.preventDefault(); return; } irPara(i); });
    });
    box.classList.add('is-live');
    measure();

    // só o mouse EM CIMA DE UMA PEÇA pausa o deslize: o alvo real do ponteiro decide (cabeçalho, fundo do
    // leque ou qualquer coisa por cima das peças não contam). Toque nunca "sai", por isso só mouse.
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var li = e.target && e.target.closest ? e.target.closest('.cards li') : null;
      hover = !!li && stage.contains(li);
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () { hover = false; });
    window.addEventListener('blur', function () { hover = false; fimDoGesto(null); });
    window.addEventListener('scroll', function () { hover = false; }, { passive: true }); // ao rolar, a peça sai de baixo do mouse sem gerar pointermove
    box.addEventListener('dragstart', function (e) { e.preventDefault(); });
    box.addEventListener('focusin', function () { try { focus = !!box.querySelector(':focus-visible'); } catch (err) { focus = true; } }); // só o foco por teclado pausa; o clique do mouse também foca, mas o deslize volta depois do descanso
    box.addEventListener('focusout', function (e) { if (!box.contains(e.relatedTarget)) { focus = false; descanso = Math.max(descanso, performance.now() + 800); wake(); } });

    // arraste: mouse (botão primário) ou toque; só vira gesto quando o movimento é claramente horizontal (o vertical continua
    // sendo a rolagem da página, touch-action: pan-y). Ponteiros secundários são ignorados. Ao soltar, assenta a peça mais próxima.
    function fimDoGesto(e) {
      var d = drag;
      if (!d || (e && e.pointerId !== d.id)) return;
      drag = null;
      viewport.classList.remove('is-dragging');
      try { viewport.releasePointerCapture(d.id); } catch (err) { /* já solto */ }
      if (d.on) { engolir = true; setTimeout(function () { engolir = false; }, 80); alvo = Math.round(pos); descanso = performance.now() + REST_MS; }
      wake();
    }
    viewport.addEventListener('pointerdown', function (e) {
      if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0) || drag) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, from: pos, on: false };
    });
    viewport.addEventListener('pointermove', function (e) {
      var d = drag;
      if (!d || e.pointerId !== d.id) return;
      var dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.on) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return; // gesto vertical: rolagem; nada muda
        d.on = true; alvo = null; viewport.classList.add('is-dragging');
        // mouse: captura para seguir o arraste fora da janela. Toque já tem captura implícita — pedir de novo dispara
        // lostpointercapture no meio do gesto (visto no QA) e interromperia o swipe
        if (e.pointerType === 'mouse') { try { viewport.setPointerCapture(d.id); } catch (err) { /* sem captura: o pointerup no documento encerra */ } }
      }
      pos = d.from - dx / pxPorPeca();
      render();
    });
    viewport.addEventListener('pointerup', fimDoGesto);
    viewport.addEventListener('pointercancel', fimDoGesto);
    // soltou fora da janela (sem captura) ou o navegador engoliu o pointerup: qualquer fim do ponteiro primário encerra o gesto
    document.addEventListener('pointerup', function (e) { if (drag && e.isPrimary) fimDoGesto(null); }, true);
    document.addEventListener('pointercancel', function (e) { if (drag && e.isPrimary) fimDoGesto(null); }, true);
    box._fan = function () { return { pos: pos, drag: !!drag, on: !!(drag && drag.on), alvo: alvo, descansoEm: Math.round(descanso - performance.now()), hover: hover, focus: focus, raf: !!raf, still: still, inView: inView }; }; // sonda de QA (somente leitura)

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { inView = en[0].isIntersecting; wake(); }, { threshold: 0 }).observe(box);
    }
    document.addEventListener('visibilitychange', wake);
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(stage);
    window.addEventListener('resize', measure);
    window.addEventListener('load', measure);
    var onMotionPref = function () { still = reduceMotion.matches; if (still && alvo === null) pos = Math.round(pos); render(); wake(); };
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onMotionPref);
    else if (reduceMotion.addListener) reduceMotion.addListener(onMotionPref);
    wake();
  })();

  /* ---------- Tablet que se monta no scroll (#recursos) ----------
     Base: updateScrollCard() da seção 4 de siteflux-prototipo.html. Tudo é função direta do pixel
     de scroll (sem transição no que o scroll move): 1) enquanto a seção sobe, o aparelho assenta
     com um deslocamento curto; 2) preso na tela, cada trecho do scroll monta um bloco do site ilustrado,
     rola a tela por dentro e troca o balão e a legenda (data-step). Os botões da barra trocam o
     tipo de site (landing · e-commerce · institucional) e a visualização (computador · celular);
     o frame inteiro muda de proporção e mantém o mesmo progresso. A viewport desktop conserva
     sua largura lógica mesmo em celulares. Fica parado com movimento reduzido ou
     quando a janela é baixa demais para caber o tablet. */
  (function story() {
    var sec = document.querySelector('[data-story]');
    if (!sec) return;
    var pin = sec.querySelector('.story-pin');
    var stage = sec.querySelector('.story-stage');
    var card = sec.querySelector('.device');
    var view = sec.querySelector('.device-view');
    var frame = sec.querySelector('.device-frame');
    var bezel = sec.querySelector('.device-bezel');
    var paper = sec.querySelector('.device-paper');
    var screen = sec.querySelector('.device-screen');
    var tracks = Array.prototype.slice.call(sec.querySelectorAll('.device-track'));
    if (!pin || !stage || !card || !view || !frame || !bezel || !paper || !screen || !tracks.length) return;
    var captions = Array.prototype.slice.call(sec.querySelectorAll('.story-caption li'));
    var balloons = Array.prototype.slice.call(sec.querySelectorAll('.balloon'));
    var track = tracks[0], blocks = [], STEPS = 0;
    var on = false, step = -1, queued = false, offsets = [];
    var screenScale = 1, motion = [], lastScroll = window.scrollY;
    var sharedSelector = '.site-logo, .site-links, .site-burger, .site-hero-copy, .site-art-wrap, .site-bento, .shop-cards, .inst-cards, .inst-posts, .site-offer-head, .shop-cartbox, .site-contact, .site-quote-copy';
    card.classList.add('is-ready');

    // balão e legenda de cada etapa, por tipo de site (a landing é o que já está no HTML)
    var COPY = {
      loja: [
        ['Busca e carrinho à mão', 'O cliente procura um produto e acompanha o carrinho de qualquer página.'],
        ['Vitrine de ofertas', 'Promoções e lançamentos logo na abertura, com botão direto para comprar.'],
        ['Produtos em destaque', 'Foto, nome, preço e botão de compra organizados para decidir rápido.'],
        ['Avaliações de quem comprou', 'Notas e comentários dão segurança na hora de fechar o pedido.'],
        ['Compra em poucos passos', 'Carrinho, entrega e pagamento em um fluxo simples, com Pix, cartão e boleto.'],
        ['Contato e redes sociais', 'WhatsApp, e-mail, endereço e redes reunidos no rodapé. Pronto: sua loja está no ar.']
      ],
      site: [
        ['Menu completo', 'Todas as áreas da empresa a um clique: sobre, serviços, blog e contato.'],
        ['Apresentação da empresa', 'Quem chega entende logo quem você é e o que a sua empresa faz.'],
        ['Sobre e serviços', 'Páginas próprias para contar a história, mostrar a equipe e detalhar cada serviço.'],
        ['Prova social', 'Depoimentos e resultados de clientes dão confiança a quem ainda está decidindo.'],
        ['Blog e novidades', 'Conteúdo atualizado ajuda a empresa a ser encontrada e mostra que ela está ativa.'],
        ['Contato e redes sociais', 'WhatsApp, telefone, endereço e redes reunidos no rodapé. Pronto: seu site está no ar.']
      ]
    };
    COPY.landing = captions.map(function (li) { return [li.querySelector('h3').textContent, li.querySelector('p').textContent]; });

    function fits() { return !reduceMotion.matches && window.innerHeight >= 420; }
    function clamp(v) { return Math.min(1, Math.max(0, v)); }
    function cubic(t) { return 1 - Math.pow(1 - t, 3); }
    function cancelMotion() {
      motion.forEach(function (a) { a.onfinish = null; a.cancel(); });
      motion = [];
      card.classList.remove('is-morphing');
    }
    function layoutDevice() {
      var mobile = card.getAttribute('data-view') === 'mobile';
      var pinned = sec.classList.contains('is-story');
      var available = Math.max(120, view.clientWidth), bezel = 20;
      var logicalWidth = mobile ? 300 : 960;
      var width, height;
      if (pinned) {
        view.style.height = ''; // mede a altura que o CSS dá à janela (não a que esta função escreveu na chamada anterior)
        var room = view.clientHeight;
        width = mobile ? Math.min(available, 340, (room - bezel) * .53 + bezel) : Math.min(available, (room * .82 - bezel) * 1.89 + bezel);
        height = mobile ? room : (width - bezel) / 1.89 + bezel;
        // tela estreita: a moldura é limitada pela LARGURA e fica mais baixa que a janela; a janela acompanha, senão sobra um
        // vão entre a barra e a tela (visto em 390 px)
        if (!mobile && height < room) { view.style.height = Math.round(height) + 'px'; }
      } else {
        view.style.height = '';
        width = mobile ? Math.min(available, 320) : available;
      }
      width = Math.max(bezel + 1, width);
      screenScale = (width - bezel) / logicalWidth;
      screen.style.width = logicalWidth + 'px';
      screen.style.height = pinned ? ((height - bezel) / screenScale) + 'px' : 'auto';
      screen.style.transform = 'scale(' + screenScale + ')';
      screen.style.borderRadius = ((mobile ? 20 : 14) / screenScale) + 'px';
      frame.style.width = width + 'px';
      frame.style.height = (pinned ? height : Math.ceil(track.offsetHeight * screenScale) + bezel) + 'px';
    }
    function captureDevice() {
      var sr = screen.getBoundingClientRect();
      return {
        frame: bezel.getBoundingClientRect(), screen: sr, scale: sr.width / screen.offsetWidth,
        paper: paper.getBoundingClientRect(),
        radius: window.getComputedStyle(frame).borderRadius,
        parts: Array.prototype.map.call(track.querySelectorAll(sharedSelector), function (el) {
          var r = el.getBoundingClientRect();
          return { el: el, rect: r, visible: r.width > 0 && r.height > 0 && r.bottom >= sr.top && r.top <= sr.bottom };
        })
      };
    }
    function setView(next) {
      if (next === card.getAttribute('data-view')) return;
      var before = captureDevice();
      cancelMotion();
      card.setAttribute('data-view', next);
      layoutDevice();
      measure();
      if (on) update();
      if (reduceMotion.matches || !frame.animate) return;
      var after = captureDevice(), a = before.frame, b = after.frame;
      if (!a.width || !b.width) return;
      var sx = a.width / b.width, sy = a.height / b.height;
      var duration = window.innerWidth <= 700 ? 650 : 800;
      var timing = { duration: duration, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'both' };
      card.classList.add('is-morphing');
      // Only the two empty surfaces scale in two axes. Content has no anisotropic
      // ancestor, so its proportions also survive delayed compositor frames.
      var frameMotion = frame.animate([
        { transform: 'translate(' + (a.left - b.left) + 'px,' + (a.top - b.top) + 'px)', clipPath: 'inset(0px ' + (b.width - a.width) + 'px ' + (b.height - a.height) + 'px 0px round ' + before.radius + ')' },
        { transform: 'none', clipPath: 'inset(0px round ' + after.radius + ')' }
      ], timing);
      motion.push(frameMotion);
      motion.push(bezel.animate([
        { transform: 'scale(' + sx + ',' + sy + ')' },
        { transform: 'none' }
      ], timing));
      motion.push(screen.animate([
        { transform: 'translate(' + (before.screen.left - a.left - 10) + 'px,' + (before.screen.top - a.top - 10) + 'px) scale(' + before.scale + ')' },
        { transform: 'scale(' + after.scale + ')' }
      ], timing));
      motion.push(paper.animate([
        { transform: 'translate(' + (before.paper.left - a.left - 10) + 'px,' + (before.paper.top - a.top - 10) + 'px) scale(' + (before.paper.width / after.paper.width) + ',' + (before.paper.height / after.paper.height) + ')' },
        { transform: 'none' }
      ], timing));
      after.parts.forEach(function (part) {
        var prev = before.parts.filter(function (p) { return p.el === part.el; })[0];
        if (!prev || !prev.visible || !part.visible) return;
        var localX = (part.rect.left - after.screen.left) / after.scale;
        var localY = (part.rect.top - after.screen.top) / after.scale;
        var dx = (prev.rect.left - before.screen.left) / before.scale - localX;
        var dy = (prev.rect.top - before.screen.top) / before.scale - localY;
        var size = (prev.rect.width / before.scale) / (part.rect.width / after.scale);
        // Uniform scaling retains the proportions of type and illustrations.
        motion.push(part.el.animate([
          { transformOrigin: '0 0', transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + size + ')' },
          { transformOrigin: '0 0', transform: 'none' }
        ], timing));
      });
      var startedAt = document.timeline.currentTime;
      motion.forEach(function (animation) { animation.startTime = startedAt; });
      frameMotion.onfinish = function () { cancelMotion(); measure(); queue(); };
    }
    function setStep(s) {
      if (s === step) return;
      step = s;
      sec.setAttribute('data-step', String(s));
      captions.forEach(function (li, i) { li.classList.toggle('is-on', i === Math.max(0, s - 1)); });
    }
    function update() {
      queued = false;
      if (!on) return;
      var r = pin.getBoundingClientRect(), vh = window.innerHeight;
      if (r.top > vh * 1.2 || r.bottom < -vh * 0.2) return; // longe da tela: nada a fazer

      // Entrada contida: a transformação principal responde ao seletor de dispositivo.
      var preRoll = Math.min(Math.max(vh * 0.6, 300), 650);
      var settle = clamp((preRoll - r.top) / preRoll), eased = cubic(settle);
      card.style.transform = 'translateY(' + (20 * (1 - settle)).toFixed(1) + 'px)';
      card.style.opacity = Math.min(1, eased * 1.9).toFixed(3);

      // preso: o progresso monta os blocos em sequência e rola a tela por dentro
      var total = Math.max(1, pin.offsetHeight - vh);
      var p = clamp(-r.top / total), pos = p * STEPS;
      blocks.forEach(function (b, i) {
        // o primeiro bloco chega junto com o tablet; os demais, cada um no seu trecho de scroll
        var local = i === 0 ? clamp((eased - 0.45) / 0.55) : clamp((pos - i + 0.35) / 0.5);
        b.style.setProperty('--b', cubic(local).toFixed(3));
      });
      // a tela rola por dentro para manter o bloco da vez no meio (chega um pouco antes de ele se montar)
      var f = Math.min(STEPS - 1, Math.max(0, pos - 0.25)), k = Math.floor(f), t = f - k;
      t = t * t * (3 - 2 * t);
      var off = offsets.length ? offsets[k] + ((offsets[Math.min(STEPS - 1, k + 1)] || 0) - offsets[k]) * t : 0;
      track.style.transform = 'translateY(' + (-off).toFixed(1) + 'px)';
      setStep(settle < 0.6 ? 0 : Math.min(STEPS, 1 + Math.floor(pos)));
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
    function measure() {
      if (!on) { layoutDevice(); return; }
      // offsetHeight, não scrollHeight: um bloco ainda entrando (deslocado para baixo pelo transform) estica o scrollHeight e
      // a tela rolava além do fim do site, deixando uma faixa branca sob o rodapé
      var max = Math.max(0, track.offsetHeight - screen.clientHeight - 1), sh = screen.clientHeight; // 1 px de folga: nunca sobra fresta
      // bloco que cabe na tela fica no meio; bloco mais alto que a tela (celular) começa pelo topo
      offsets = blocks.map(function (b) { var h = b.offsetHeight; return Math.min(max, Math.max(0, h > sh ? b.offsetTop : b.offsetTop + h / 2 - sh / 2)); });
      queue();
    }
    function sync() {
      cancelMotion();
      var want = fits();
      // a história só vale se o palco inteiro (topo, tablet e legenda) couber na janela; senão (ex.: 390 × 480, paisagem
      // num celular) a seção rola normalmente, sem o tablet ficar preso por baixo do cabeçalho
      if (want) {
        if (!on) sec.classList.add('is-story');
        layoutDevice();
        var cs = window.getComputedStyle(stage), fig = card.parentNode, cap = sec.querySelector('.story-caption');
        var precisa = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0) + (parseFloat(cs.rowGap) || 0) + fig.offsetHeight + (cap ? cap.offsetHeight : 0);
        // compara com o próprio palco (100svh) e tolera uns px, como a versão anterior tolerava sem avisar
        // 140: em celular (390 px) a moldura web tem ~165 px de altura e a história continua valendo (era 220 antes da janela seguir a moldura)
        if (precisa > stage.clientHeight + 24 || view.clientHeight < 140) { want = false; if (!on) sec.classList.remove('is-story'); }
      }
      if (want !== on) {
        on = want;
        sec.classList.toggle('is-story', on);
        step = -1;
        if (!on) {
          sec.removeAttribute('data-step');
          card.style.transform = ''; card.style.opacity = '';
          tracks.forEach(function (t) {
            t.style.transform = '';
            Array.prototype.forEach.call(t.querySelectorAll('.wire-block'), function (b) { b.style.removeProperty('--b'); });
          });
          captions.forEach(function (li) { li.classList.remove('is-on'); });
        }
      }
      layoutDevice();
      if (on) { measure(); update(); }
    }

    // troca o tipo de site: mostra a trilha escolhida e reescreve balões e legendas
    function setKind(kind) {
      var next = tracks.filter(function (t) { return t.getAttribute('data-track') === kind; })[0];
      if (!next || !COPY[kind]) return;
      cancelMotion();
      tracks.forEach(function (t) { t.hidden = t !== next; });
      track = next;
      blocks = Array.prototype.slice.call(track.querySelectorAll('.wire-block'));
      STEPS = blocks.length;
      card.setAttribute('data-kind', kind);
      COPY[kind].forEach(function (c, i) {
        if (balloons[i]) balloons[i].lastChild.nodeValue = c[0];
        if (captions[i]) { captions[i].querySelector('h3').textContent = c[0]; captions[i].querySelector('p').textContent = c[1]; }
      });
      sync(); // a legenda do novo tipo pode ter outra altura: reavalia se a história cabe
    }
    function press(group, btn) {
      Array.prototype.forEach.call(group.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
    }
    Array.prototype.forEach.call(sec.querySelectorAll('[data-kinds] button'), function (btn) {
      btn.addEventListener('click', function () { press(btn.parentNode, btn); setKind(btn.getAttribute('data-kind')); });
    });
    Array.prototype.forEach.call(sec.querySelectorAll('[data-views] button'), function (btn) {
      btn.addEventListener('click', function () {
        press(btn.parentNode, btn);
        setView(btn.getAttribute('data-view'));
      });
    });
    setKind('landing');

    window.addEventListener('scroll', function () {
      if (motion.length && Math.abs(window.scrollY - lastScroll) > 2) cancelMotion();
      lastScroll = window.scrollY;
      queue();
    }, { passive: true });
    window.addEventListener('resize', sync);
    window.addEventListener('load', sync);
    // a altura do site dentro do tablet muda com a largura e com a fonte carregada: remede
    if ('ResizeObserver' in window) { var ro = new ResizeObserver(measure); tracks.forEach(function (t) { ro.observe(t); }); ro.observe(screen); }
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', sync);
    else if (reduceMotion.addListener) reduceMotion.addListener(sync);
    sync();
    window.addEventListener('pagehide', cancelMotion);
  })();

  /* ---------- Processo: linha → progresso → estrutura ----------
     Scroll natural, sem prender a seção. Cada etapa assenta apenas 20 px, fica azul e alimenta a linha.
     O pequeno fragmento final abre suas divisões: uma estrutura que continua recebendo conteúdo.
     A posição de scroll governa também a volta; movimento reduzido mostra o estado completo. */
  (function bento() {
    var pin = document.querySelector('[data-bento]');
    if (!pin) return;
    var grid = pin.querySelector('[data-bento-grid]');
    var tiles = Array.prototype.slice.call(pin.querySelectorAll('[data-fly]')).map(function (el) {
      var v = (el.getAttribute('data-fly') || '0,0,0,0').split(',').map(Number);
      return { el: el, x: v[0] || 0, y: v[1] || 0, r: v[2] || 0, i: v[3] || 0, top: 0, mid: 0, h: 0, u: 0, e: 0 };
    });
    if (!grid || !tiles.length) return;
    var N = tiles.length, STEP = 0.78 / Math.max(1, N - 1), SPAN = 0.22; // a última peça termina em p = 1
    var on = false, queued = false;

    function clamp(v) { return Math.min(1, Math.max(0, v)); }
    function ease(t) { return 1 - Math.pow(1 - t, 4); }
    // u = progresso LINEAR da peça (0 = fora, 1 = assentada): governa a lógica (cor, ordem); o easing só serve ao desenho
    function place(t, u, x, y) {
      if (u > 1 - 0.000001) u = 1; // a última janela pode terminar em 0.9999999999999999
      var e = ease(u), k = 1 - e;
      t.u = u; t.e = e;
      t.done = u >= 1;
      t.el.style.transform = 'translate3d(' + (x * k).toFixed(1) + 'px,' + (y * k).toFixed(1) + 'px,0)';
      t.el.style.setProperty('--step-p', u.toFixed(4));
      t.el.style.willChange = u > 0 && u < 1 ? 'transform' : '';
    }
    function update() {
      queued = false;
      if (!on) return;
      var vh = window.innerHeight, vw = window.innerWidth;
      var g = grid.getBoundingClientRect();
      if (vw > 1100) {
        var q = clamp((vh * 0.9 - g.top) / (vh * 0.48));
        pin.style.setProperty('--bento-p', q.toFixed(4));
        tiles.forEach(function (t) { place(t, clamp((q - t.i * STEP) / SPAN), t.x, t.y); });
      } else {
        tiles.forEach(function (t) {
          var u = clamp((vh * 0.86 - (g.top + t.top)) / (vh * 0.28));
          place(t, u, 0, 16);
        });
      }
      marca();
    }
    // a cor só muda quando a peça ASSENTA: a concluída ganha o preenchimento azul e fica assim (.is-done);
    // com as quatro assentadas, .is-all. Tudo derivado da posição de scroll, sem timers (voltar o scroll desfaz na mesma ordem).
    function marca() {
      var ordem = tiles.filter(function (t) { return t.el.classList.contains('step'); }).sort(function (a, b) { return a.i - b.i; });
      if (!ordem.length) return;
      // Estados acumulados, derivados do progresso atual, inclusive ao voltar o scroll.
      var todos = ordem.every(function (t) { return t.done; });
      ordem.forEach(function (t) { t.el.classList.toggle('is-done', !!t.done); });
      pin.classList.toggle('is-all', todos);
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
    function measure() { // posição de cada peça dentro do painel, sem contar o transform
      var g = grid.getBoundingClientRect();
      tiles.forEach(function (t) {
        var keep = t.el.style.transform;
        t.el.style.transform = 'none';
        var b = t.el.getBoundingClientRect();
        t.el.style.transform = keep;
        t.top = b.top - g.top; t.mid = b.left - g.left + b.width / 2;
      });
    }
    function sync() {
      var want = !reduceMotion.matches;
      if (want !== on) {
        on = want;
        pin.classList.toggle('is-fly', on);
        if (!on) {
          tiles.forEach(function (t) { t.el.style.transform = ''; t.el.style.willChange = ''; t.el.style.removeProperty('--step-p'); t.el.classList.remove('is-done'); });
          pin.classList.remove('is-all');
          pin.style.removeProperty('--bento-p');
        }
      }
      if (on) { measure(); update(); }
    }

    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', sync);
    window.addEventListener('load', sync);
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', sync);
    else if (reduceMotion.addListener) reduceMotion.addListener(sync);
    sync();
  })();

  /* ---------- FAQ: abrir/recolher em um único gesto ----------
     O <details> nativo continua sendo a base (e o que vale sem JS). Aqui a resposta é embrulhada em .faq-a > .faq-a-inner
     para a altura animar por grid-template-rows; .is-open comanda o visual e o atributo open só sai DEPOIS de a altura
     fechar, senão o conteúdo sumiria de uma vez. Um cartão aberto por vez (o atributo name sai: ele fecharia os outros
     sem animação). */
  (function faq() {
    var list = document.querySelector('.faq-list');
    var items = list ? Array.prototype.slice.call(list.querySelectorAll('details')) : [];
    if (!items.length || !('gridTemplateRows' in document.documentElement.style)) return;
    items.forEach(function (d) {
      var summary = d.querySelector('summary'), wrap = document.createElement('div'), inner = document.createElement('div');
      wrap.className = 'faq-a'; inner.className = 'faq-a-inner';
      Array.prototype.slice.call(d.childNodes).forEach(function (node) { if (node !== summary) inner.appendChild(node); });
      wrap.appendChild(inner); d.appendChild(wrap);
      d.removeAttribute('name');
      if (d.open) d.classList.add('is-open');
      summary.addEventListener('click', function (e) {
        e.preventDefault();
        var abrir = !d.classList.contains('is-open');
        items.forEach(function (o) { if (o !== d) fechar(o); });
        if (abrir) {
          if (d._cancelClose) d._cancelClose();
          d.open = true; void d.offsetHeight; d.classList.add('is-open');
        } else fechar(d);
      });
    });
    function fechar(d) {
      if (!d.classList.contains('is-open')) return;
      d.classList.remove('is-open');
      if (d._cancelClose) d._cancelClose();
      var wrap = d.querySelector('.faq-a'), timer;
      function cleanup() {
        clearTimeout(timer);
        wrap.removeEventListener('transitionend', ended);
        d._cancelClose = d._finishClose = null;
      }
      function finish() { cleanup(); if (!d.classList.contains('is-open')) d.open = false; }
      function ended(e) { if (e.target === wrap && e.propertyName === 'grid-template-rows') finish(); }
      if (reduceMotion.matches) { finish(); return; }
      var style = getComputedStyle(wrap);
      function milliseconds(value) { return parseFloat(value) * (value.indexOf('ms') > -1 ? 1 : 1000) || 0; }
      var durations = style.transitionDuration.split(',').map(milliseconds);
      var delays = style.transitionDelay.split(',').map(milliseconds);
      var total = style.transitionProperty.split(',').reduce(function (max, prop, i) {
        return prop.trim() === 'all' || prop.trim() === 'grid-template-rows' ? Math.max(max, durations[i % durations.length] + delays[i % delays.length]) : max;
      }, 0);
      if (!total) { finish(); return; }
      d._cancelClose = cleanup; d._finishClose = finish;
      wrap.addEventListener('transitionend', ended);
      // Fallback derivado do CSS para aba oculta, resposta vazia ou transição sem evento.
      timer = setTimeout(finish, total + 80);
    }
    function motionChanged() { if (reduceMotion.matches) items.forEach(function (d) { if (d._finishClose) d._finishClose(); }); }
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', motionChanged);
    else if (reduceMotion.addListener) reduceMotion.addListener(motionChanged);
    list.classList.add('is-js');
  })();

  /* ---------- Indicação da seção atual na navegação ---------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('#siteNav a[href^="#"]:not(.btn)'));
  var sections = links
    .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
    .filter(Boolean);
  if (sections.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) {
          if (a.getAttribute('href') === '#' + entry.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }
})();
