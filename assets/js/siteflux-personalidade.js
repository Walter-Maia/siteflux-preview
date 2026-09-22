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
  var galleryMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Uma cópia visual curta conserva inclusive o recorte de um hover interrompido.
  // Não reutiliza classes/IDs: o carrossel e suas container queries continuam intactos.
  var SNAP_STYLE = ('display position box-sizing top right bottom left width height min-width min-height max-width max-height margin padding border border-radius background color font text-align line-height letter-spacing overflow overflow-x overflow-y opacity visibility object-fit object-position transform transform-origin flex flex-direction flex-shrink align-items justify-content gap box-shadow z-index white-space').split(' ');
  function gallerySnapshot(node) {
    if (!node) { return null; }
    var box = node.getBoundingClientRect();
    if (box.width < 2 || box.height < 2 || box.bottom <= 0 || box.top >= innerHeight) { return null; }
    // A capa pode ser clicada enquanto ainda assenta no carrossel (rotação até 3°).
    var angle = 0, ancestor = node;
    if (window.DOMMatrixReadOnly) {
      while (ancestor && ancestor.nodeType === 1) {
        var transform = getComputedStyle(ancestor).transform;
        if (transform !== 'none') {
          var matrix = new DOMMatrixReadOnly(transform);
          angle += Math.atan2(matrix.b, matrix.a);
        }
        ancestor = ancestor.parentElement;
      }
    }
    if (Math.abs(angle) > .0001 && Math.abs(angle) < .35) {
      var cosine = Math.abs(Math.cos(angle)), sine = Math.abs(Math.sin(angle)), determinant = cosine * cosine - sine * sine;
      var unrotatedW = (box.width * cosine - box.height * sine) / determinant;
      var unrotatedH = (box.height * cosine - box.width * sine) / determinant;
      box = { left: box.left + (box.width - unrotatedW) / 2, top: box.top + (box.height - unrotatedH) / 2, width: unrotatedW, height: unrotatedH };
    } else { angle = 0; }
    var copy = node.cloneNode(true), originals = [node].concat(Array.prototype.slice.call(node.querySelectorAll('*')));
    var copies = [copy].concat(Array.prototype.slice.call(copy.querySelectorAll('*')));
    originals.forEach(function (item, i) {
      var clone = copies[i], cs = getComputedStyle(item);
      clone.removeAttribute('class'); clone.removeAttribute('id'); clone.removeAttribute('style');
      clone.removeAttribute('tabindex'); clone.setAttribute('aria-hidden', 'true');
      SNAP_STYLE.forEach(function (key) { clone.style.setProperty(key, cs.getPropertyValue(key)); });
      clone.style.transition = 'none'; clone.style.animation = 'none'; clone.style.pointerEvents = 'none';
      if (item.tagName === 'IMG') {
        clone.removeAttribute('srcset'); clone.removeAttribute('sizes');
        var imageSource = item.currentSrc || item.getAttribute('src');
        if (imageSource) { clone.src = imageSource; } else { clone.removeAttribute('src'); }
        clone.alt = ''; clone.loading = 'eager';
      }
      // Uma captura ampliada pode estar rolada nos dois eixos.
      if (item.scrollLeft || item.scrollTop) {
        Array.prototype.forEach.call(clone.children, function (child) {
          child.setAttribute('data-snapshot-scroll', item.scrollLeft + ',' + item.scrollTop);
        });
      }
      var scroll = clone.getAttribute('data-snapshot-scroll');
      if (scroll) {
        var xy = scroll.split(',');
        clone.style.transform = 'translate(' + (-Number(xy[0])) + 'px,' + (-Number(xy[1])) + 'px) ' + (cs.transform === 'none' ? '' : cs.transform);
        clone.removeAttribute('data-snapshot-scroll');
      }
    });
    var width = node.offsetWidth || box.width, height = node.offsetHeight || box.height;
    copy.style.position = 'absolute'; copy.style.left = '0'; copy.style.top = '0';
    copy.style.right = 'auto'; copy.style.bottom = 'auto'; copy.style.margin = '0';
    copy.style.width = width + 'px'; copy.style.height = height + 'px';
    copy.style.minWidth = '0'; copy.style.maxWidth = 'none'; copy.style.minHeight = '0'; copy.style.maxHeight = 'none';
    copy.style.transformOrigin = '0 0'; copy.style.transform = 'scale(' + box.width / width + ',' + box.height / height + ')';
    copy.style.visibility = 'visible'; copy.style.opacity = '1';
    return { node: copy, box: box, angle: angle * 180 / Math.PI, radius: getComputedStyle(node).borderRadius };
  }

  function clearGalleryFlight(g) {
    var m = g.motion;
    if (!m) { return; }
    g.motion = null;
    m.animations.forEach(function (a) { a.onfinish = null; a.cancel(); });
    m.flight.remove(); m.veil.remove();
    g.el.classList.remove('is-morphing', 'is-closing');
    if (m.source) { m.source.style.visibility = m.visibility; }
  }

  function settleGalleryFlight(g) {
    if (!g || !g.motion) { return; }
    var closing = g.motion.closing;
    clearGalleryFlight(g);
    if (closing && g.el.open) { g.el.close(); }
  }

  function flyGallery(g, from, to, closing, backdropFrom) {
    if (!from || !to || galleryMotion.matches || !Element.prototype.animate) { return false; }
    var flight = el('div', 'galeria-flight'), veil = el('div', 'galeria-veil');
    flight.setAttribute('aria-hidden', 'true'); veil.setAttribute('aria-hidden', 'true');
    flight.style.cssText = 'left:' + from.box.left + 'px;top:' + from.box.top + 'px;width:' + from.box.width + 'px;height:' + from.box.height + 'px;border-radius:' + from.radius;
    var finalShot = el('div', 'galeria-flight-shot');
    finalShot.style.width = to.box.width + 'px'; finalShot.style.height = to.box.height + 'px';
    finalShot.style.transform = 'scale(' + from.box.width / to.box.width + ',' + from.box.height / to.box.height + ')';
    finalShot.appendChild(to.node); flight.appendChild(from.node); flight.appendChild(finalShot);
    var source = g.sourceElement;
    var m = g.motion = { flight: flight, veil: veil, closing: closing, animations: [], source: source, visibility: source ? source.style.visibility : '' };
    g.el.classList.add('is-morphing'); g.el.classList.toggle('is-closing', closing);
    g.el.appendChild(veil); g.el.appendChild(flight);
    if (source) { source.style.visibility = 'hidden'; }
    var duration = closing ? (innerWidth <= 760 ? 420 : 500) : (innerWidth <= 760 ? 650 : 900);
    var options = { duration: duration, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'both' };
    function animate(node, frames, timing) { var a = node.animate(frames, timing || options); m.animations.push(a); return a; }
    function frame(r, angle) {
      return 'translate(' + (r.left - from.box.left + r.width / 2) + 'px,' + (r.top - from.box.top + r.height / 2) + 'px) rotate(' + (angle || 0) + 'deg) scale(' + r.width / from.box.width + ',' + r.height / from.box.height + ') translate(' + (-from.box.width / 2) + 'px,' + (-from.box.height / 2) + 'px)';
    }
    var main = animate(flight, [{ transform: frame(from.box, from.angle) }, { transform: frame(to.box, to.angle) }]);
    // As superfícies trocam dentro da mesma janela: nunca se apaga a capa para abrir outro modal.
    animate(finalShot, [{ opacity: 0, offset: 0 }, { opacity: 0, offset: .55 }, { opacity: 1, offset: .9 }, { opacity: 1 }]);
    animate(from.node, [{ opacity: 1, offset: 0 }, { opacity: 1, offset: .55 }, { opacity: 0, offset: .9 }, { opacity: 0 }]);
    var whole = { left: 0, top: 0, width: innerWidth, height: innerHeight };
    function plane(r) { return 'translate(' + r.left + 'px,' + r.top + 'px) scale(' + r.width / innerWidth + ',' + r.height / innerHeight + ')'; }
    animate(veil, [{ transform: plane(backdropFrom || (closing ? whole : from.box)), borderRadius: closing ? '0px' : from.radius }, { transform: plane(closing ? to.box : whole), borderRadius: closing ? to.radius : '0px' }]);
    animate(g.dentro, closing ? [{ opacity: 1 }, { opacity: 0, offset: .4 }, { opacity: 0 }] : [{ opacity: 0 }, { opacity: 0, offset: .4 }, { opacity: 1 }]);
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
      '<div class="galeria-in">' +
        '<div class="galeria-topo"><p class="galeria-tipo"></p><button class="galeria-fechar" type="button">Fechar' + ICON_X + '</button></div>' +
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
          '<button class="galeria-ampliar" type="button" aria-pressed="false">Ampliar tela</button></div>' +
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
      slides: [], index: -1, shown: -1, front: 0, token: 0, opener: null, sourceElement: null, motion: null,
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
      if (e.key === 'Tab') {
        if (g.motion && !g.motion.closing) { settleGalleryFlight(g); }
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
      clearGalleryFlight(g);
      if (g.anel.raf) { cancelAnimationFrame(g.anel.raf); g.anel.raf = 0; }
      g.anel.drag = null; g.anel.box.classList.remove('is-arrastando');
      g.token++;
      document.documentElement.classList.remove('galeria-aberta');
      d.classList.remove('is-closing');
      setZoom(false);
      if (g.opener && g.opener.focus) {
        g.opener.focus({ preventScroll: true });
        var focusBox = g.opener.getBoundingClientRect();
        // Um resize pode reposicionar as seções atrás do diálogo; o foco de retorno precisa continuar visível.
        if (focusBox.top < 0 || focusBox.bottom > innerHeight) { g.opener.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }); }
      }
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
    if (g.el.open) { ajusta(g); }
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
    window.addEventListener('resize', function () { if (g.el.open) { settleGalleryFlight(g); ringMeasure(g); ajusta(g); } });
    window.addEventListener('orientationchange', function () { if (g.el.open) { settleGalleryFlight(g); setTimeout(function () { if (g.el.open) { ringMeasure(g); ajusta(g); } }, 120); } });
  }

  function go(i) {
    var g = gal, n = g.slides.length;
    if (g.motion && g.motion.closing) { return; }
    settleGalleryFlight(g);
    if (!n) { return; }
    i = ((i % n) + n) % n; // dá a volta nas pontas
    if (i === g.index) { return; }
    // tela que já falhou: pula para a seguinte no sentido do pedido (senão a seta ficaria presa nela)
    var sentido = g.index < 0 ? 1 : (((i - g.index) % n) + n) % n <= n / 2 ? 1 : -1, tentativas = 0;
    while (g.slides[i].erro && tentativas < n) { i = ((i + sentido) % n + n) % n; tentativas++; }
    if (tentativas >= n || i === g.index) { return; }
    g.index = i; // o pedido; g.shown é o que está na tela
    ringTo(g, i); // o anel gira na hora para a tela pedida
    var slide = g.slides[i], token = ++g.token;
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
        // só agora a legenda passa a falar desta tela
        g.shown = i; g.aviso.hidden = true;
        g.posicao.textContent = 'Tela ' + (i + 1) + ' de ' + n + ': ';
        g.legenda.textContent = slide.label;
        g.pos.textContent = (i + 1) + ' de ' + n + (n === 1 ? ' tela' : ' telas'); // só o que está de fato na tela (g.shown), nunca "0 de N"
      };
      // decode() evita o engasgo na troca, mas pode demorar a resolver sem quadros novos na tela: não seguramos a tela por ele
      var shown = false, once = function () { if (!shown) { shown = true; show(); } };
      if (loader.decode) { loader.decode().then(once, once); setTimeout(once, 280); } else { once(); }
    };
    loader.onerror = function () {
      if (token !== g.token) { return; }
      slide.erro = true;
      if (g.shown < 0) { // nem a primeira carregou: aviso útil; setas, anel e Fechar continuam
        g.aviso.hidden = false; g.legenda.textContent = 'Tela indisponível';
      }
      g.index = g.shown; // setas e teclado continuam a partir da tela que está visível
      if (g.shown >= 0) { ringTo(g, g.shown); } // o anel volta para a tela que ficou (senão apontaria para a que falhou)
    };
    loader.srcset = slide.srcset; loader.sizes = SIZES; loader.src = slide.src;
    var nextSlide = g.slides[(i + 1) % n]; // pré-carrega só a próxima
    if (nextSlide && n > 1) { var pre = new Image(); pre.srcset = nextSlide.srcset; pre.sizes = SIZES; pre.src = nextSlide.src; }
  }

  // nome oficial do projeto (o h3 pode conter o botão "Abrir galeria de …", cujo prefixo é só para leitores de tela)
  function nomeDoProjeto(li) {
    var h3 = li.querySelector('h3');
    return h3 ? (h3.getAttribute('data-nome') || h3.textContent.replace(/\s+/g, ' ').trim()) : '';
  }

  function openGallery(li, opener) {
    if (!gal) { gal = buildGallery(); }
    var g = gal, cs = getComputedStyle(li);
    clearGalleryFlight(g);
    var cover = visibleCover(li);
    var source = galleryMotion.matches ? null : gallerySnapshot(li.querySelector('.pasta-capa'));
    g.sourceElement = li.querySelector('.pasta-capa');
    ['bg', 'soft', 'fg', 'mut', 'acc', 'line'].forEach(function (k) {
      var v = cs.getPropertyValue('--p-' + k).trim();
      if (v) { g.el.style.setProperty('--g-' + k, v); } else { g.el.style.removeProperty('--g-' + k); }
    });
    g.titulo.textContent = nomeDoProjeto(li);
    g.tipo.textContent = li.querySelector('.pasta-rotulo').textContent;
    var desc = li.querySelector('.pasta-descricao');
    g.desc.textContent = desc ? desc.textContent : '';
    g.slides = Array.prototype.map.call(li.querySelectorAll('.pasta-previa'), function (fig) {
      var im = fig.querySelector('img'), cap = fig.querySelector('figcaption');
      return { src: im.getAttribute('src'), srcset: im.getAttribute('srcset') || '', alt: im.getAttribute('alt') || '', label: cap ? cap.textContent : '' };
    });
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
    document.documentElement.classList.add('galeria-aberta');
    if (!g.el.open) { g.el.showModal(); }
    g.el.scrollTop = 0;
    ringBuild(g); // precisa do diálogo aberto para medir
    ajusta(g);
    go(initial);
    if (source) { flyGallery(g, source, gallerySnapshot(g.moldura), false); }
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function reajusta() { if (!g.el.open) { return; } if (g.motion) { setTimeout(reajusta, 300); return; } ajusta(g); }); } // se as fontes chegam durante o voo de abertura, remede depois
  }

  /* 2.30: dimensiona a galeria pela LARGURA E ALTURA disponíveis. A moldura principal recebe a maior largura que cabe
     (proporção 1200:750) depois de descontar topo, nome, legenda, anel + setas, contador e descrição; se não couber com o
     anel normal, o anel encolhe (.is-anel-compacto); se ainda não couber, a descrição sai (.is-sem-desc); abaixo de 260 px
     de tela o diálogo rola (limite registrado). Em paisagem curta (≤ 560 px de altura, ≥ 700 de largura) a tela fica à
     esquerda e nome, anel, contador e descrição numa coluna à direita (.is-paisagem). Só escreve larguras: sem ciclo. */
  var paisagem = window.matchMedia('(max-height: 560px) and (min-width: 700px)');
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
    var barra = 28, legenda = alto(g.conta) + 10, colW = lado ? Math.floor(W * 0.6) : W;
    var largura = function () {
      var outros = lado ? alto(g.topo) : alto(g.topo) + alto(g.titulo) + alto(g.nav) + alto(g.pos) + alto(g.desc) + 4;
      var altura = H - outros - barra - legenda;
      return Math.min(colW, 960, Math.max(0, altura) * 1.6);
    };
    if (lado) { ringMeasure(g); }
    var w = largura();
    // a tela principal manda: se com o anel normal ela ficar pequena (menos de 55 % da largura ou de 760 px), o anel encolhe
    if (w < Math.min(760, colW * 0.55) && !g.anel.box.hidden) { d.classList.add('is-anel-compacto'); ringMeasure(g); w = largura(); }
    if (w < 300 && g.desc.textContent) { d.classList.add('is-sem-desc'); w = largura(); }
    if (lado) {
      // paisagem: a coluna da direita (nome, anel, contador, descrição) também precisa caber na altura
      var coluna = function () { return alto(g.titulo) + alto(g.nav) + alto(g.pos) + alto(g.desc); };
      if (coluna() > H - alto(g.topo) && !d.classList.contains('is-anel-compacto') && !g.anel.box.hidden) { d.classList.add('is-anel-compacto'); ringMeasure(g); }
      if (coluna() > H - alto(g.topo) && g.desc.textContent) { d.classList.add('is-sem-desc'); }
      w = largura();
    }
    w = Math.max(Math.min(260, colW), w);
    g.palco.style.width = Math.round(w) + 'px';
    d.style.setProperty('--tela-w', Math.round(w) + 'px');
    if (lado) { ringMeasure(g); }
  }

  function closeGallery() {
    var g = gal;
    if (!g || !g.el.open) { return; }
    if (g.motion && g.motion.closing) { return; }
    var source = galleryMotion.matches ? null : gallerySnapshot(g.motion ? g.motion.flight : g.moldura);
    var background = g.motion ? g.motion.veil.getBoundingClientRect() : null;
    clearGalleryFlight(g);
    var target = source ? gallerySnapshot(g.sourceElement) : null;
    if (g.anel.raf) { cancelAnimationFrame(g.anel.raf); g.anel.raf = 0; }
    if (!flyGallery(g, source, target, true, background)) { g.el.close(); }
  }

  function galleryPreferenceChanged() {
    if (!gal) { return; }
    settleGalleryFlight(gal);
    if (gal.anel.raf) { cancelAnimationFrame(gal.anel.raf); gal.anel.raf = 0; }
    if (gal.el.open) {
      ringBuild(gal);
      if (gal.anel.n && gal.shown >= 0) { gal.anel.ang = -gal.anel.paineis[gal.shown].a; gal.anel.alvo = gal.anel.ang; ringRender(gal); }
      ajusta(gal);
    }
  }
  if (galleryMotion.addEventListener) { galleryMotion.addEventListener('change', galleryPreferenceChanged); }
  else if (galleryMotion.addListener) { galleryMotion.addListener(galleryPreferenceChanged); }

  var canDialog = typeof window.HTMLDialogElement === 'function' && typeof window.HTMLDialogElement.prototype.showModal === 'function';
  if (canDialog) { document.documentElement.classList.add('tem-dialog'); }
  Array.prototype.forEach.call(document.querySelectorAll('.pasta'), function (li) {
    var summary = li.querySelector('.pasta-detalhes summary');
    if (!canDialog || !summary || !li.querySelector('.pasta-previa')) { return; } // sem <dialog>: fica o <details> nativo
    summary.setAttribute('aria-haspopup', 'dialog');
    summary.addEventListener('click', function (e) { e.preventDefault(); openGallery(li, summary); });
    // 2.29: no card só aparece o nome do projeto, e o nome é o acionador (botão real: Enter/Espaço, foco visível,
    // nome acessível "Abrir galeria de …"). O <details> continua no HTML como fonte das telas e como fallback sem JS.
    var h3 = li.querySelector('.pasta-titulo h3'), abrir = null;
    if (h3) {
      abrir = document.createElement('button');
      abrir.type = 'button'; abrir.className = 'pasta-abrir';
      abrir.setAttribute('aria-haspopup', 'dialog');
      var nome = h3.textContent.replace(/\s+/g, ' ').trim();
      h3.setAttribute('data-nome', nome);
      abrir.appendChild(el('span', 'sr-only', 'Abrir galeria de '));
      abrir.appendChild(document.createTextNode(nome));
      h3.textContent = ''; h3.appendChild(abrir);
      abrir.addEventListener('click', function () { openGallery(li, abrir); });
    }
    var pilha = li.querySelector('.pasta-pilha'); // clique/toque na capa em si: atalho de ponteiro para a mesma ação
    if (pilha) { pilha.addEventListener('click', function () { openGallery(li, abrir || summary); }); }
  });

  /* ------------------------------------------------------------------
     Projetos em carrossel de capas: a capa do projeto da vez grande no centro, as vizinhas menores, mais baixas, levemente
     giradas e escurecidas. Um índice só (atual) governa posições, indicadores e contador; setas, indicadores, teclado
     (← →), clique numa vizinha e arraste mexem nele. O anel dá a volta: cada item fica no deslocamento mais curto até o
     centro, e quem precisa atravessar o palco por trás "salta" sem transição (está invisível nesse momento). As capas
     fora do centro ficam inertes (o foco não entra nelas); um arraste nunca vira clique.
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
    var n = itens.length, atual = 0, drag = null, engolir = false, antes = [];
    function desloc(i, pos) { var o = (((i - pos) % n) + n) % n; if (o > n / 2) { o -= n; } return o; }
    function coloca(pos) { // pos pode ser fracionário durante o arraste
      itens.forEach(function (li, i) {
        var o = desloc(i, pos), a = Math.abs(o), salto = antes[i] !== undefined && Math.abs(o - antes[i]) > 1.5;
        if (salto) { li.classList.add('is-salto'); }
        li.style.transform = 'translate3d(' + (o * 106).toFixed(2) + '%,' + (Math.min(a, 1.6) * 8).toFixed(2) + '%,0) rotate(' + (Math.max(-1.6, Math.min(1.6, o)) * 3).toFixed(2) + 'deg) scale(' + (1 - Math.min(a, 1.6) * 0.1).toFixed(3) + ')';
        li.style.filter = 'brightness(' + (1 - Math.min(a, 1) * 0.42).toFixed(2) + ')';
        li.style.opacity = a > 1.6 ? '0' : '1';
        li.style.zIndex = String(10 - Math.round(a * 2));
        if (salto) { void li.offsetWidth; li.classList.remove('is-salto'); }
        antes[i] = o;
      });
    }
    function mede() { // o trilho é absoluto: a altura vem da capa mais alta (com o texto)
      var h = 0;
      itens.forEach(function (li) { h = Math.max(h, li.offsetHeight); });
      lista.style.height = Math.ceil(h * 1.04) + 'px';
    }
    function pinta() {
      coloca(atual);
      itens.forEach(function (li, i) {
        li.classList.toggle('is-atual', i === atual);
        if (i === atual) { li.removeAttribute('inert'); } else { li.setAttribute('inert', ''); }
      });
    }
    function ir(i, anunciar) {
      atual = ((i % n) + n) % n;
      pinta();
      if (anunciar) { var nome = nomeDoProjeto(itens[atual]); status.textContent = 'Projeto ' + (atual + 1) + ' de ' + n + (nome ? ': ' + nome : ''); }
    }
    Array.prototype.forEach.call(nav.querySelectorAll('.pastas-seta'), function (b) {
      b.addEventListener('click', function () { ir(atual + Number(b.getAttribute('data-dir')), true); });
    });
    janela.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) { return; }
      if (e.key === 'ArrowRight') { ir(atual + 1, true); e.preventDefault(); } else if (e.key === 'ArrowLeft') { ir(atual - 1, true); e.preventDefault(); }
    });
    janela.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) { return; }
      if (e.target.closest && e.target.closest('.pastas-nav')) { return; } // as setas ficam sobre a janela: o clique nelas não é arraste nem "lado clicado"
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, on: false, dx: 0 };
    });
    janela.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) { return; }
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.on) {
        if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) { return; }
        drag.on = true; lista.classList.add('is-dragging'); janela.classList.add('is-dragging');
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
      ir(atual + passos, !!passos);
    };
    janela.addEventListener('pointerup', solta);
    janela.addEventListener('pointercancel', solta);
    janela.addEventListener('click', function (e) { if (engolir) { e.stopPropagation(); e.preventDefault(); } }, true);
    janela.addEventListener('dragstart', function (e) { e.preventDefault(); });
    window.addEventListener('resize', mede);
    window.addEventListener('load', mede);
    if ('ResizeObserver' in window) { new ResizeObserver(mede).observe(itens[0]); }
    pinta(); mede();
    // avanço automático: um projeto a cada 5 s. Para com o mouse ou o foco em cima, durante o arraste, fora da tela,
    // com a aba oculta, com a galeria aberta e com movimento reduzido; qualquer navegação manual reinicia a contagem.
    var AUTO_MS = 5000, timer = 0, sobre = false, foco = false, naTela = !('IntersectionObserver' in window);
    var reduz = window.matchMedia('(prefers-reduced-motion: reduce)');
    function podeAuto() { return !reduz.matches && !sobre && !foco && !drag && naTela && !document.hidden && !document.documentElement.classList.contains('galeria-aberta'); }
    function arma() { clearTimeout(timer); timer = setTimeout(function () { if (podeAuto()) { ir(atual + 1, false); } arma(); }, AUTO_MS); }
    var secao = janela.parentNode;
    janela.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { sobre = true; } }); // só sobre as capas
    janela.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { sobre = false; arma(); } });
    secao.addEventListener('focusin', function () { try { foco = !!secao.querySelector(':focus-visible'); } catch (err) { foco = true; } });
    secao.addEventListener('focusout', function (e) { if (!secao.contains(e.relatedTarget)) { foco = false; arma(); } });
    secao.addEventListener('click', arma);
    janela.addEventListener('pointerup', arma);
    if ('IntersectionObserver' in window) { new IntersectionObserver(function (en) { naTela = en[0].intersectionRatio >= 0.35; arma(); }, { threshold: [0, 0.35] }).observe(janela); }
    document.addEventListener('visibilitychange', arma);
    arma();
  })();

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
