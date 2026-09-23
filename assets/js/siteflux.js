/* Siteflux — comportamento progressivo. Sem este arquivo a página continua
   completa: menu expandido, FAQ nativo (details) e conteúdo sempre visível. */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js'); // o script inline do <head> já marcou; aqui só garante

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Página ampliada com pinça (html.is-pinca): o arraste horizontal sobre o leque, as capas e a galeria passa a deslocar a
  // vista ampliada (o navegador cuida, ver touch-action no CSS) em vez de trocar peça, projeto ou tela sem pedido.
  if (window.visualViewport) {
    var pinca = function () { root.classList.toggle('is-pinca', window.visualViewport.scale > 1.01); };
    window.visualViewport.addEventListener('resize', pinca);
    pinca();
  }

  /* ---------- Intro vetorial (1x por sessão) ----------
     O <head> marca html.intro-active só quando a abertura deve rodar. Aqui o
     overlay é montado com os paths oficiais do <symbol id="sf-logo">; qualquer
     falha libera a página na hora. Sem este arquivo, a cobertura CSS some sozinha.
     2.36: um relógio só. Os 2,4 s da coreografia contam do quadro em que ela começa de
     fato (.is-playing) e a entrada da hero, que o CSS conta do primeiro estilo, é empurrada
     para começar junto com a dissolução. Se o script chegar tarde (rede ou aparelho lento),
     a intro não é montada: a cobertura CSS já está saindo e a página segue direto. */
  (function intro() {
    if (!root.classList.contains('intro-active')) return;

    var overlay = null, done = false, timers = [];
    function release() {
      root.classList.remove('intro-active', 'intro-leaving');
      root.style.removeProperty('--rise-start');
    }
    function cleanup() {
      timers.forEach(clearTimeout);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('visibilitychange', onHidden);
      document.removeEventListener('wheel', onGesture, true);
      document.removeEventListener('touchstart', onGesture, true);
      document.removeEventListener('pointerdown', onGesture, true);
      window.removeEventListener('scroll', onGesture);
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
      // a última entrada da hero termina 1,67 s depois da dissolução (siteflux.css, [data-rise] --i:7): 1,8 s basta
      if (natural) setTimeout(release, 1800);
    }
    var ROLAGEM = { ' ': 1, Spacebar: 1, PageDown: 1, PageUp: 1, ArrowDown: 1, ArrowUp: 1, End: 1, Home: 1 };
    function onKey(e) {
      if (ROLAGEM[e.key]) { e.preventDefault(); finish(false); } // tecla de rolagem: pula a abertura sem rolar a página escondida
      else if (e.key === 'Escape' || e.key === 'Tab') finish(false);
    }
    function onHidden() { if (document.hidden) finish(false); }
    // roda, toque ou clique pulam a abertura; o gesto que pula não rola a página (ela aparece no topo, com a entrada da hero).
    // A rolagem por outros meios (barra de rolagem, busca na página) também pula, pelo evento scroll.
    function onGesture(e) {
      if (e.type === 'pointerdown' && e.pointerType === 'touch') return; // no toque quem pula é o touchstart (vem depois e consegue barrar a rolagem)
      if (e.cancelable && (e.type === 'wheel' || e.type === 'touchstart')) e.preventDefault();
      finish(false);
    }
    // a hero sobe com --rise-start contado do primeiro estilo; a intro começa agora: soma o atraso
    function alignHero() {
      var h = document.querySelector('.hero [data-rise]');
      var an = h && h.getAnimations ? h.getAnimations()[0] : null;
      if (!an || an.startTime == null || !document.timeline) return;
      var late = Math.max(0, (document.timeline.currentTime - an.startTime) / 1000);
      if (late > 0.05) root.style.setProperty('--rise-start', (2.4 + late).toFixed(2) + 's');
    }

    try {
      sessionStorage.setItem('sf-intro', '1');
      // a cobertura CSS sai sozinha 4,6 s depois do primeiro estilo: chegar depois de 3 s é tarde demais
      // (ou quem já rolou por baixo da cobertura antes de o script rodar não deve ver a abertura por cima do meio da página)
      if (performance.now() > 3000 || window.pageYOffset > 0) throw new Error('tarde');
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
      // não passivos só enquanto a abertura existe (cleanup() os remove): o primeiro gesto é consumido por ela
      document.addEventListener('wheel', onGesture, { capture: true, passive: false });
      document.addEventListener('touchstart', onGesture, { capture: true, passive: false });
      document.addEventListener('pointerdown', onGesture, true);
      window.addEventListener('scroll', onGesture, { passive: true });
      // duas oportunidades de pintura antes do primeiro frame animado; a coreografia (2,4 s) conta daqui
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (done) return;
          overlay.classList.add('is-playing');
          alignHero();
          timers.push(setTimeout(function () { finish(true); }, 2400));
        });
      });
      // o overlay não tem failsafe CSS: sem quadro em 1,5 s (rAF parado, aba em segundo plano) ou passado o total, a página segue
      timers.push(setTimeout(function () { if (!overlay.classList.contains('is-playing')) finish(false); }, 1500));
      timers.push(setTimeout(function () { finish(false); }, 4400));
    } catch (err) {
      finish(false);
    }
  })();

  /* ---------- Menu em tela cheia ---------- */
  var toggle = document.getElementById('menuToggle');
  var nav = document.getElementById('siteNav');
  // o que fica atrás da cortina: sai da árvore de acessibilidade enquanto ela está aberta (leitores de tela não escapam)
  var behindMenu = [document.getElementById('conteudo'), document.querySelector('.footer'), document.querySelector('.skip-link')];

  /* Travar a rolagem tira a barra de rolagem da página. Onde não há scrollbar-gutter (Safari até a 18.1 com barra
     sempre visível), o topo e a página alargariam ~15 px: o html ganha, enquanto a trava dura, a largura da barra. */
  var gutterOk = !!(window.CSS && CSS.supports && CSS.supports('scrollbar-gutter', 'stable'));
  window.sfLockWidth = function (on) {
    if (gutterOk) return;
    if (on) { var sb = window.innerWidth - root.clientWidth; if (sb > 0) root.style.paddingRight = sb + 'px'; }
    else root.style.paddingRight = '';
  };

  function setMenu(open, restoreFocus) {
    if (!toggle || !nav) return;
    if (open) window.sfLockWidth(true);
    nav.classList.toggle('is-open', open);
    root.classList.toggle('menu-open', open); // cortina em tela cheia: trava o scroll e esconde botão e logo do topo
    if (!open && !root.classList.contains('galeria-aberta')) window.sfLockWidth(false);
    behindMenu.forEach(function (el) { if (el) el.inert = open; });
    var logoEl = document.querySelector('.header .logo'); // pulso curto da logo a cada abrir/fechar (protótipo)
    if (logoEl && !reduceMotion.matches) { logoEl.classList.remove('is-pulse'); void logoEl.offsetWidth; logoEl.classList.add('is-pulse'); }
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Fechar menu de navegação' : 'Abrir menu de navegação');
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
    // iOS 15: o WebKit ainda não respeita overflow: hidden na raiz nem overscroll-behavior no toque, e o arraste com a
    // cortina aberta rolaria a página de trás. Só onde falta overscroll-behavior, o arraste fora de uma lista que rola é barrado.
    if (window.CSS && CSS.supports && !CSS.supports('overscroll-behavior', 'contain')) {
      document.querySelector('.header').addEventListener('touchmove', function (e) {
        if (e.touches && e.touches.length > 1) return; // a pinça (zoom) continua com o navegador
        if (menuIsOpen() && !(nav.contains(e.target) && nav.scrollHeight > nav.clientHeight + 1)) e.preventDefault();
      }, { passive: false });
    }
  }

  /* ---------- Tom do cabeçalho ---------- */
  // Lê a cor de fundo que está sob a barra e troca data-tone (claro = sem atributo | dark | blue).
  // 2.36: na rolagem, o hit-test só roda depois de 16 px desde a última leitura, com uma leitura final 120 ms
  // depois do último evento (a cor do topo tem transição de .35 s: o atraso não aparece).
  var headerEl = document.querySelector('.header');
  var headerBar = headerEl ? headerEl.querySelector('.header-bar') : null;
  var queueTone = function () {};
  if (headerBar && document.elementsFromPoint) {
    var TONES = [['dark', 4, 43, 32], ['', 255, 255, 255], ['', 239, 239, 239], ['', 204, 217, 97], ['blue', 60, 188, 213]];
    var toneQueued = false, toneY = null, toneTimer = 0;
    var toneUnder = function () {
      var r = headerBar.getBoundingClientRect();
      // clientWidth: o centro do conteúdo, sem a barra de rolagem clássica
      var els = document.elementsFromPoint(root.clientWidth / 2, r.top + Math.min(r.height, 76) / 2);
      for (var i = 0; i < els.length; i++) {
        var el = els[i];
        if (headerEl.contains(el) || el.closest('.intro')) continue;
        var bg = getComputedStyle(el).backgroundColor;
        var c = (bg.match(/[\d.]+/g) || []).map(Number);
        // color-mix() e cores modernas saem como color(srgb r g b), com canais de 0 a 1
        if (bg.indexOf('color(srgb ') === 0) { c[0] *= 255; c[1] *= 255; c[2] *= 255; }
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
      toneY = window.scrollY;
      var tone = toneUnder();
      if (tone === (headerEl.getAttribute('data-tone') || '')) return;
      if (tone) headerEl.setAttribute('data-tone', tone);
      else headerEl.removeAttribute('data-tone');
    };
    var requestTone = function () {
      if (toneQueued) return;
      toneQueued = true;
      requestAnimationFrame(applyTone);
    };
    queueTone = function (e) {
      if (!e || e.type !== 'scroll') { requestTone(); return; }
      clearTimeout(toneTimer);
      toneTimer = setTimeout(requestTone, 120); // leitura final, parada a rolagem
      if (toneY === null || Math.abs(window.scrollY - toneY) >= 16) requestTone();
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
     encontra seu lugar. Sem biblioteca: os contornos são amostrados em pontos por comprimento de arco,
     alinhados ao alvo e interpolados; nos extremos entram os paths exatos. Uma linha nasce na
     fresta horizontal do símbolo e sobe para dividir o cabeçalho. Sem JS fica o símbolo parado.
     2.36: a amostragem saiu da carga (eram ~3.400 getPointAtLength, 0,5 s no desktop e ~3 s num celular
     médio). Os alvos são calculados por fórmula e os contornos do símbolo por um leitor de path em JS,
     só na primeira vez que o morph vai de fato animar (movimento reduzido e links com #hash não pagam nada).
     O laço dorme nas pausas (7 s + 1,6 s de cada ciclo) e não reescreve o SVG quando nada muda. */
  (function heroMorph() {
    var art = document.querySelector('[data-morph]');
    var symbol = document.getElementById('sf-tracos');
    if (!art) return;
    if (!symbol || !symbol.querySelector('path')) { art.classList.add('sem-morph'); return; }
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
    var semMorph = subs.length !== 17;
    for (var c = 0; c < 17 && !semMorph; c++) { if (!TARGETS[c]) semMorph = true; }
    if (semMorph) { art.classList.add('sem-morph'); return; } // símbolo diferente do esperado: fica parado, com as etiquetas

    // n pontos do retângulo rr() igualmente espaçados pelo comprimento, a partir de (x + r, y), no sentido horário:
    // o mesmo resultado de getPointAtLength sobre o path de rr(), sem tocar no DOM
    function rrPoints(x, y, w, h, r, n) {
      r = Math.min(r, w / 2, h / 2);
      var a = w - 2 * r, b = h - 2 * r, q = Math.PI * r / 2, HP = Math.PI / 2;
      var segs = [ // [arco?, x ou centro x, y ou centro y, dx ou ângulo inicial, dy, comprimento]
        [0, x + r, y, 1, 0, a], [1, x + w - r, y + r, -HP, 0, q],
        [0, x + w, y + r, 0, 1, b], [1, x + w - r, y + h - r, 0, 0, q],
        [0, x + w - r, y + h, -1, 0, a], [1, x + r, y + h - r, HP, 0, q],
        [0, x, y + h - r, 0, -1, b], [1, x + r, y + r, Math.PI, 0, q]
      ];
      var L = 2 * a + 2 * b + 4 * q, out = [];
      for (var i = 0; i < n; i++) {
        var s = L * i / n, k = 0;
        while (k < 7 && s > segs[k][5]) { s -= segs[k][5]; k++; }
        var g = segs[k];
        if (g[0]) { var th = g[3] + (r ? s / r : 0); out.push([g[1] + r * Math.cos(th), g[2] + r * Math.sin(th)]); }
        else out.push([g[1] + g[3] * s, g[2] + g[4] * s]);
      }
      return out;
    }
    // n pontos de um contorno do símbolo, pelo comprimento de arco, a partir do M e no sentido do path (como
    // getPointAtLength): cada curva vira uma polilinha fina e ela é reamostrada. Aceita M L H V C S Q T Z,
    // absolutos e relativos, com um único subpath; qualquer outra coisa lança erro e entra a medição pelo DOM.
    function pathPoints(d, n) {
      var tok = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
      var poly = [], i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, cx = null, cy = null, qx = null, qy = null;
      function num() { var v = parseFloat(tok[i++]); if (isNaN(v)) throw new Error('path'); return v; }
      function lineTo(nx, ny) { poly.push([nx, ny]); x = nx; y = ny; cx = cy = qx = qy = null; }
      function cubicTo(x1, y1, x2, y2, x3, y3) {
        for (var k = 1; k <= 32; k++) {
          var t = k / 32, u = 1 - t, a = u * u * u, b = 3 * u * u * t, e = 3 * u * t * t, f = t * t * t;
          poly.push([a * x + b * x1 + e * x2 + f * x3, a * y + b * y1 + e * y2 + f * y3]);
        }
        x = x3; y = y3; cx = x2; cy = y2; qx = qy = null;
      }
      function quadTo(x1, y1, x2, y2) {
        var ox = x, oy = y;
        cubicTo(ox + 2 / 3 * (x1 - ox), oy + 2 / 3 * (y1 - oy), x2 + 2 / 3 * (x1 - x2), y2 + 2 / 3 * (y1 - y2), x2, y2);
        cx = cy = null; qx = x1; qy = y1;
      }
      while (i < tok.length) {
        if (/[a-zA-Z]/.test(tok[i])) cmd = tok[i++];
        else if (!cmd) throw new Error('path');
        var C = cmd.toUpperCase(), ox = cmd === C ? 0 : x, oy = cmd === C ? 0 : y;
        if (C === 'M') {
          if (poly.length) throw new Error('subpath');
          x = sx = num() + ox; y = sy = num() + oy; poly.push([x, y]);
          cmd = cmd === 'M' ? 'L' : 'l'; // coordenadas seguintes do M são L
        } else if (C === 'L') lineTo(num() + ox, num() + oy);
        else if (C === 'H') lineTo(num() + ox, y);
        else if (C === 'V') lineTo(x, num() + oy);
        else if (C === 'C') cubicTo(num() + ox, num() + oy, num() + ox, num() + oy, num() + ox, num() + oy);
        else if (C === 'S') {
          var rx = cx === null ? x : 2 * x - cx, ry = cy === null ? y : 2 * y - cy;
          cubicTo(rx, ry, num() + ox, num() + oy, num() + ox, num() + oy);
        } else if (C === 'Q') quadTo(num() + ox, num() + oy, num() + ox, num() + oy);
        else if (C === 'T') quadTo(qx === null ? x : 2 * x - qx, qy === null ? y : 2 * y - qy, num() + ox, num() + oy);
        else if (C === 'Z') { if (x !== sx || y !== sy) lineTo(sx, sy); cx = cy = qx = qy = null; cmd = ''; }
        else throw new Error('path');
      }
      var lens = [0], L = 0;
      for (var k = 1; k < poly.length; k++) {
        var dx = poly[k][0] - poly[k - 1][0], dy = poly[k][1] - poly[k - 1][1];
        L += Math.sqrt(dx * dx + dy * dy); lens.push(L);
      }
      if (!(L > 0)) throw new Error('path');
      var out = [], j = 1;
      for (var m = 0; m < n; m++) {
        var s = L * m / n;
        while (j < lens.length - 1 && lens[j] < s) j++;
        var seg = lens[j] - lens[j - 1], f = seg > 0 ? (s - lens[j - 1]) / seg : 0;
        out.push([poly[j - 1][0] + (poly[j][0] - poly[j - 1][0]) * f, poly[j - 1][1] + (poly[j][1] - poly[j - 1][1]) * f]);
      }
      return out;
    }
    function domPoints(el, d, n) { // reserva: a medição antiga, no próprio path da forma
      var keep = el.getAttribute('d');
      el.setAttribute('d', d);
      var len = el.getTotalLength(), pts = [];
      for (var i = 0; i < n; i++) { var q = el.getPointAtLength(len * i / n); pts.push([q.x, q.y]); }
      el.setAttribute('d', keep);
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

    // na carga: só os 17 paths com o desenho exato do símbolo (d0) e o do site (d1); os pontos vêm depois
    var group = document.createElementNS(NS, 'g');
    group.setAttribute('class', 'morph');
    var shapes = subs.map(function (d, i) {
      var t = TARGETS[i], el = document.createElementNS(NS, 'path'), rank = ORDER.indexOf(i);
      el.setAttribute('d', d);
      group.appendChild(el);
      return { el: el, t: t, n: i === 0 ? 180 : 96, from: null, to: null, d0: d, d1: rr(t[0], t[1], t[2], t[3], t[4]), start: i === 0 ? 0.4 : 0.55 + rank * 0.035, dur: i === 0 ? 1.1 : 0.9, last: -1 };
    });
    var bar = document.createElementNS(NS, 'path');
    bar.setAttribute('class', 'morph-bar');
    group.appendChild(bar);
    svg.appendChild(group);
    art.classList.add('is-morph');

    var ready = false, broken = false;
    function prepare() { // primeira vez que o morph vai animar: alvos por fórmula, origens pelo leitor de path
      if (ready || broken) return ready;
      try {
        shapes.forEach(function (s) {
          var to = rrPoints(s.t[0], s.t[1], s.t[2], s.t[3], s.t[4], s.n), from;
          try { from = pathPoints(s.d0, s.n); } catch (err) { from = domPoints(s.el, s.d0, s.n); }
          s.to = to; s.from = align(from, to);
        });
        ready = true;
      } catch (err) { // sem pontos, sem morph: o símbolo oficial volta, parado
        broken = true;
        if (group.parentNode) svg.removeChild(group);
        art.classList.remove('is-morph', 'is-site'); art.classList.add('sem-morph');
      }
      return ready;
    }

    var T = 2.6, lastTime = NaN, lastBar = '', lastBarOp = '', lastTf = '', lastOp = '';
    function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; } // ≈ cubic-bezier(.65, 0, .35, 1)
    function span(time, a, b) { return Math.min(1, Math.max(0, (time - a) / (b - a))); }
    function draw(time) {
      if (broken || time === lastTime) return; // pausas: nada muda, nada é escrito
      lastTime = time;
      shapes.forEach(function (s) {
        var t = ease(span(time, s.start, s.start + s.dur));
        if (t === s.last) return;
        if (t > 0 && t < 1 && !s.from) return; // ainda sem pontos (só acontece antes do prepare)
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
      var bd = 'M' + x1.toFixed(1) + ',' + y.toFixed(1) + 'H' + x2.toFixed(1), bo = Math.min(1, b * 3).toFixed(3);
      if (bd !== lastBar) { bar.setAttribute('d', bd); lastBar = bd; }
      if (bo !== lastBarOp) { bar.style.opacity = bo; lastBarOp = bo; }
      // ganha vida (0,95 → 1) e, no fim, um micro overshoot (1,015 → 1)
      var enter = ease(span(time, 0, 0.4)), over = span(time, 2.0, T);
      var sc = 0.95 + 0.05 * enter + 0.015 * Math.sin(Math.PI * over);
      var tf = 'translate(' + CX + ' ' + CY + ') scale(' + sc.toFixed(4) + ') translate(' + (-CX) + ' ' + (-CY) + ')', go = (0.35 + 0.65 * enter).toFixed(3);
      if (tf !== lastTf) { group.setAttribute('transform', tf); lastTf = tf; }
      if (go !== lastOp) { group.style.opacity = go; lastOp = go; }
      art.classList.toggle('is-site', time >= 2.1);
    }

    // linha do tempo: monta (2,6 s) → segura → desmonta (mais rápido) → segura → repete
    var HOLD_SITE = 7, BACK = 1.7, HOLD_ICON = 1.6, CYCLE = T + HOLD_SITE + BACK + HOLD_ICON;
    var clock = 0, last = 0, raf = 0, nap = 0, napAt = 0, napRest = 0, visible = !('IntersectionObserver' in window), started = false;
    function timeAt(c) {
      c = c % CYCLE;
      if (c < T) return c;
      if (c < T + HOLD_SITE) return T;
      if (c < T + HOLD_SITE + BACK) return T * (1 - (c - T - HOLD_SITE) / BACK);
      return 0;
    }
    function holdLeft(c) { // segundos até o fim da pausa em que o relógio está (0 fora das pausas)
      c = c % CYCLE;
      if (c >= T && c < T + HOLD_SITE) return T + HOLD_SITE - c;
      if (c >= T + HOLD_SITE + BACK) return CYCLE - c;
      return 0;
    }
    function canRun() { return started && visible && !document.hidden && !reduceMotion.matches; }
    function halt() {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      // soneca interrompida (arte saiu da tela, aba oculta): o tempo já dormido conta, a pausa não recomeça cheia
      if (nap) { clearTimeout(nap); nap = 0; clock += Math.min(napRest, (performance.now() - napAt) / 1000); }
    }
    function tick(now) {
      raf = 0;
      if (!canRun()) return;
      clock += Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      draw(timeAt(clock));
      var rest = holdLeft(clock);
      if (rest > 0.08) { // pausa: o laço dorme até o fim dela, sem pedir quadros; fora da tela, o timer é cancelado
        napAt = performance.now(); napRest = rest;
        nap = setTimeout(function () { nap = 0; clock += rest; last = 0; wake(); }, rest * 1000);
        return;
      }
      raf = requestAnimationFrame(tick);
    }
    function wake() {
      if (reduceMotion.matches) { halt(); draw(T); return; } // movimento reduzido: o site já montado, parado
      if (!canRun()) { halt(); return; }
      if (raf || nap || !prepare()) return;
      last = 0; raf = requestAnimationFrame(tick);
    }
    function begin() { // espera a intro sair (e a arte surgir) para o morph não acontecer escondido
      if (started) return;
      if (root.classList.contains('intro-active')) { setTimeout(begin, 200); return; }
      if (root.classList.contains('intro-leaving')) {
        // com a intro, a arte (data-rise, --i:7) só surge 0,77 s depois da dissolução: o morph começa 0,4 s antes dela
        // aparecer, como no caminho sem intro (o "ganha vida" fica escondido; as formas mudam já com a arte à vista)
        var an = art.getAnimations ? art.getAnimations()[0] : null;
        var falta = an && an.effect && an.currentTime != null ? an.effect.getComputedTiming().delay - an.currentTime - 400 : 0;
        if (falta > 20) { setTimeout(begin, falta); return; }
      }
      started = true;
      wake();
    }

    draw(0);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[en.length - 1].isIntersecting; wake(); }).observe(art);
    }
    document.addEventListener('visibilitychange', wake);
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', wake);
    else if (reduceMotion.addListener) reduceMotion.addListener(wake);
    setTimeout(begin, 500);
  })();

  /* ---------- Leque das peças da campanha ----------
     Base: a galeria da seção 2 de siteflux-prototipo.html no estado de carrossel aberto
     (mesmas fórmulas de arco, escala, giro, balanço e deslize), sem o scroll preso.
     Um único estado: pos (centro contínuo, em peças). O deslize automático move pos; o mouse sobre
     uma peça pausa; arraste, clique/toque e Tab levam uma peça ao centro. A lista HTML é a única fonte das peças.
     2.36: o laço dorme quando nada se move (mouse em cima, foco, descanso depois de um gesto) e só desliza
     com o leque de fato na tela (35 %); o z-index só é escrito quando muda; o deslize ambiente desenha a até 60
     quadros por segundo (30 no toque), não a cada vsync, também em monitores de 144–240 Hz; as imagens só baixam quando o leque se aproxima da tela. */
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
    var coarse = window.matchMedia('(pointer: coarse)').matches;
    var QUADRO = coarse ? 1000 / 30 : 1000 / 60; // intervalo mínimo entre desenhos do deslize ambiente
    var pos = 0, phase = 0, last = 0, raf = 0, nap = 0;
    var hover = false, focus = false, inView = !('IntersectionObserver' in window);
    var boxW = 0, stageW = 0, stageH = 0, radiusX = 0, radiusY = 0, zs = [];
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
        if (zs[i] !== z) { c.style.zIndex = String(z); zs[i] = z; } // o z-index muda só na troca de ordem
      }
    }

    // anda se houver para onde (assentamento/arraste) ou se o leque estiver de fato na tela; com movimento reduzido, só o assentamento
    function canRun() { return (inView || drag || alvo !== null) && !document.hidden && (!still || alvo !== null); }
    function halt() {
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      if (nap) { clearTimeout(nap); nap = 0; }
    }
    function tick(now) {
      raf = 0;
      if (!canRun() || drag) return; // no arraste quem desenha é o pointermove; o fim do gesto acorda o laço
      // deslize ambiente num monitor de 144–240 Hz: o vsync depois da espera chegou antes do intervalo; espera o seguinte
      if (last && alvo === null && !still && !hover && !focus && now >= descanso && now - last < QUADRO - 1.5) { raf = requestAnimationFrame(tick); return; }
      var dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      if (alvo !== null) {
        // desliza até o alvo (peça clicada ou a mais próxima ao soltar) e para; com movimento reduzido chega de uma vez
        var falta = alvo - pos;
        if (still || Math.abs(falta) < 0.002) { pos = alvo; alvo = null; descanso = now + REST_MS; }
        else pos += falta * Math.min(1, 7 * dt);
        render();
      } else if (still || !inView || hover || focus) {
        return; // parado: sem quadros até algo mudar (mouse sai, foco sai, leque volta à tela)
      } else if (now < descanso) {
        nap = setTimeout(function () { nap = 0; wake(); }, Math.max(16, descanso - now)); // descanso: dorme até ele acabar
        return;
      } else {
        pos += DRIFT * dt; phase += 1.08 * dt;
        render();
        // o deslize ambiente anda ~20–30 px/s: 60 quadros por segundo (30 no toque) bastam. O próximo quadro só é pedido
        // perto do intervalo (a ~6 ms dele, menos que um vsync de 60 Hz); o teste no início de tick() segura o vsync que chega cedo
        nap = setTimeout(function () { nap = 0; raf = requestAnimationFrame(tick); }, Math.max(0, QUADRO - 6 - (performance.now() - now)));
        return;
      }
      raf = requestAnimationFrame(tick);
    }
    function wake() {
      if (!canRun()) { halt(); return; }
      if (nap) { clearTimeout(nap); nap = 0; }
      if (!raf) { last = 0; raf = requestAnimationFrame(tick); }
    }
    function irPara(i) { alvo = maisCurto(i); descanso = performance.now() + REST_MS; wake(); }

    // Cada peça vira um botão (Enter/Espaço = clique) que a centraliza.
    cards.forEach(function (li, i) {
      var im = li.querySelector('img');
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'card-btn';
      btn.setAttribute('aria-label', 'Centralizar peça ' + (i + 1) + ' de ' + n + (im && im.alt ? ': ' + im.alt : '')); // um nome só: ação + descrição da peça (o alt não se perde)
      while (li.firstChild) btn.appendChild(li.firstChild);
      li.appendChild(btn);
      btn.addEventListener('click', function (e) { if (engolir) { e.preventDefault(); return; } irPara(i); });
      // Tab: a peça focada vem para o centro (as das pontas ficam fora do recorte); o clique do mouse não é :focus-visible
      btn.addEventListener('focus', function () { try { if (btn.matches(':focus-visible')) irPara(i); } catch (err) { /* sem :focus-visible */ } });
    });
    // as peças giram para o centro: com o lazy nativo, as recortadas nas pontas ficariam em branco. Elas baixam todas juntas
    // quando o leque chega a uma tela e meia de distância (antes, baixavam na carga, ~470 KB num celular).
    var imgs = cards.map(function (li) { return li.querySelector('img'); }).filter(Boolean);
    var eager = function () {
      // as três que aparecem primeiro (a central e as vizinhas) vêm antes das quatro das pontas
      var c = mod(Math.round(pos));
      imgs.forEach(function (im, i) {
        var d = Math.min(mod(i - c), mod(c - i));
        if ('fetchPriority' in im) im.fetchPriority = d <= 1 ? 'high' : 'low';
        im.loading = 'eager';
      });
    };
    if ('IntersectionObserver' in window) {
      var near = new IntersectionObserver(function (en) {
        if (!en[en.length - 1].isIntersecting) return;
        near.disconnect(); eager();
      }, { rootMargin: '150% 0px' });
      near.observe(box);
    } else eager();
    box.classList.add('is-live');
    measure();

    // só o mouse EM CIMA DE UMA PEÇA pausa o deslize: o alvo real do ponteiro decide (cabeçalho, fundo do
    // leque ou qualquer coisa por cima das peças não contam). Toque nunca "sai", por isso só mouse.
    function semHover() { if (hover) { hover = false; wake(); } }
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var li = e.target && e.target.closest ? e.target.closest('.cards li') : null;
      if (li && stage.contains(li)) hover = true;
      else semHover();
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', semHover);
    window.addEventListener('blur', function () { semHover(); fimDoGesto(null); });
    window.addEventListener('scroll', semHover, { passive: true }); // ao rolar, a peça sai de baixo do mouse sem gerar pointermove
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
      if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0) || drag || root.classList.contains('is-pinca')) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, from: pos, on: false };
    });
    viewport.addEventListener('pointermove', function (e) {
      var d = drag;
      if (!d || e.pointerId !== d.id) return;
      if (e.pointerType === 'mouse' && !(e.buttons & 1)) { fimDoGesto(e); return; } // botão solto fora da janela
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
    box._fan = function () { return { pos: pos, drag: !!drag, on: !!(drag && drag.on), alvo: alvo, descansoEm: Math.round(descanso - performance.now()), hover: hover, focus: focus, raf: !!raf, nap: !!nap, still: still, inView: inView }; }; // sonda de QA (somente leitura)

    if ('IntersectionObserver' in window) {
      // o deslize ambiente só com 35 % do leque na tela: a borda que aparece sob a faixa seguinte fica parada
      new IntersectionObserver(function (en) { inView = en[en.length - 1].intersectionRatio >= 0.35; wake(); }, { threshold: [0, 0.35] }).observe(box);
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
     quando a janela é baixa demais para caber o tablet.
     2.36: a janela do aparelho tem a altura da moldura da vez e a legenda vem logo abaixo dela: some o vão entre
     a moldura e a legenda (178 px em 1920×1080, ~300 px no celular em retrato). O conjunto desce metade da sobra
     calculada com a maior das duas molduras, então a barra de controles não se move na troca computador ↔ celular
     (só a legenda desliza junto com a moldura). A legenda reserva a altura da maior entre os três tipos: trocar o
     tipo não muda o tamanho do aparelho. Os limiares usam media queries e a largura do layout (a pinça não liga nem
     desliga a história). Ligar ou desligar a história com o visitante dentro dela (girar o celular) devolve a leitura
     ao tablet, e um palco que muda de altura (tablet girado, janela mais baixa) mantém a etapa em que ele estava. */
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
    var fig = card.parentNode, bar = card.querySelector('.device-bar'), caption = sec.querySelector('.story-caption');
    var track = tracks[0], blocks = [], STEPS = 0;
    var on = false, step = -1, queued = false, offsets = [];
    var motion = [], lastScroll = window.scrollY;
    var room = 0, webWidth = 0, stageHeight = 0, scrollSpan = 1, capW = -1, capH = 0, synced = false, lastP = -1, memoP = -1, memoY = 0;
    var BEZEL = 20, WEB_MAX = 1440; // moldura de 10 px de cada lado; em telas grandes o tablet cresce até 1440 px (a altura manda)
    // mesmas condições do CSS: media queries e a largura do layout, que não mudam com a pinça nem com a barra do navegador
    var mqCompact = window.matchMedia('(max-width: 700px)'), mqAltura = window.matchMedia('(min-height: 420px)');
    var compact = mqCompact.matches, lastWidth = root.clientWidth, lastStableH = root.clientHeight;
    var updateRaf = 0, syncRaf = 0, measureRaf = 0, ro = null, sharedParts = [];
    var styleValues = new WeakMap();
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

    function fits() { return !reduceMotion.matches && mqAltura.matches; }
    function clamp(v) { return Math.min(1, Math.max(0, v)); }
    function cubic(t) { return 1 - Math.pow(1 - t, 3); }
    function write(el, key, value) {
      var values = styleValues.get(el);
      if (!values) { values = {}; styleValues.set(el, values); }
      if (values[key] !== value) { el.style[key] = value; values[key] = value; }
    }
    function cancelMotion() {
      motion.forEach(function (a) { a.onfinish = null; a.cancel(); });
      motion = [];
      card.classList.remove('is-morphing');
    }
    function writeCaptions(kind) {
      COPY[kind].forEach(function (c, i) {
        if (captions[i]) { captions[i].querySelector('h3').textContent = c[0]; captions[i].querySelector('p').textContent = c[1]; }
      });
    }
    // A legenda empilha as seis etapas na mesma célula: a altura é a do texto mais longo do tipo atual. Mede, uma vez por
    // largura, a maior entre os três tipos e a reserva; assim o orçamento do palco não muda ao trocar o tipo de site.
    function captionHeight() {
      if (!caption) return 0;
      var w = caption.clientWidth;
      if (w === capW) return capH;
      var kind = card.getAttribute('data-kind') || 'landing', max = 0;
      caption.style.minHeight = '';
      ['landing', 'loja', 'site'].forEach(function (k) { writeCaptions(k); max = Math.max(max, caption.offsetHeight); });
      writeCaptions(kind);
      capW = w; capH = max;
      caption.style.minHeight = max + 'px';
      return max;
    }
    function budgetStage() {
      // Desconta cada parte do palco uma única vez. A barra conserva a largura
      // do computador mesmo quando a moldura se transforma em celular.
      var cs = window.getComputedStyle(stage);
      stageHeight = stage.clientHeight;
      var available = Math.min(WEB_MAX, stage.clientWidth);
      var space = stageHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0)
        - (parseFloat(cs.rowGap) || 0) - captionHeight();
      write(fig, 'width', available + 'px');
      var free = 0;
      for (var pass = 0; pass < 3; pass++) {
        var margin = parseFloat(window.getComputedStyle(bar).marginBottom) || 0;
        free = Math.floor(space - bar.offsetHeight - margin);
        room = compact ? Math.min(free, Math.round(available * 1.2)) : free;
        webWidth = Math.floor(Math.min(available, Math.max(21, (room - BEZEL) * 1.89 + BEZEL)));
        if (fig.style.width === webWidth + 'px') break;
        write(fig, 'width', webWidth + 'px');
        // A nova largura pode levar os controles para duas linhas. Só essa
        // mudança exige uma segunda medição; nenhuma delas ocorre no scroll.
      }
      card.style.setProperty('--device-bar-h', (bar.offsetHeight + (parseFloat(window.getComputedStyle(bar).marginBottom) || 0)) + 'px');
      // O conjunto fica no alto do palco e desce metade da sobra calculada com a MAIOR das duas molduras: a barra com o
      // seletor computador/celular não sai de baixo do dedo na troca, e a legenda segue colada à moldura da vez.
      var mobW = Math.min(webWidth, 340, (room - BEZEL) * .53 + BEZEL);
      var tallest = Math.max((webWidth - BEZEL) / 1.89 + BEZEL, Math.min(room, (mobW - BEZEL) / .53 + BEZEL));
      write(fig, 'marginTop', Math.max(0, Math.floor((free - tallest) / 2)) + 'px');
      return room >= 180 && webWidth >= 140;
    }
    function layoutDevice(availableWidth) {
      var mobile = card.getAttribute('data-view') === 'mobile';
      var pinned = sec.classList.contains('is-story');
      var available = Math.max(120, typeof availableWidth === 'number' ? availableWidth : (pinned ? webWidth : view.clientWidth));
      var logicalWidth = mobile ? 300 : 960;
      var width, height;
      if (pinned) {
        width = mobile ? Math.min(available, 340, (room - BEZEL) * .53 + BEZEL) : Math.min(available, webWidth);
        height = mobile ? Math.min(room, (width - BEZEL) / .53 + BEZEL) : (width - BEZEL) / 1.89 + BEZEL;
        write(view, 'height', Math.ceil(height) + 'px'); // a janela do aparelho tem a altura da moldura da vez
      } else {
        write(view, 'height', '');
        width = mobile ? Math.min(available, 320) : available;
      }
      width = Math.max(BEZEL + 1, width);
      var screenScale = (width - BEZEL) / logicalWidth;
      write(screen, 'width', logicalWidth + 'px');
      write(screen, 'height', pinned ? ((height - BEZEL) / screenScale) + 'px' : 'auto');
      write(screen, 'transform', 'scale(' + screenScale + ')');
      write(screen, 'borderRadius', ((mobile ? 20 : 14) / screenScale) + 'px');
      write(frame, 'width', width + 'px');
      var finalHeight = (pinned ? height : Math.ceil(track.offsetHeight * screenScale) + BEZEL) + 'px';
      write(frame, 'height', finalHeight);
      if (card.style.getPropertyValue('--device-frame-h') !== finalHeight) card.style.setProperty('--device-frame-h', finalHeight);
    }
    function captureDevice() {
      var sr = screen.getBoundingClientRect();
      return {
        frame: bezel.getBoundingClientRect(), screen: sr, scale: sr.width / screen.offsetWidth,
        paper: paper.getBoundingClientRect(),
        radius: window.getComputedStyle(frame).borderRadius,
        barTop: bar.getBoundingClientRect().top, capTop: caption ? caption.getBoundingClientRect().top : 0,
        parts: sharedParts.map(function (el) {
          var r = el.getBoundingClientRect();
          return { el: el, rect: r, visible: r.width > 0 && r.height > 0 && r.bottom >= sr.top && r.top <= sr.bottom };
        })
      };
    }
    function setView(next) {
      if (next === card.getAttribute('data-view')) return;
      var animate = !reduceMotion.matches && !!frame.animate;
      var before = animate ? captureDevice() : null;
      var available = on ? webWidth : view.clientWidth;
      cancelMotion();
      card.setAttribute('data-view', next);
      // Atributo e largura lógica mudam no mesmo lote. Uma leitura aqui faria
      // o browser compor o layout mobile com a largura desktop intermediária.
      layoutDevice(available);
      measure();
      if (on) update();
      if (!animate) return;
      var after = captureDevice(), a = before.frame, b = after.frame;
      if (!a.width || !b.width) return;
      var sx = a.width / b.width, sy = a.height / b.height;
      var duration = compact ? 420 : 560;
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
      // a legenda acompanha a moldura nova e desliza junto com ela (a barra fica onde está; se mudar, desliza também)
      [[bar, before.barTop - after.barTop], [caption, before.capTop - after.capTop]].forEach(function (m) {
        if (m[0] && Math.abs(m[1]) > 0.5) motion.push(m[0].animate([{ transform: 'translateY(' + m[1].toFixed(1) + 'px)' }, { transform: 'none' }], timing));
      });
      var movedParts = 0;
      after.parts.forEach(function (part) {
        var prev = before.parts.filter(function (p) { return p.el === part.el; })[0];
        if (!prev || !prev.visible || !part.visible || movedParts >= (compact ? 4 : 8)) return;
        var localX = (part.rect.left - after.screen.left) / after.scale;
        var localY = (part.rect.top - after.screen.top) / after.scale;
        var dx = (prev.rect.left - before.screen.left) / before.scale - localX;
        var dy = (prev.rect.top - before.screen.top) / before.scale - localY;
        var size = (prev.rect.width / before.scale) / (part.rect.width / after.scale);
        if (Math.abs(dx) < .5 && Math.abs(dy) < .5 && Math.abs(size - 1) < .005) return;
        movedParts++;
        // Uniform scaling retains the proportions of type and illustrations.
        motion.push(part.el.animate([
          { transformOrigin: '0 0', transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + size + ')' },
          { transformOrigin: '0 0', transform: 'none' }
        ], timing));
      });
      var startedAt = document.timeline.currentTime;
      motion.forEach(function (animation) { animation.startTime = startedAt; });
      frameMotion.onfinish = cancelMotion;
    }
    function setStep(s) {
      if (s === step) return;
      step = s;
      sec.setAttribute('data-step', String(s));
      captions.forEach(function (li, i) { li.classList.toggle('is-on', i === Math.max(0, s - 1)); });
    }
    function update() {
      if (updateRaf) cancelAnimationFrame(updateRaf);
      queued = false;
      updateRaf = 0;
      if (!on) return;
      var r = pin.getBoundingClientRect(), vh = stageHeight;
      lastP = clamp(-r.top / scrollSpan); // 0 antes da história, 1 depois dela (também quando está longe)
      if (r.top > vh * 1.2 || r.bottom < -vh * 0.2) return; // longe da tela: nada a fazer

      // Entrada contida: a transformação principal responde ao seletor de dispositivo.
      var preRoll = Math.min(Math.max(vh * 0.6, 300), 650);
      var settle = clamp((preRoll - r.top) / preRoll), eased = cubic(settle);
      write(card, 'transform', 'translateY(' + (20 * (1 - settle)).toFixed(1) + 'px)');
      write(card, 'opacity', Math.min(1, eased * 1.9).toFixed(3));

      // preso: o progresso monta os blocos em sequência e rola a tela por dentro
      var p = clamp(-r.top / scrollSpan), pos = p * STEPS;
      blocks.forEach(function (b, i) {
        // o primeiro bloco chega junto com o tablet; os demais, cada um no seu trecho de scroll
        var local = i === 0 ? clamp((eased - 0.45) / 0.55) : clamp((pos - i + 0.35) / 0.5);
        var value = cubic(local), progress = value.toFixed(3);
        if (compact) {
          // No celular a peça inteira se monta. O scroll não invalida máscaras,
          // traços SVG e estilos herdados por todos os seus descendentes.
          write(b, 'opacity', Math.min(1, value * 2.5).toFixed(3));
          write(b, 'transform', 'translateY(' + ((1 - value) * 16).toFixed(1) + 'px)');
          write(b, 'willChange', local > 0 && local < 1 ? 'transform, opacity' : '');
        } else if (b.style.getPropertyValue('--b') !== progress) b.style.setProperty('--b', progress);
      });
      // a tela rola por dentro para manter o bloco da vez no meio (chega um pouco antes de ele se montar)
      var f = Math.min(STEPS - 1, Math.max(0, pos - 0.25)), k = Math.floor(f), t = f - k;
      t = t * t * (3 - 2 * t);
      var off = offsets.length ? offsets[k] + ((offsets[Math.min(STEPS - 1, k + 1)] || 0) - offsets[k]) * t : 0;
      write(track, 'transform', 'translateY(' + (-off).toFixed(1) + 'px)');
      setStep(settle < 0.6 ? 0 : Math.min(STEPS, 1 + Math.floor(pos)));
    }
    function queue() { if (on && !queued) { queued = true; updateRaf = requestAnimationFrame(update); } }
    function measure() {
      if (measureRaf) cancelAnimationFrame(measureRaf);
      measureRaf = 0;
      if (!on) { layoutDevice(); return; }
      // offsetHeight, não scrollHeight: um bloco ainda entrando (deslocado para baixo pelo transform) estica o scrollHeight e
      // a tela rolava além do fim do site, deixando uma faixa branca sob o rodapé
      var max = Math.max(0, track.offsetHeight - screen.clientHeight - 1), sh = screen.clientHeight; // 1 px de folga: nunca sobra fresta
      scrollSpan = Math.max(1, pin.offsetHeight - stageHeight);
      // bloco que cabe na tela fica no meio; bloco mais alto que a tela (celular) começa pelo topo
      offsets = blocks.map(function (b) { var h = b.offsetHeight; return Math.min(max, Math.max(0, h > sh ? b.offsetTop : b.offsetTop + h / 2 - sh / 2)); });
      queue();
    }
    function queueMeasure() { if (!measureRaf) measureRaf = requestAnimationFrame(measure); }
    function resetBuild() {
      tracks.forEach(function (t) {
        write(t, 'transform', '');
        Array.prototype.forEach.call(t.querySelectorAll('.wire-block'), function (b) {
          b.style.removeProperty('--b'); write(b, 'opacity', ''); write(b, 'transform', ''); write(b, 'willChange', '');
        });
      });
    }
    function sync() {
      if (syncRaf) { cancelAnimationFrame(syncRaf); syncRaf = 0; }
      cancelMotion();
      // ligar ou desligar a história muda a seção em milhares de px (girar o celular, janela mais baixa): se o tablet
      // estava na tela, a leitura volta para ele em vez de a página cair em outra seção. "Dentro" também vale pelo último
      // progresso lido na rolagem: quando o sync roda, a ancoragem do navegador já pode ter levado a seção para longe do meio.
      var prevP = lastP; // etapa da história até aqui (0–1 dentro dela; -1 desligada); update() a reescreve
      var pr = pin.getBoundingClientRect(), mid = window.innerHeight / 2;
      // e, com uma etapa guardada (a história desligou com o visitante dentro), enquanto ele não se afastou do ponto em que ficou
      var guardada = memoP > 0 && Math.abs(window.scrollY - memoY) < window.innerHeight / 2;
      var dentro = (pr.top < mid && pr.bottom > mid) || (prevP > 0 && prevP < 1) || guardada, antes = on;
      var nextCompact = mqCompact.matches;
      if (nextCompact !== compact) resetBuild();
      compact = nextCompact;
      lastWidth = root.clientWidth;
      lastStableH = root.clientHeight;
      sec.classList.toggle('is-compact-motion', compact);
      var want = fits();
      // a história só vale se o palco inteiro (topo, tablet e legenda) couber na janela; senão (ex.: 390 × 480, paisagem
      // num celular) a seção rola normalmente, sem o tablet ficar preso por baixo do cabeçalho
      if (want) {
        sec.classList.add('is-story');
        want = budgetStage();
      }
      sec.classList.toggle('is-story', want);
      if (want !== on) {
        on = want;
        step = -1;
        if (!on) {
          lastP = -1;
          sec.removeAttribute('data-step');
          write(card, 'transform', ''); write(card, 'opacity', '');
          resetBuild();
          captions.forEach(function (li) { li.classList.remove('is-on'); });
        }
      }
      if (!on) { write(fig, 'width', ''); write(fig, 'marginTop', ''); }
      layoutDevice();
      if (on) { measure(); update(); }
      // só depois da primeira sincronização: na carga (inclusive por um link #recursos) a posição é a que o navegador escolheu
      var y = null;
      if (synced && dentro && on !== antes) {
        if (!on) {
          // desligou (celular deitado): topo do tablet parado, abaixo do cabeçalho (o scroll-padding que as âncoras usam);
          // a etapa fica guardada para quando a história voltar
          memoP = prevP > 0 && prevP < 1 ? prevP : -1;
          y = window.scrollY + pin.getBoundingClientRect().top - (parseFloat(getComputedStyle(root).scrollPaddingTop) || 0);
        } else {
          // religou (de volta ao retrato): a mesma etapa em que a leitura estava, ou o começo da história
          y = window.scrollY + pin.getBoundingClientRect().top + (guardada && memoP < 1 ? memoP * scrollSpan : 0);
          memoP = -1;
        }
      } else if (synced && on && antes && prevP > 0 && prevP < 1) {
        // continuou ligada, mas o palco mudou de altura (tablet girado, janela mais baixa): mesma etapa da montagem
        y = window.scrollY + pin.getBoundingClientRect().top + prevP * scrollSpan;
        if (Math.abs(y - window.scrollY) <= 1) y = null;
      }
      if (y !== null) {
        root.style.scrollBehavior = 'auto'; // o html rola com smooth: aqui é um reposicionamento, não uma animação
        window.scrollTo(0, Math.max(0, Math.round(y)));
        root.style.scrollBehavior = '';
        lastScroll = window.scrollY;
        if (memoP > 0) memoY = window.scrollY; // ponto em que a leitura ficou com a história desligada
      }
      synced = true;
    }
    function queueSync() { if (!syncRaf) syncRaf = requestAnimationFrame(sync); }
    function resync() { capW = -1; queueSync(); } // fonte carregada: as legendas podem ter mudado de altura

    // troca o tipo de site: mostra a trilha escolhida e reescreve balões e legendas
    function setKind(kind) {
      var next = tracks.filter(function (t) { return t.getAttribute('data-track') === kind; })[0];
      if (!next || !COPY[kind]) return;
      cancelMotion();
      if (ro) ro.unobserve(track);
      tracks.forEach(function (t) { t.hidden = t !== next; });
      track = next;
      if (ro) ro.observe(track);
      blocks = Array.prototype.slice.call(track.querySelectorAll('.wire-block'));
      sharedParts = Array.prototype.slice.call(track.querySelectorAll(sharedSelector));
      STEPS = blocks.length;
      card.setAttribute('data-kind', kind);
      COPY[kind].forEach(function (c, i) { if (balloons[i]) balloons[i].lastChild.nodeValue = c[0]; });
      writeCaptions(kind);
      sync(); // a altura reservada da legenda já cobre os três tipos: o aparelho não muda de tamanho
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
    setKind('landing'); // já sincroniza (antes havia um segundo sync() idêntico na carga)

    window.addEventListener('scroll', function () {
      if (motion.length && Math.abs(window.scrollY - lastScroll) > 2) cancelMotion();
      lastScroll = window.scrollY;
      if (memoP > 0 && Math.abs(lastScroll - memoY) > window.innerHeight) memoP = -1; // saiu do tablet: a etapa guardada perde o sentido
      queue();
    }, { passive: true });
    window.addEventListener('resize', function () {
      // A barra do navegador móvel altera innerHeight durante o scroll; clientWidth/clientHeight do layout e o palco
      // em svh não mudam com ela. Só recalcula quando a largura, o palco ou a altura estável realmente mudam
      // (com a história desligada por falta de altura, cada resize ligava e desligava .is-story à toa).
      // resync: a legenda muda de altura com a janela (@media max-height) mesmo quando a largura dela não muda
      if (root.clientWidth !== lastWidth || (on && stage.clientHeight !== stageHeight) || (!on && fits() && root.clientHeight !== lastStableH)) resync();
    });
    window.addEventListener('load', resync);
    // a altura do site dentro do tablet muda com a largura e com a fonte carregada: remede
    if ('ResizeObserver' in window) { ro = new ResizeObserver(queueMeasure); ro.observe(track); ro.observe(screen); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(resync);
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', sync);
    else if (reduceMotion.addListener) reduceMotion.addListener(sync);
    window.addEventListener('pagehide', function () {
      cancelMotion();
      cancelAnimationFrame(updateRaf); cancelAnimationFrame(syncRaf); cancelAnimationFrame(measureRaf);
      updateRaf = syncRaf = measureRaf = 0; queued = false;
    });
  })();

  /* ---------- Processo: linha → progresso → estrutura ----------
     Scroll natural, sem prender a seção. Cada etapa assenta apenas 20 px, fica azul e alimenta a linha.
     A posição de scroll governa também a volta; movimento reduzido mostra o estado completo.
     2.36: a altura de referência é a do layout (a barra do navegador não adianta nem atrasa uma etapa), o resize
     é agrupado num quadro e a medição desconta o deslocamento guardado em vez de desfazer o transform. */
  (function bento() {
    var pin = document.querySelector('[data-bento]');
    if (!pin) return;
    var grid = pin.querySelector('[data-bento-grid]');
    var tiles = Array.prototype.slice.call(pin.querySelectorAll('[data-fly]')).map(function (el) {
      var v = (el.getAttribute('data-fly') || '0,0,0,0').split(',').map(Number);
      return { el: el, x: v[0] || 0, y: v[1] || 0, i: v[3] || 0, top: 0, dy: 0, done: false };
    }).sort(function (a, b) { return a.i - b.i; });
    if (!grid || !tiles.length) return;
    var steps = tiles.filter(function (t) { return t.el.classList.contains('step'); }); // já na ordem de i
    var N = tiles.length, STEP = 0.78 / Math.max(1, N - 1), SPAN = 0.22; // a última peça termina em p = 1
    var wide = window.matchMedia('(min-width: 1101px)');
    var on = false, queued = false, syncQueued = false;

    function clamp(v) { return Math.min(1, Math.max(0, v)); }
    function ease(t) { return 1 - Math.pow(1 - t, 4); }
    // u = progresso LINEAR da peça (0 = fora, 1 = assentada): governa a lógica (cor, ordem); o easing só serve ao desenho
    function place(t, u, x, y) {
      if (u > 1 - 0.000001) u = 1; // a última janela pode terminar em 0.9999999999999999
      var k = 1 - ease(u);
      t.done = u >= 1;
      t.dy = +(y * k).toFixed(1);
      t.el.style.transform = 'translate3d(' + (x * k).toFixed(1) + 'px,' + t.dy + 'px,0)';
      t.el.style.setProperty('--step-p', u.toFixed(4));
      t.el.style.willChange = u > 0 && u < 1 ? 'transform' : '';
    }
    function update() {
      queued = false;
      if (!on) return;
      var vh = root.clientHeight;
      var g = grid.getBoundingClientRect();
      if (wide.matches) {
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
      if (!steps.length) return;
      steps.forEach(function (t) { t.el.classList.toggle('is-done', t.done); });
      pin.classList.toggle('is-all', steps.every(function (t) { return t.done; }));
    }
    function queue() { if (!queued) { queued = true; requestAnimationFrame(update); } }
    function measure() { // posição de cada peça dentro do painel, sem contar o deslocamento que o próprio script aplicou
      var g = grid.getBoundingClientRect();
      tiles.forEach(function (t) { t.top = t.el.getBoundingClientRect().top - g.top - t.dy; });
    }
    function sync() {
      syncQueued = false;
      var want = !reduceMotion.matches;
      if (want !== on) {
        on = want;
        pin.classList.toggle('is-fly', on);
        if (!on) {
          tiles.forEach(function (t) { t.dy = 0; t.done = false; t.el.style.transform = ''; t.el.style.willChange = ''; t.el.style.removeProperty('--step-p'); t.el.classList.remove('is-done'); });
          pin.classList.remove('is-all');
          pin.style.removeProperty('--bento-p');
        }
      }
      if (on) { measure(); update(); }
    }
    function queueSync() { if (!syncQueued) { syncQueued = true; requestAnimationFrame(sync); } }

    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queueSync);
    window.addEventListener('load', queueSync);
    if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', sync);
    else if (reduceMotion.addListener) reduceMotion.addListener(sync);
    sync();
  })();

  /* ---------- FAQ: abrir/recolher em um único gesto ----------
     O <details> nativo continua sendo a base (e o que vale sem JS). Aqui a resposta é embrulhada em .faq-a > .faq-a-inner
     para a altura animar por grid-template-rows; .is-open comanda o visual e o atributo open só sai DEPOIS de a altura
     fechar, senão o conteúdo sumiria de uma vez. Um cartão aberto por vez (o atributo name sai: ele fecharia os outros
     sem animação). 2.36: o navegador também abre um <details> sozinho (Ctrl+F, links #:~:text= do Google); o evento
     toggle traz esse caso para o mesmo estado visual, senão a resposta ficava aberta com altura 0. */
  (function faq() {
    var list = document.querySelector('.faq-list');
    var items = list ? Array.prototype.slice.call(list.querySelectorAll('details')) : [];
    if (!items.length || !('gridTemplateRows' in document.documentElement.style)) return;
    function abre(d) {
      items.forEach(function (o) { if (o !== d) fechar(o); });
      if (d._cancelClose) d._cancelClose();
      d.open = true; void d.offsetHeight; d.classList.add('is-open');
      // o cartão aberto é escuro: se estiver sob o topo, o tom muda sem rolagem (lido depois da transição de .28 s)
      setTimeout(queueTone, reduceMotion.matches ? 0 : 360);
    }
    items.forEach(function (d) {
      var summary = d.querySelector('summary'), wrap = document.createElement('div'), inner = document.createElement('div');
      wrap.className = 'faq-a'; inner.className = 'faq-a-inner';
      Array.prototype.slice.call(d.childNodes).forEach(function (node) { if (node !== summary) inner.appendChild(node); });
      wrap.appendChild(inner); d.appendChild(wrap);
      d.removeAttribute('name');
      if (d.open) d.classList.add('is-open');
      summary.addEventListener('click', function (e) {
        e.preventDefault();
        if (d.classList.contains('is-open')) fechar(d); else abre(d);
      });
      // aberto pelo navegador (busca na página, fragmento de texto): nos caminhos do próprio script .is-open já está lá
      d.addEventListener('toggle', function () { if (d.open && !d.classList.contains('is-open')) abre(d); });
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
      function finish() { cleanup(); if (!d.classList.contains('is-open')) d.open = false; queueTone(); } // tom lido com o cartão já fechado
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

  /* ---------- Indicação da seção atual na navegação ----------
     Sem marca visual (a cortina não mostra seção atual), mas o leitor de tela anuncia "atual". 2.36: a hero e o
     CTA final também são observados; fora das seções do menu nenhum link fica marcado. */
  var links = Array.prototype.slice.call(document.querySelectorAll('#siteNav a[href^="#"]:not(.btn)'));
  var sections = links
    .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
    .filter(Boolean);
  if (sections.length && 'IntersectionObserver' in window) {
    var neutras = [document.getElementById('inicio'), document.querySelector('.final')].filter(Boolean);
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = sections.indexOf(entry.target) > -1 ? entry.target.id : '';
        links.forEach(function (a) {
          if (id && a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.concat(neutras).forEach(function (s) { spy.observe(s); });
  }
})();
