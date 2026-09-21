/* Siteflux — camada "personalidade" (revisão 2.4).
   Sem este arquivo as pastas de #projetos seguem completas: leque e deslize da capa são CSS, e "Explorar projeto" é um
   <details> nativo com a descrição e as cinco telas. Aqui: (1) a galeria em tela cheia de cada projeto, lida desse mesmo
   <details>; (2) a contagem de telas e o carregamento adiantado da segunda tela da capa (só ponteiro fino); (3) o sumiço do ícone de imagem quebrada nas capas decorativas;
   (4) as letras em rolagem dos links curtos da navegação desktop. */
(function () {
  'use strict';

  var STEP_MS = 18, CAP_MS = 130; // atraso por letra, com teto para o conjunto

  function graphemes(text) {
    if (window.Intl && Intl.Segmenter) {
      var out = [], it = new Intl.Segmenter('pt', { granularity: 'grapheme' }).segment(text)[Symbol.iterator](), s;
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
     Um índice governa tela, miniatura, contador e legenda — e todos só mudam quando a imagem nova aparece de fato:
     a troca usa duas camadas depois de a próxima imagem decodificar; um token descarta carregamentos antigos;
     se a imagem falhar ficam a última tela válida e a informação dela (a miniatura é marcada). Se nem a primeira
     carregar, a moldura traz um aviso e as miniaturas seguem disponíveis — nunca um modal vazio.
     ------------------------------------------------------------------ */
  var ICON_X = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_PREV = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7"/></svg>';
  var ICON_NEXT = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7"/></svg>';
  var SIZES = '(max-width: 899px) 92vw, 66vw';
  var gal = null;

  function buildGallery() {
    var d = document.createElement('dialog');
    d.className = 'galeria';
    d.setAttribute('aria-labelledby', 'galeria-titulo');
    d.innerHTML =
      '<div class="galeria-in">' +
        '<div class="galeria-topo"><p class="galeria-tipo"></p><button class="galeria-fechar" type="button">Fechar' + ICON_X + '</button></div>' +
        '<h3 class="galeria-titulo" id="galeria-titulo"></h3>' +
        '<div class="galeria-anel" aria-hidden="true"><div class="ga-palco"><div class="ga-giro"></div></div><i class="ga-regua"></i></div>' +
        '<div class="galeria-palco"><div class="galeria-moldura"><div class="galeria-barra" aria-hidden="true"><i></i><i></i><i></i></div>' +
          '<div class="galeria-tela"><img alt="" decoding="async" /><img alt="" decoding="async" />' +
          '<p class="galeria-aviso" hidden><b>Esta tela não carregou.</b><span>Escolha outra nas miniaturas abaixo.</span></p></div></div>' +
          '<p class="galeria-conta" aria-live="polite"><b></b><span></span></p>' +
          '<div class="galeria-nav"><button class="galeria-seta" type="button" data-dir="-1" aria-label="Tela anterior">' + ICON_PREV + '</button>' +
          '<ul class="galeria-minis" aria-label="Telas do projeto"></ul>' +
          '<button class="galeria-seta" type="button" data-dir="1" aria-label="Próxima tela">' + ICON_NEXT + '</button>' +
          '<button class="galeria-ampliar" type="button" aria-pressed="false">Ampliar tela</button></div></div>' +
        '<p class="galeria-desc"></p>' +
      '</div>';
    document.body.appendChild(d);
    var g = {
      el: d, tipo: d.querySelector('.galeria-tipo'), titulo: d.querySelector('.galeria-titulo'), desc: d.querySelector('.galeria-desc'),
      num: d.querySelector('.galeria-conta b'), legenda: d.querySelector('.galeria-conta span'), minis: d.querySelector('.galeria-minis'),
      layers: d.querySelectorAll('.galeria-tela img'), palco: d.querySelector('.galeria-palco'), tela: d.querySelector('.galeria-tela'),
      aviso: d.querySelector('.galeria-aviso'), ampliar: d.querySelector('.galeria-ampliar'),
      slides: [], buttons: [], index: -1, shown: -1, front: 0, token: 0, opener: null,
      anel: { box: d.querySelector('.galeria-anel'), palco: d.querySelector('.ga-palco'), giro: d.querySelector('.ga-giro'), regua: d.querySelector('.ga-regua'), paineis: [], n: 0, R: 0, ang: 0, alvo: 0, raf: 0, drag: null }
    };
    ringBind(g);
    d.querySelector('.galeria-fechar').addEventListener('click', function () { closeGallery(); });
    Array.prototype.forEach.call(d.querySelectorAll('.galeria-seta'), function (btn) {
      btn.addEventListener('click', function () { go(g.index + Number(btn.getAttribute('data-dir'))); });
    });
    g.ampliar.addEventListener('click', function () { setZoom(!g.tela.classList.contains('is-zoom')); });
    d.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) { return; }
      if (e.key === 'ArrowRight') { go(g.index + 1); e.preventDefault(); }
      else if (e.key === 'ArrowLeft') { go(g.index - 1); e.preventDefault(); }
      else if (e.key === 'Home') { go(0); e.preventDefault(); }
      else if (e.key === 'End') { go(g.slides.length - 1); e.preventDefault(); }
    });
    d.addEventListener('cancel', function (e) { e.preventDefault(); closeGallery(); }); // Esc passa pela mesma saída
    d.addEventListener('close', function () {
      document.documentElement.classList.remove('galeria-aberta');
      d.classList.remove('is-closing');
      setZoom(false);
      if (g.opener && g.opener.focus) { g.opener.focus({ preventScroll: true }); }
    });
    // swipe horizontal na tela; o gesto vertical continua rolando a galeria (touch-action: pan-y). Ampliada, o arrasto é do zoom.
    var sx = null, sy = null;
    g.palco.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse' && !g.tela.classList.contains('is-zoom')) { sx = e.clientX; sy = e.clientY; } });
    g.palco.addEventListener('pointerup', function (e) {
      if (sx === null) { return; }
      var dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) { go(g.index + (dx < 0 ? 1 : -1)); }
    });
    g.palco.addEventListener('pointercancel', function () { sx = null; });
    return g;
  }

  /* "Ampliar tela" (só aparece até 899 px): a captura desktop cresce dentro da moldura e rola nos dois eixos; o slide não muda */
  function setZoom(on) {
    var g = gal;
    if (!g) { return; }
    g.tela.classList.toggle('is-zoom', !!on);
    g.ampliar.setAttribute('aria-pressed', String(!!on));
    g.ampliar.textContent = on ? 'Reduzir tela' : 'Ampliar tela';
    if (!on) { g.tela.scrollLeft = 0; g.tela.scrollTop = 0; }
  }

  /* ------------------------------------------------------------------
     Anel cilíndrico dentro da galeria (skill galeria-anel-cilindrico). De um lado, todas as telas do projeto numa faixa 3D
     aberta, de eixo vertical, vista um pouco de cima (aparece a faixa de trás, espelhada e escurecida); do outro, a tela
     normal. Cada tela entra duas vezes para o anel fechar bem mesmo com poucas telas, e cada painel é fatiado em tiras
     para a faixa ficar lisa. O anel não tem estado próprio de "qual tela": ele segue g.index (setas, teclado, miniaturas)
     e, quando é arrastado, pede a tela mais próxima da frente por go(). É decorativo para leitores de tela (aria-hidden):
     as miniaturas e as setas continuam sendo o caminho acessível. Some com movimento reduzido.
     ------------------------------------------------------------------ */
  var RING_SLICES = 8;
  function ringNorm(a) { return ((a + 180) % 360 + 360) % 360 - 180; }
  function ringBuild(g) {
    var r = g.anel, n = g.slides.length;
    r.giro.textContent = ''; r.paineis = []; r.n = 0;
    var off = window.matchMedia('(prefers-reduced-motion: reduce)').matches || n < 2 || !('transformStyle' in document.documentElement.style);
    r.box.hidden = off;
    if (off) { return; }
    var copias = n < 8 ? 2 : 1; // poucas telas: cada uma entra duas vezes e o anel fecha redondo
    r.n = n * copias;
    for (var k = 0; k < r.n; k++) {
      var sl = g.slides[k % n], painel = document.createElement('div');
      var src = (sl.srcset.split(',')[0] || sl.src).trim().split(' ')[0]; // o arquivo de 600 px basta para o anel
      painel.className = 'ga-painel';
      for (var t = 0; t < RING_SLICES; t++) {
        var tira = document.createElement('i');
        tira.style.backgroundImage = 'linear-gradient(rgba(0,0,0,var(--d,0)),rgba(0,0,0,var(--d,0))),url("' + src + '")';
        painel.appendChild(tira);
      }
      r.giro.appendChild(painel);
      r.paineis.push({ el: painel, a: k * 360 / r.n });
    }
    r.ang = 0; r.alvo = 0;
    ringMeasure(g);
  }
  function ringMeasure(g) {
    var r = g.anel;
    if (!r.n || r.box.hidden) { return; }
    var W = r.regua.offsetWidth || 260, gap = W * 0.07, arco = W + gap, H = W / 1.6, sw = W / RING_SLICES, porPx = 360 / (r.n * arco);
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
    r.paineis.forEach(function (pn) { // os painéis de trás escurecem
      var c = Math.cos((pn.a + r.ang) * Math.PI / 180);
      pn.el.style.setProperty('--d', (0.7 * (1 - (c + 1) / 2)).toFixed(3));
    });
  }
  function ringTo(g, i) { // gira pelo caminho mais curto até a cópia mais próxima da tela i
    var r = g.anel, n = g.slides.length;
    if (!r.n || r.box.hidden) { return; }
    var best = r.ang, dist = Infinity;
    for (var k = i; k < r.n; k += n) { var alvo = r.ang + ringNorm(-r.paineis[k].a - r.ang); if (Math.abs(alvo - r.ang) < dist) { dist = Math.abs(alvo - r.ang); best = alvo; } }
    r.alvo = best;
    if (!r.raf) { r.raf = requestAnimationFrame(function passo() {
      r.raf = 0;
      if (r.drag && r.drag.moved) { return; }
      var falta = r.alvo - r.ang;
      r.ang += falta * 0.14;
      if (Math.abs(falta) < 0.05) { r.ang = r.alvo; ringRender(g); return; }
      ringRender(g);
      r.raf = requestAnimationFrame(passo);
    }); }
  }
  function ringBind(g) {
    var r = g.anel;
    r.palco.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) { return; }
      r.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, from: r.ang, moved: false };
    });
    r.palco.addEventListener('pointermove', function (e) {
      var d = r.drag;
      if (!d || e.pointerId !== d.id) { return; }
      var dx = e.clientX - d.x, dy = e.clientY - d.y;
      if (!d.moved) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) { return; }
        d.moved = true; r.box.classList.add('is-arrastando');
        try { r.palco.setPointerCapture(d.id); } catch (err) {}
      }
      r.ang = d.from + dx * (160 / Math.max(260, r.palco.clientWidth)); // pixels → graus, limitado pela largura do palco
      ringRender(g);
    });
    var soltar = function (e) {
      var d = r.drag;
      if (!d || (e && e.pointerId !== d.id)) { return; }
      r.drag = null; r.box.classList.remove('is-arrastando');
      var n = g.slides.length, best = 0, dist = Infinity;
      if (!d.moved) { // clique sem arraste: metade esquerda volta uma tela, metade direita avança
        var box = r.palco.getBoundingClientRect();
        if (e && e.type === 'pointerup') { go(g.index + (e.clientX < box.left + box.width / 2 ? -1 : 1)); }
        return;
      }
      r.paineis.forEach(function (pn, k) { var dd = Math.abs(ringNorm(pn.a + r.ang)); if (dd < dist) { dist = dd; best = k; } });
      if (best % n === g.index) { ringTo(g, g.index); } else { go(best % n); }
    };
    r.palco.addEventListener('pointerup', soltar);
    r.palco.addEventListener('pointercancel', soltar);
    r.palco.addEventListener('dragstart', function (e) { e.preventDefault(); });
    window.addEventListener('resize', function () { if (g.el.open) { ringMeasure(g); } });
  }

  function pad2(n) { return ('0' + n).slice(-2); }

  function go(i) {
    var g = gal, n = g.slides.length;
    if (!n) { return; }
    i = ((i % n) + n) % n; // dá a volta nas pontas
    if (i === g.index) { return; }
    g.index = i; // o pedido; g.shown é o que está na tela
    ringTo(g, i); // o anel gira na hora para a tela pedida
    var slide = g.slides[i], token = ++g.token;
    g.buttons.forEach(function (b, k) { b.classList.toggle('is-loading', k === i && k !== g.shown); });
    var loader = new Image();
    loader.onload = function () {
      var show = function () {
        if (token !== g.token) { return; } // chegou tarde: outra tela já foi pedida
        setZoom(false);
        var back = g.layers[1 - g.front];
        back.srcset = slide.srcset; back.sizes = SIZES; back.src = slide.src; back.alt = slide.alt;
        g.layers[g.front].classList.remove('is-on'); g.layers[g.front].alt = '';
        back.classList.add('is-on');
        g.front = 1 - g.front;
        // só agora miniatura, contador e legenda passam a falar desta tela
        g.shown = i; g.aviso.hidden = true;
        g.buttons.forEach(function (b, k) { b.setAttribute('aria-pressed', String(k === i)); b.classList.remove('is-loading'); });
        g.num.textContent = pad2(i + 1) + ' / ' + pad2(n);
        g.legenda.textContent = slide.label;
      };
      // decode() evita o engasgo na troca, mas pode demorar a resolver sem quadros novos na tela: não seguramos a tela por ele
      var shown = false, once = function () { if (!shown) { shown = true; show(); } };
      if (loader.decode) { loader.decode().then(once, once); setTimeout(once, 280); } else { once(); }
    };
    loader.onerror = function () {
      if (token !== g.token) { return; }
      g.buttons[i].classList.add('is-erro'); g.buttons[i].classList.remove('is-loading');
      if (g.shown < 0) { // nem a primeira carregou: aviso útil, miniaturas e Fechar continuam
        g.aviso.hidden = false; g.num.textContent = '— / ' + pad2(n); g.legenda.textContent = 'Tela indisponível';
      }
      g.index = g.shown; // setas e teclado continuam a partir da tela que está visível
    };
    loader.srcset = slide.srcset; loader.sizes = SIZES; loader.src = slide.src;
    var nextSlide = g.slides[(i + 1) % n]; // pré-carrega só a próxima
    if (nextSlide && n > 1) { var pre = new Image(); pre.srcset = nextSlide.srcset; pre.sizes = SIZES; pre.src = nextSlide.src; }
  }

  function openGallery(li, opener) {
    if (!gal) { gal = buildGallery(); }
    var g = gal, cs = getComputedStyle(li);
    ['bg', 'soft', 'fg', 'mut', 'acc', 'line'].forEach(function (k) {
      var v = cs.getPropertyValue('--p-' + k).trim();
      if (v) { g.el.style.setProperty('--g-' + k, v); } else { g.el.style.removeProperty('--g-' + k); }
    });
    g.titulo.textContent = li.querySelector('h3').textContent;
    g.tipo.textContent = li.querySelector('.pasta-rotulo').textContent;
    var desc = li.querySelector('.pasta-descricao');
    g.desc.textContent = desc ? desc.textContent : '';
    g.slides = Array.prototype.map.call(li.querySelectorAll('.pasta-previa'), function (fig) {
      var im = fig.querySelector('img'), cap = fig.querySelector('figcaption');
      return { src: im.getAttribute('src'), srcset: im.getAttribute('srcset') || '', alt: im.getAttribute('alt') || '', label: cap ? cap.textContent : '' };
    });
    g.minis.textContent = ''; g.buttons = [];
    g.slides.forEach(function (sl, k) {
      var item = document.createElement('li'), btn = document.createElement('button'), im = document.createElement('img');
      btn.type = 'button'; btn.className = 'galeria-mini';
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', 'Tela ' + (k + 1) + ': ' + sl.label);
      im.alt = ''; im.width = 600; im.height = 375; im.decoding = 'async';
      im.src = (sl.srcset.split(',')[0] || sl.src).trim().split(' ')[0]; // o arquivo de 600 px serve de miniatura
      btn.appendChild(im); item.appendChild(btn); g.minis.appendChild(item);
      btn.addEventListener('click', function () { go(k); });
      g.buttons.push(btn);
    });
    Array.prototype.forEach.call(g.layers, function (layer) { layer.className = ''; layer.removeAttribute('srcset'); layer.removeAttribute('src'); layer.alt = ''; });
    g.index = -1; g.shown = -1; g.front = 0; g.token++; g.opener = opener || null;
    g.aviso.hidden = true; g.num.textContent = ''; g.legenda.textContent = ''; setZoom(false);
    document.documentElement.classList.add('galeria-aberta');
    g.el.showModal();
    g.el.scrollTop = 0;
    ringBuild(g); // precisa do diálogo aberto para medir
    go(0);
  }

  function closeGallery() {
    var g = gal;
    if (!g || !g.el.open) { return; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { g.el.close(); return; }
    g.el.classList.add('is-closing');
    setTimeout(function () { if (g.el.open) { g.el.close(); } }, 190);
  }

  var canDialog = typeof window.HTMLDialogElement === 'function' && typeof window.HTMLDialogElement.prototype.showModal === 'function';
  Array.prototype.forEach.call(document.querySelectorAll('.pasta'), function (li) {
    var summary = li.querySelector('.pasta-detalhes summary');
    if (!canDialog || !summary || !li.querySelector('.pasta-previa')) { return; } // sem <dialog>: fica o <details> nativo
    summary.setAttribute('aria-haspopup', 'dialog');
    summary.addEventListener('click', function (e) { e.preventDefault(); openGallery(li, summary); });
    var pilha = li.querySelector('.pasta-pilha'); // clique/toque na pasta em si: atalho de ponteiro para a mesma ação
    if (pilha) { pilha.addEventListener('click', function () { openGallery(li, summary); }); }
  });

  /* "5 telas" sai da contagem real das figuras de cada pasta */
  Array.prototype.forEach.call(document.querySelectorAll('.pasta'), function (li) {
    var out = li.querySelector('.pasta-telas'), n = li.querySelectorAll('.pasta-previa').length;
    if (out) { if (n) { out.textContent = n + (n === 1 ? ' tela' : ' telas'); } else { out.hidden = true; } }
  });

  /* A capa não se mexe mais sozinha (a espiada automática saiu). Só com ponteiro fino existe a segunda tela no hover: ela fica
     recortada dentro da janela da capa, onde o lazy do navegador não a alcança — adianta-se o carregamento quando a pasta chega
     perto da tela. No toque nada disso é pedido. */
  if ('IntersectionObserver' in window && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var stripIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) { return; }
        stripIO.unobserve(entry.target);
        Array.prototype.forEach.call(entry.target.querySelectorAll('.pasta-tira img'), function (im) { im.loading = 'eager'; });
      });
    }, { rootMargin: '200px 0px' });
    Array.prototype.forEach.call(document.querySelectorAll('.pasta'), function (li) { stripIO.observe(li); });
  }

  /* capa/folha decorativa (alt vazio) que falha: some o ícone do navegador e fica a superfície da marca do CSS.
     As prévias dentro do <details> não entram aqui: nelas o texto alternativo deve aparecer. */
  var pastas = document.querySelector('.pastas');
  if (pastas) {
    var hideBroken = function (img) { if (img.closest && img.closest('.pasta-pilha')) { img.style.visibility = 'hidden'; } };
    pastas.addEventListener('error', function (e) { if (e.target && e.target.tagName === 'IMG') { hideBroken(e.target); } }, true);
    Array.prototype.forEach.call(pastas.querySelectorAll('.pasta-pilha img'), function (img) { if (img.complete && !img.naturalWidth) { hideBroken(img); } });
  }

  Array.prototype.forEach.call(document.querySelectorAll('#siteNav a[href^="#"]:not(.btn)'), function (link) {
    try { buildRoll(link); } catch (e) { /* o link segue como texto comum */ }
  });
})();
