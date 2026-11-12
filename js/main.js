/* Violator (Depeche Mode) · infografía interactiva
   Réplica en web de la infografía de 2022. Los datos salen de data/violator.json,
   los textos de data/texts.json y los dibujos (rosa, hojas, título, mapa, iconos) de assets/art.svg. */
(async function () {
  "use strict";

  // ---------- Geometría del original (lienzo de 1500 x 3000) ----------
  const W = 1500, H = 3000;
  const MOBILE_VIEW = [330, 30, 850, 2630];          // recorte para pantallas estrechas
  const FEATS = ["danceability", "energy", "speechiness", "acousticness", "instrumentalness", "valence"]; // en sentido horario desde arriba
  const LEGEND_ORDER = ["danceability", "valence", "energy", "speechiness", "instrumentalness", "acousticness"];
  const R_UNIT = 0.9008;   // valor 1.0 = 90 % de la longitud del eje, como en el original
  const STEM_HALF = 20;    // semianchura máxima del tallo

  // c: centro del radar · L: longitud del eje · label: esquina del título · mx: sangría de los datos
  // seg: tramo del tallo [y0, y1, x] · m: etiqueta en móvil [x, y, alineación]
  const LAYOUT = {
    "album":                 { c: [749.8, 341.5], L: 90.5 },
    "world-in-my-eyes":      { c: [1021.8, 636.3], L: 70.7, label: [1169, 573], mx: 1190, seg: [552, 770, 756], m: [716, 650, "end"] },
    "sweetest-perfection":   { c: [557.2, 863.1], L: 69.9, label: [193, 803], mx: 210, seg: [774, 992, 753], m: [792, 900, "start"] },
    "personal-jesus":        { c: [938.6, 1059.0], L: 69.0, label: [1081, 1052], mx: 1100, seg: [996, 1205, 753], m: [716, 1095, "end"] },
    "halo":                  { c: [565.7, 1295.5], L: 65.5, label: [353, 1291], mx: 373, seg: [1209, 1417, 753], m: [792, 1310, "start"] },
    "waiting-for-the-night": { c: [953.2, 1545.4], L: 65.6, label: [1083, 1565], mx: 1100, seg: [1421, 1708, 753], m: [716, 1510, "end"] },
    "enjoy-the-silence":     { c: [489.0, 1821.9], L: 74.9, label: [155, 1847], mx: 172, seg: [1733, 1961, 752], m: [792, 1815, "start"] },
    "policy-of-truth":       { c: [926.4, 1999.9], L: 58.9, label: [1031, 1953], mx: 1051, seg: [1963, 2182, 752], m: [716, 2040, "end"] },
    "blue-dress":            { c: [615.5, 2210.9], L: 66.9, label: [352, 2155], mx: 374, seg: [2184, 2410, 752], m: [792, 2300, "start"] },
    "clean":                 { c: [925.2, 2517.3], L: 67.2, label: [1063, 2485], mx: 1083, seg: [2412, 2611, 752], m: [716, 2500, "end"] },
    "dangerous":             { c: [823.2, 1135.3], L: 47.1, label: [890, 1158], mx: 895 },
    "memphisto":             { c: [646.6, 1699.5], L: 55.5, label: [493, 1617], mx: 505 },
    "sibeling":              { c: [666.3, 1861.0], L: 61.0, label: [542, 1901], mx: 551 },
    "kaleid":                { c: [815.5, 2099.8], L: 42.2, label: [872, 2097], mx: 882 },
    "happiest-girl":         { c: [845.8, 595.8], L: 61.4, label: [827, 471], mx: 907 },
    "sea-of-sin":            { c: [863.1, 755.6], L: 58.9, label: [932, 755], mx: 942 }
  };
  // Marcadores del mapa de grabación (coordenadas del arte original)
  const PINS = { london: [269.5, 2788], gjerlev: [282.3, 2782], milan: [282.3, 2797], newyork: [164.2, 2811] };
  const INTERLUDES = [
    { x: 762, y: 1936, lines: ["Interlude #2", "Crucified"] },
    { x: 764, y: 2396, lines: ["Interlude #3"] }
  ];

  // ---------- Carga ----------
  const [data, texts, art] = await Promise.all([
    d3.json("data/violator.json"),
    d3.json("data/texts.json"),
    d3.xml("assets/art.svg")
  ]);
  const tracks = data.tracks;
  const byId = new Map(tracks.map(t => [t.id, t]));
  const albumItem = { id: "album", type: "albuminfo", title: data.album.title, features: data.album.features_mean };
  const order = ["album", ...tracks.map(t => t.id)];
  const itemOf = id => (id === "album" ? albumItem : byId.get(id));

  // ---------- Estado ----------
  const mq = window.matchMedia("(max-width: 720px)");
  const state = { lang: initialLang(), active: null, mobile: mq.matches, compare: false, explore: null };
  const T = () => window.I18N[state.lang];

  function initialLang() {
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "es" || q === "en") return q;
    try { const s = localStorage.getItem("violator-lang"); if (s === "es" || s === "en") return s; } catch (e) { /* sin almacenamiento */ }
    return (navigator.language || "es").toLowerCase().startsWith("es") ? "es" : "en";
  }

  const svg = d3.select("#viz");
  const panel = d3.select("#panel");

  // Piezas del arte original: se insertan una sola vez
  const defs = svg.append("defs");
  art.querySelectorAll("defs > g").forEach(n => defs.node().appendChild(document.importNode(n, true)));
  const artNode = id => document.importNode(art.querySelector("#" + id), true);
  const dark = artNode("plant"); dark.id = "plant-dark";
  dark.querySelectorAll("path").forEach(p => p.setAttribute("fill", "#000"));
  defs.node().appendChild(dark);

  // ---------- Etiqueta flotante ----------
  const tip = d3.select("#tip");
  function showTip(html, ev) {
    tip.html(html).attr("hidden", null);
    const w = tip.node().offsetWidth, h = tip.node().offsetHeight;
    const x = Math.min(window.innerWidth - w - 8, Math.max(8, ev.clientX + 14));
    const y = ev.clientY + 18 + h > window.innerHeight ? ev.clientY - h - 12 : ev.clientY + 18;
    tip.style("left", x + "px").style("top", y + "px");
  }
  function hideTip() { tip.attr("hidden", ""); }

  // ---------- Utilidades de dibujo ----------
  const fmtDate = iso => { const [y, m, d] = iso.split("-").map(Number); return `${d} ${T().months[m - 1]} ${y}`; };
  const fmtVal = v => Math.round(v * 1000);
  const iconSvg = f => `<svg class="ic" viewBox="-13 -15 26 30" aria-hidden="true"><use href="#ic-${f}"/></svg>`;
  const mmss = ms => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

  function radarPath(feats, L) {
    const line = d3.lineRadial()
      .angle((d, i) => i * Math.PI / 3)
      .radius(d => d * R_UNIT * L)
      .curve(d3.curveCardinalClosed.tension(0.35));
    return line(FEATS.map(f => feats[f]));
  }

  function drawRadar(g, L, feats, iconScale) {
    const grid = g.append("g").attr("class", "grid");
    [0.2, 0.4, 0.6, 0.8].forEach(v => grid.append("circle").attr("class", "ring").attr("r", v * R_UNIT * L));
    FEATS.forEach((f, i) => {
      const a = i * Math.PI / 3 - Math.PI / 2;
      grid.append("line").attr("class", "axis").attr("x2", Math.cos(a) * L).attr("y2", Math.sin(a) * L);
    });
    if (feats) g.append("path").attr("class", "blob").attr("d", radarPath(feats, L));
    if (iconScale) {
      FEATS.forEach((f, i) => {
        const a = i * Math.PI / 3 - Math.PI / 2, r = L * 0.8;
        // como en el original: cerca del extremo del eje y desplazado hacia su derecha
        const ox = Math.cos(a + Math.PI / 2) * L * 0.13, oy = Math.sin(a + Math.PI / 2) * L * 0.13;
        g.append("use").attr("href", "#ic-" + f).attr("class", "icon")
          .attr("transform", `translate(${Math.cos(a) * r + ox},${Math.sin(a) * r + oy}) scale(${iconScale})`);
      });
    }
  }

  function stemPath(t, seg) {
    const [y0, y1, cx] = seg, n = t.peaks.length;
    const y = d3.scaleLinear([0, n - 1], [y0, y1]);
    return d3.area().x0(d => cx - Math.max(d * STEM_HALF, 0.4)).x1(d => cx + Math.max(d * STEM_HALF, 0.4)).y((d, i) => y(i))(t.peaks);
  }

  // Texto con saltos de línea automáticos y tramos en negrita. parts: [{t, b}]
  function wrapText(text, parts, width, lh) {
    const x = text.attr("x");
    const probe = text.append("tspan");
    const measure = (s, b) => { probe.text(s).attr("font-weight", b ? 700 : null); return probe.node().getComputedTextLength(); };
    const space = measure("a a", false) - measure("aa", false);
    const lines = [[]]; let w = 0;
    parts.forEach(p => p.t.split(/\s+/).filter(Boolean).forEach(word => {
      const ww = measure(word, p.b);
      if (w > 0 && w + space + ww > width) { lines.push([]); w = 0; }
      lines[lines.length - 1].push({ word, b: p.b }); w += (w > 0 ? space : 0) + ww;
    }));
    probe.remove();
    lines.forEach((ln, i) => {
      const row = text.append("tspan").attr("x", x).attr("dy", i === 0 ? 0 : lh);
      let run = null;
      ln.forEach((it, j) => {
        if (!run || run.b !== it.b) { run = { b: it.b, el: row.append("tspan").attr("font-weight", it.b ? 700 : null), s: "" }; }
        run.s += (j > 0 ? " " : "") + it.word; run.el.text(run.s);
      });
      // el espacio entre tramos de distinto peso se conserva
      row.selectAll("tspan").attr("xml:space", "preserve");
    });
    return lines.length;
  }

  // ---------- Render principal ----------
  function render() {
    const t = T(), mobile = state.mobile;
    document.documentElement.lang = t.lang;
    document.title = t.pageTitle;
    d3.select("#intro").text(t.intro);
    d3.selectAll(".lang button").attr("aria-pressed", function () { return this.dataset.lang === state.lang; });

    svg.selectAll(":scope > g").remove();
    svg.attr("viewBox", mobile ? MOBILE_VIEW.join(" ") : `0 0 ${W} ${H}`).classed("is-mobile", mobile);
    const root = svg.append("g").attr("class", "root");

    // Título manuscrito y logotipo
    root.node().appendChild(artNode("title"));
    if (!mobile) root.append("image").attr("href", "assets/depeche-mode.png").attr("x", 1331).attr("y", 0).attr("width", 169).attr("height", 524);

    // Datos generales del álbum, junto a la rosa
    const stats = root.append("text").attr("class", "stats").attr("x", mobile ? 1166 : 996).attr("y", 314);
    t.stats.forEach((s, i) => stats.append("tspan").attr("x", stats.attr("x")).attr("dy", i ? 28.3 : 0).text(s));

    // Tallo: un tramo por canción, dibujado a partir de los picos de su forma de onda
    const stems = root.append("g").attr("class", "stems");
    tracks.filter(d => LAYOUT[d.id].seg).forEach(d => {
      const seg = LAYOUT[d.id].seg, path = stemPath(d, seg);
      // El tramo funciona como barra de reproducción: la altura del puntero es el punto de la canción.
      const fracAt = ev => Math.min(0.985, Math.max(0, (d3.pointer(ev, root.node())[1] - seg[0]) / (seg[1] - seg[0])));
      const durOf = () => (player.id === d.id && player.dur ? player.dur : d.duration_ms);
      let dragging = false;
      const onMove = ev => {
        const f = fracAt(ev);
        ghost.attr("y1", seg[0] + f * (seg[1] - seg[0])).attr("y2", seg[0] + f * (seg[1] - seg[0])).style("display", null);
        if (ev.pointerType !== "touch") showTip(`<b>${d.title}</b> · ${mmss(f * durOf())}`, ev);
      };
      const onLeave = () => { ghost.style("display", "none"); hideTip(); };
      stems.append("path").attr("class", "stem").attr("data-id", d.id).attr("d", path);
      // la parte ya escuchada se pinta encima, recortada por un rectángulo que crece con la reproducción
      stems.append("clipPath").attr("id", "clip-" + d.id)
        .append("rect").attr("x", seg[2] - STEM_HALF - 4).attr("y", seg[0]).attr("width", STEM_HALF * 2 + 8).attr("height", 0);
      stems.append("path").attr("class", "stem-prog").attr("data-id", d.id).attr("d", path)
        .attr("clip-path", `url(#clip-${d.id})`);
      const ghost = stems.append("line").attr("class", "ghost").attr("x1", seg[2] - STEM_HALF - 8).attr("x2", seg[2] + STEM_HALF + 8).style("display", "none");
      // cabezal y tiempo de la canción que suena; el tiempo va en el lado libre (el contrario a la hoja)
      const left = LAYOUT[d.id].m[2] === "end";
      const head = stems.append("g").attr("class", "playhead").attr("data-id", d.id).style("display", "none");
      head.append("line").attr("x1", seg[2] - STEM_HALF - 8).attr("x2", seg[2] + STEM_HALF + 8);
      if (!mobile) head.append("text").attr("x", seg[2] + (left ? -1 : 1) * (STEM_HALF + 14)).attr("y", 5).attr("text-anchor", left ? "end" : "start");
      stems.append("rect").attr("class", "stem-hit").attr("data-id", d.id)
        .attr("x", seg[2] - STEM_HALF - 8).attr("y", seg[0]).attr("width", STEM_HALF * 2 + 16).attr("height", seg[1] - seg[0])
        .on("pointerdown", function (ev) { dragging = true; try { this.setPointerCapture(ev.pointerId); } catch (e) { /* sin captura */ } onMove(ev); })
        .on("pointermove", onMove)
        .on("pointerup", ev => { if (dragging) { dragging = false; activate(d.id, fracAt(ev)); } if (ev.pointerType === "touch") onLeave(); })
        .on("pointercancel", () => { dragging = false; onLeave(); })
        .on("pointerleave", () => { if (!dragging) onLeave(); });
    });

    // Rosa y hojas
    root.node().appendChild(artNode("plant"));

    // Modo explorar: una copia negra de la planta, recortada en una celda por radar (la zona más cercana
    // a cada uno), oscurece cada hoja según su valor en el atributo elegido.
    const shade = root.append("g").attr("class", "shade");
    // Cada radar aporta su centro y seis puntos a su alrededor: así la frontera entre una hoja grande y
    // una pequeña cae entre ambas y no por mitad de la grande.
    const sites = [];
    order.forEach(id => {
      const { c, L } = LAYOUT[id];
      sites.push({ id, p: c });
      for (let k = 0; k < 6; k++) sites.push({ id, p: [c[0] + Math.cos(k * Math.PI / 3) * L * 0.8, c[1] + Math.sin(k * Math.PI / 3) * L * 0.8] });
    });
    const vor = d3.Delaunay.from(sites.map(s => s.p)).voronoi([0, 0, W, H]);
    order.forEach(id => {
      shade.append("clipPath").attr("id", "cell-" + id).append("path")
        .attr("d", sites.map((s, i) => (s.id === id ? vor.renderCell(i) : "")).join(""));
      shade.append("g").attr("clip-path", `url(#cell-${id})`).attr("class", "shade-cell").attr("data-id", id).style("opacity", 0)
        .append("use").attr("href", "#plant-dark");
    });

    if (!mobile) {
      INTERLUDES.forEach(it => {
        const tx = root.append("text").attr("class", "interlude").attr("x", it.x).attr("y", it.y);
        it.lines.forEach((l, i) => tx.append("tspan").attr("x", it.x).attr("dy", i ? 10 : 0).text(l));
      });
    }

    // Un grupo interactivo por elemento (álbum + 15 pistas)
    const layer = root.append("g").attr("class", "tracks");
    order.forEach(id => {
      const d = itemOf(id), lay = LAYOUT[id];
      const g = layer.append("g")
        .attr("class", "track " + d.type).attr("data-id", id)
        .attr("tabindex", 0).attr("role", "button")
        .attr("aria-label", id === "album" ? `${data.album.title}. ${t.album}` : `${d.title}. ${d.duration}, ${d.bpm} bpm, ${d.key}`)
        .on("click", () => activate(id))
        .on("keydown", ev => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); activate(id); } });

      const r = g.append("g").attr("transform", `translate(${lay.c})`);
      r.append("circle").attr("class", "halo").attr("r", lay.L * 1.16);
      if (id !== "album") r.append("circle").attr("class", "prog").attr("r", lay.L * 1.16).attr("transform", "rotate(-90)");
      drawRadar(r, lay.L, d.features, lay.L * 0.0095);
      if (id !== "album") r.append("path").attr("class", "mean").attr("d", radarPath(data.album.features_mean, lay.L));
      const dot = r.append("circle").attr("class", "vdot").attr("r", Math.max(2.5, lay.L * 0.05)).style("display", "none");
      // un sector invisible por eje: recoge el clic y muestra el valor exacto al pasar el puntero
      FEATS.forEach((f, i) => {
        const a = i * Math.PI / 3;
        r.append("path").attr("class", "hit")
          .attr("d", d3.arc()({ innerRadius: 0, outerRadius: lay.L * 1.16, startAngle: a - Math.PI / 6, endAngle: a + Math.PI / 6 }))
          .on("pointermove", ev => {
            if (ev.pointerType === "touch") return;
            const rr = d.features[f] * R_UNIT * lay.L;
            dot.attr("cx", Math.sin(a) * rr).attr("cy", -Math.cos(a) * rr).style("display", null);
            const extra = id === "album" ? "" : ` <span class="tip-sub">${t.mean} ${fmtVal(data.album.features_mean[f])}</span>`;
            showTip(`<span class="tip-title">${d.title}</span>${iconSvg(f)}<b>${t.features[f][1]}</b> ${fmtVal(d.features[f])}${extra}`, ev);
          })
          .on("pointerleave", () => { dot.style("display", "none"); hideTip(); });
      });
      const badge = r.append("g").attr("class", "badge");
      badge.append("rect").attr("x", -30).attr("y", -13).attr("width", 60).attr("height", 26).attr("rx", 13);
      badge.append("text").attr("y", 5);

      if (id === "album") return;
      const big = d.type === "album";
      if (mobile) {
        if (!lay.m) return;
        const [x, y, anchor] = lay.m;
        const tx = g.append("text").attr("class", "m-label").attr("x", x).attr("y", y).attr("text-anchor", anchor);
        tx.append("tspan").attr("class", "num").text(d.n + " ");
        tx.append("tspan").attr("class", "name").text(d.title);
        tx.append("tspan").attr("class", "m-meta").attr("x", x).attr("dy", 34).text(`${d.duration} · ${d.bpm} bpm · ${d.key}`);
        return;
      }
      const [x, y] = lay.label;
      const title = g.append("text").attr("class", big ? "t-title" : "t-title small").attr("x", x).attr("y", y + (big ? 26 : 21));
      if (big) title.append("tspan").attr("class", "num").text(d.n + " ");
      title.append("tspan").attr("class", "name").text(d.title);
      const lines = [d.duration, d.bpm + " bpm", d.key];
      if (d.single_uk) lines.push(`(${fmtDate(d.single_uk)})`);
      const meta = g.append("text").attr("class", big ? "t-meta" : "t-meta small").attr("x", lay.mx).attr("y", y + (big ? 52 : 42));
      lines.forEach((l, i) => meta.append("tspan").attr("x", lay.mx).attr("dy", i ? (big ? 25.4 : 21.5) : 0).text(l));
    });

    if (!mobile) { drawLegend(root, t); drawCredits(root, t); }
    markActive();
    renderMobileBlocks(t);
    renderTools(t);
    if (state.active) renderPanel();
    updatePlayerUI();
    updateExplore();
  }

  // ---------- Herramientas: comparar con la media y explorar por atributo ----------
  function renderTools(t) {
    d3.select("#tools").html(
      `<button type="button" class="chip" id="t-compare" aria-pressed="${state.compare}"><span class="dash"></span>${t.compare}</button>` +
      `<span class="tools-label">${t.explore}:</span>` +
      LEGEND_ORDER.map(f => `<button type="button" class="chip" data-f="${f}" aria-pressed="${state.explore === f}">${iconSvg(f)}${t.features[f][1]}</button>`).join("") +
      `<span class="tools-hint" id="tools-hint"></span>`);
    d3.select("#t-compare").on("click", () => { state.compare = !state.compare; renderTools(T()); updateExplore(); });
    d3.selectAll("#tools [data-f]").on("click", function () {
      state.explore = state.explore === this.dataset.f ? null : this.dataset.f; renderTools(T()); updateExplore();
    });
    d3.select("#tools-hint").text(state.explore ? t.exploreHint : state.compare ? t.compareHint : "");
  }

  function updateExplore() {
    const f = state.explore;
    svg.classed("show-mean", state.compare).classed("exploring", !!f);
    if (!f) { svg.selectAll(".shade-cell").style("opacity", 0); return; }
    const ranked = [...tracks].sort((a, b) => b.features[f] - a.features[f]);
    const max = ranked[0].features[f], min = ranked[ranked.length - 1].features[f];
    const norm = v => Math.min(1, Math.max(0, (v - min) / ((max - min) || 1)));
    svg.selectAll(".shade-cell").style("opacity", function () { return (1 - norm(itemOf(this.dataset.id).features[f])) * 0.8; });
    svg.selectAll(".track").each(function () {
      const id = this.dataset.id, d = itemOf(id);
      d3.select(this).select(".badge text").text(id === "album" ? fmtVal(d.features[f]) : `${state.lang === "es" ? (ranked.indexOf(d) + 1) + "º" : "#" + (ranked.indexOf(d) + 1)} · ${fmtVal(d.features[f])}`);
    });
  }

  function drawLegend(root, t) {
    const g = root.append("g").attr("class", "legend");
    const lr = g.append("g").attr("transform", "translate(136.1,315.9)");
    drawRadar(lr, 87, null, 0);
    [[800, 4], [600, 3], [400, 2], [200, 1], [0, 0]].forEach(([v, k]) =>
      lr.append("text").attr("class", "tick").attr("y", -k * 0.2 * R_UNIT * 87 + 3.5).text(v));
    // posiciones de rótulos e iconos tal como estaban compuestos a mano en el original
    const POS = {
      danceability: [136, 234, 136, 207], valence: [60, 274, 54, 289], energy: [210, 274, 213, 293],
      instrumentalness: [60, 364, 62, 378], speechiness: [212, 364, 216, 383], acousticness: [136, 408, 136, 423]
    };
    Object.entries(POS).forEach(([f, [x, y, ix, iy]]) => {
      g.append("text").attr("class", "lg-label").attr("x", x).attr("y", y).text(t.features[f][0]);
      g.append("use").attr("href", "#ic-" + f).attr("transform", `translate(${ix},${iy}) scale(1.41)`);
    });
    // clave de lectura de las etiquetas
    const key = g.append("text").attr("class", "key").attr("x", 308).attr("y", 281);
    key.append("tspan").text(t.key.n + " ");
    key.append("tspan").attr("font-weight", 700).text(t.key.song);
    t.key.lines.forEach(l => key.append("tspan").attr("x", 334).attr("dy", 25.4).text(l));
    // definiciones
    for (let size = 19; size >= 15; size--) {
      const block = g.append("g");
      let y = 479, n = 0;
      LEGEND_ORDER.forEach(f => {
        block.append("use").attr("href", "#ic-" + f).attr("transform", `translate(29,${y - 6}) scale(1.2)`);
        const tx = block.append("text").attr("class", "lg-desc").style("font-size", size + "px").attr("x", 50).attr("y", y);
        const lines = wrapText(tx, [{ t: t.features[f][1] + ":", b: true }, { t: t.features[f][2], b: false }], 580, size * 1.2);
        n += lines; y += lines * size * 1.2;
      });
      if (n <= 10 || size === 15) break;
      block.remove();
    }
  }

  function drawCredits(root, t) {
    const g = root.append("g").attr("class", "credits");
    const band = g.append("text").attr("class", "cr").attr("x", 729).attr("y", 2605).attr("text-anchor", "end");
    band.append("tspan").attr("font-weight", 700).text(t.band);
    ["Alan Wilder", "David Gahan", "Andrew Fletcher", "Martin L. Gore"].forEach(n => band.append("tspan").attr("x", 729).attr("dy", 25.3).text(n));
    // Con Helvetica Neue ocupa 9 líneas, como el original. Si la fuente disponible es más ancha,
    // se reduce el cuerpo hasta que vuelva a caber.
    for (let size = 21; size >= 16; size--) {
      const block = g.append("g").attr("class", "cr-list");
      let y = 2750, n = 0;
      t.credits.forEach(([k, v]) => {
        const tx = block.append("text").attr("class", "cr").style("font-size", size + "px").attr("x", 576).attr("y", y);
        const lines = wrapText(tx, [{ t: k, b: true }, { t: v, b: false }], 470, size * 1.205);
        n += lines; y += lines * size * 1.205;
      });
      if (n <= 9 || size === 16) break;
      block.remove();
    }
    g.node().appendChild(artNode("map"));
    Object.entries(PINS).forEach(([k, [x, y]]) => {
      const [city, studio, text] = t.studios[k];
      const html = `<span class="tip-title">${city} · ${studio}</span>${text}`;
      g.append("circle").attr("class", "pin-hit").attr("cx", x).attr("cy", y).attr("r", 9)
        .attr("tabindex", 0).attr("role", "button").attr("aria-label", `${city}, ${studio}. ${text}`)
        .on("pointerenter pointermove", ev => showTip(html, ev))
        .on("pointerleave", hideTip)
        .on("click", ev => { ev.stopPropagation(); showTip(html, ev); })
        .on("focus", function () { const b = this.getBoundingClientRect(); showTip(html, { clientX: b.right, clientY: b.top }); })
        .on("blur", hideTip);
    });
    const src = g.append("text").attr("class", "cr").attr("x", 1491).attr("y", 2895).attr("text-anchor", "end");
    src.append("tspan").attr("font-weight", 700).text(t.source[0]);
    src.append("tspan").text(t.source[1]);
    g.append("text").attr("class", "cr").attr("x", 1491).attr("y", 2961).attr("text-anchor", "end").text(t.by);
    g.append("a").attr("href", "https://javiercanton.com").attr("target", "_blank").attr("rel", "noopener")
      .append("text").attr("class", "cr link").attr("x", 1491).attr("y", 2988).attr("text-anchor", "end").attr("font-weight", 700).text("javiercanton.com");
  }

  // ---------- Bloques HTML para móvil ----------

  function renderMobileBlocks(t) {
    d3.select("#m-legend").html(
      `<h2>${t.legendTitle}</h2><p class="note">${t.legendScale}</p><ul class="lg">` +
      LEGEND_ORDER.map(f => `<li>${iconSvg(f)}<span><b>${t.features[f][1]}</b>: ${t.features[f][2]}</span></li>`).join("") + "</ul>");
    d3.select("#m-tracks").html(`<h2>${t.tracksTitle}</h2><ol class="tl">` +
      tracks.map(d => `<li><button type="button" data-id="${d.id}"><span class="n">${d.n || "B"}</span><span class="ti">${d.title}</span><span class="du">${d.duration}</span></button></li>`).join("") + "</ol>");
    d3.selectAll("#m-tracks button").on("click", function () { activate(this.dataset.id); });
    d3.select("#m-credits").html(
      `<h2>${t.creditsTitle}</h2>` +
      `<p><b>${t.band}</b> Alan Wilder, David Gahan, Andrew Fletcher, Martin L. Gore</p>` +
      t.credits.map(([k, v]) => `<p><b>${k}</b> ${v}</p>`).join("") +
      `<h2>${t.studiosTitle}</h2>` +
      Object.keys(PINS).map(k => `<p><b>${t.studios[k][0]} · ${t.studios[k][1]}.</b> ${t.studios[k][2]}</p>`).join("") +
      `<h2>${t.source[0]}</h2><p>Spotify API - Wikipedia</p>` +
      `<p>${t.by} · <a href="https://javiercanton.com" target="_blank" rel="noopener">javiercanton.com</a></p>` +
      `<p><a href="assets/violator_${state.lang === "es" ? "spa" : "eng"}.pdf">${t.download}</a></p>`);
    d3.select("#foot").html(`<a href="assets/violator_${state.lang === "es" ? "spa" : "eng"}.pdf">${t.download}</a>`);
  }

  // ---------- Selección y panel de detalle ----------
  function markActive() {
    svg.selectAll(".track").classed("active", function () { return this.dataset.id === state.active; });
    svg.selectAll(".stem").classed("active", function () { return this.dataset.id === state.active; });
  }

  function select(id, opts) {
    state.active = id;
    markActive();
    if (id) {
      renderPanel();
      if (!(opts && opts.silent)) history.replaceState(null, "", "#" + id);
      const node = svg.select(`.track[data-id="${id}"]`).node();
      if (node && state.mobile) {
        // en móvil el panel ocupa la parte baja: se sube la hoja elegida a la zona visible
        window.scrollBy({ top: node.getBoundingClientRect().top - 70, behavior: "smooth" });
      } else if (node && opts && opts.scroll) {
        node.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    } else {
      panel.attr("aria-hidden", "true"); document.body.classList.remove("panel-open");
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

  function renderPanel() {
    const t = T(), id = state.active, d = itemOf(id), isAlbum = id === "album";
    const txt = (texts[id] && texts[id][state.lang]) || "";
    const i = order.indexOf(id), prev = order[(i - 1 + order.length) % order.length], next = order[(i + 1) % order.length];
    let kicker, meta;
    if (isAlbum) {
      kicker = t.album;
      meta = t.stats.map(s => `<span>${s}</span>`).join("");
    } else {
      kicker = d.type === "album" ? `${t.song} ${d.n}` : `${t.bsideOf} ${byId.get(d.bside_of).title}`;
      meta = `<span><i>${t.duration}</i> ${d.duration}</span><span><i>${t.tempo}</i> ${d.bpm} bpm</span><span><i>${t.keyLabel}</i> ${d.key}</span>` +
        (d.single_uk ? `<span><i>${t.single}</i> ${fmtDate(d.single_uk)}</span>` : "");
    }
    const bars = LEGEND_ORDER.map(f =>
      `<li>${iconSvg(f)}<span class="fn">${t.features[f][1]}</span>` +
      `<span class="bar"><span style="width:${(d.features[f] * 100).toFixed(1)}%"></span></span><span class="fv">${fmtVal(d.features[f])}</span></li>`).join("");
    // El panel tiene tres zonas: cabecera y cuerpo se repintan; la del reproductor es fija para que
    // el iframe de Spotify no se destruya al cambiar de canción.
    if (panel.select("#p-top").empty()) {
      panel.append("div").attr("id", "p-top");
      const slot = panel.append("div").attr("id", "player-slot").attr("hidden", "");
      slot.append("div").attr("id", "embed-wrap").append("div").attr("id", "embed");
      slot.append("p").attr("class", "player-note").attr("id", "player-note");
      panel.append("div").attr("id", "p-rest");
    }
    panel.select("#p-top").html(
      `<div class="p-head"><p class="kicker">${kicker}</p><button type="button" class="close" aria-label="${t.close}">×</button></div>` +
      `<h2>${d.title}</h2>` +
      `<p class="meta">${meta}</p>` +
      (isAlbum ? "" : `<p class="player"><button type="button" class="btn play-btn" data-play="${id}"></button>` +
        `<a class="ext" href="https://open.spotify.com/track/${d.spotify_id}" target="_blank" rel="noopener">${t.listen} ↗</a></p>`));
    panel.select("#p-rest").html(
      (txt ? `<p class="txt">${txt}</p>` : "") +
      (d.hidden_track ? `<p class="hidden-track">${t.hidden}: ${d.hidden_track}</p>` : "") +
      (isAlbum ? `<p class="note">${t.albumMean}</p>` : "") +
      `<ul class="bars">${bars}</ul>` +
      `<div class="nav"><button type="button" data-go="${prev}">← ${itemOf(prev).title}</button><button type="button" data-go="${next}">${itemOf(next).title} →</button></div>`);
    panel.attr("aria-hidden", "false"); document.body.classList.add("panel-open");
    panel.select(".close").on("click", () => select(null));
    panel.selectAll("[data-go]").on("click", function () { select(this.dataset.go, { scroll: true }); });
    panel.select("#p-rest").append("p").attr("class", "keys d-only").text(t.keysHint);
    panel.select(".play-btn").on("click", function () { play(this.dataset.play); });
    panel.node().scrollTop = 0;
    updatePlayerUI();
  }

  // ---------- Reproductor (Spotify iFrame API) ----------
  // Un único reproductor incrustado para toda la página. Con sesión iniciada en Spotify suena la canción
  // completa; sin ella, un fragmento de 30 segundos. La posición que comunica Spotify mueve el progreso
  // sobre el tallo y el anillo de cada radar.
  const player = { api: null, ctrl: null, creating: false, id: null, paused: true, pos: 0, dur: 0, full: false, error: false, started: false, alive: false, ended: false };

  function loadSpotifyApi() {
    if (!player.api) {
      player.api = new Promise((resolve, reject) => {
        window.onSpotifyIframeApiReady = api => resolve(api);
        const s = document.createElement("script");
        s.src = "https://open.spotify.com/embed/iframe-api/v1"; s.async = true;
        s.onerror = () => reject(new Error("Spotify iFrame API"));
        setTimeout(() => reject(new Error("Spotify iFrame API: tiempo agotado")), 6000);
        document.head.appendChild(s);
      });
    }
    return player.api;
  }

  // Controlador de reserva. Si el navegador bloquea el script de la API (algunos bloqueadores lo hacen),
  // se crea el iframe a mano y se habla con él con los mismos mensajes que usa la API oficial.
  function fallbackController(el, uri) {
    const ORIGIN = "https://open.spotify.com", listeners = {};
    let loading = true, queue = [], current = "";
    const iframe = document.createElement("iframe");
    iframe.title = "Spotify"; iframe.width = "100%"; iframe.height = "80"; iframe.setAttribute("frameborder", "0");
    iframe.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    const post = msg => { if (iframe.contentWindow) iframe.contentWindow.postMessage(msg, ORIGIN); };
    const send = msg => { if (loading) queue.push(msg); else post(msg); };
    window.addEventListener("message", e => {
      if (e.source !== iframe.contentWindow || !e.data || !e.data.type) return;
      if (e.data.type === "ready") { loading = false; const q = queue; queue = []; q.forEach(post); post({ command: "load_complete_ack" }); }
      (listeners[e.data.type] || []).forEach(h => h({ data: e.data.payload || {} }));
    });
    const ctrl = {
      loadUri(u, _video, t) {
        if (u === current) return;
        current = u; loading = true; queue = [];
        iframe.src = `${ORIGIN}/embed/track/${u.split(":").pop()}?theme=0&utm_source=iframe-api${t ? "&t=" + t : ""}`;
      },
      play() { send({ command: "play" }); },
      resume() { send({ command: "resume" }); },
      togglePlay() { send({ command: "toggle" }); },
      restart() { send({ command: "play_from_start" }); },
      seek(sec) { send({ command: "seek", timestamp: sec }); },
      addListener(name, h) { (listeners[name] = listeners[name] || []).push(h); }
    };
    el.replaceWith(iframe);
    ctrl.loadUri(uri);
    return ctrl;
  }

  // Abre el panel de una pista y la hace sonar. frac (0-1) es el punto de inicio si se pulsó sobre el tallo.
  function activate(id, frac) {
    if (id === "album") { select(id); return; }
    if (state.active !== id) select(id);
    play(id, frac);
  }

  function play(id, frac) {
    const d = byId.get(id); if (!d) return;
    const same = player.id === id && player.ctrl;
    if (same && frac == null) {
      if (player.ended) { player.ended = false; player.ctrl.restart(); } else player.ctrl.togglePlay();
      return;
    }
    if (same) {                                   // salto dentro de la canción que ya suena
      player.ctrl.seek(Math.floor(frac * (player.dur || d.duration_ms) / 1000));
      if (player.paused) player.ctrl.resume();
      return;
    }
    // el salto inicial solo tiene sentido si sabemos que suena la canción completa
    const startAt = frac != null && player.full ? Math.floor(frac * d.duration_ms / 1000) : 0;
    player.id = id; player.pos = startAt * 1000; player.dur = 0; player.paused = true; player.started = false; player.ended = false;
    d3.select("#player-slot").attr("hidden", null);
    updatePlayerUI();
    if (player.ctrl) { player.ctrl.loadUri(d.spotify_uri, false, startAt); player.ctrl.play(); return; }
    if (player.creating) return;                  // al terminar de crearse cargará la última pista pedida
    player.creating = true; player.error = false;
    const el = () => document.getElementById("embed"), uri = () => byId.get(player.id).spotify_uri;
    loadSpotifyApi()
      .then(api => new Promise(done => api.createController(el(), { uri: uri(), width: "100%", height: 80, theme: "dark" }, done)),
            () => fallbackController(el(), uri()))
      .then(ctrl => {
        player.ctrl = ctrl; player.creating = false;
        ctrl.addListener("ready", () => { player.alive = true; player.error = false; updatePlayerUI(); });
        ctrl.addListener("playback_update", e => { player.alive = true; player.error = false; onPlayback(e); });
        ctrl.play();
        // si el reproductor no da señales de vida, es que el navegador bloquea Spotify por completo
        setTimeout(() => { if (!player.alive) { player.error = true; updatePlayerUI(); } }, 9000);
      });
  }

  function onPlayback(e) {
    const s = e.data || {}, cur = byId.get(player.id);
    if (!cur || (s.playingURI && s.playingURI !== cur.spotify_uri)) return;   // aviso de una pista anterior
    player.pos = s.position || 0; player.dur = s.duration || 0; player.paused = !!s.isPaused;
    if (!player.paused) player.started = true;
    if (player.dur > 35000) player.full = true;
    // Fin de pista: Spotify deja la posición al final sin avisar de la pausa. En las canciones del disco
    // se pasa a la siguiente, como al escuchar el álbum; en el resto, el reproductor queda parado.
    const ended = player.dur > 0 && player.pos >= player.dur - 400;
    if (ended && !player.ended) {
      player.ended = true; player.paused = true;
      updatePlayerUI();
      if (cur.type === "album" && cur.n < 9) {
        const next = tracks.find(t => t.type === "album" && t.n === cur.n + 1);
        if (state.active === cur.id) select(next.id);
        play(next.id);
      }
      return;
    }
    if (!ended) player.ended = false; else player.paused = true;
    updatePlayerUI();
  }

  function updatePlayerUI() {
    const t = T(), cur = player.id ? byId.get(player.id) : null;
    const frac = cur && player.dur ? Math.min(1, player.pos / player.dur) : 0;
    const playing = !!cur && !player.paused;
    svg.selectAll(".track").classed("current", function () { return !!cur && this.dataset.id === cur.id; })
      .classed("playing", function () { return playing && this.dataset.id === cur.id; });
    svg.selectAll(".prog").each(function () {
      const on = !!cur && this.parentNode.parentNode.dataset.id === cur.id, c = 2 * Math.PI * +this.getAttribute("r");
      d3.select(this).attr("stroke-dasharray", `${on ? frac * c : 0} ${c}`);
    });
    svg.selectAll(".stems clipPath rect").each(function () {
      const id = this.parentNode.id.slice(5), seg = LAYOUT[id].seg;
      d3.select(this).attr("height", cur && id === cur.id ? frac * (seg[1] - seg[0]) : 0);
    });
    svg.selectAll(".playhead").each(function () {
      const on = !!cur && this.dataset.id === cur.id, seg = LAYOUT[this.dataset.id].seg, g = d3.select(this);
      g.style("display", on ? null : "none");
      if (on) {
        g.attr("transform", `translate(0,${seg[0] + frac * (seg[1] - seg[0])})`);
        g.select("text").text(player.dur ? `${mmss(player.pos)} / ${mmss(player.dur)}` : "");
      }
    });
    // indicador de la barra superior
    d3.select("#now").attr("hidden", cur ? null : "");
    if (cur) {
      d3.select("#now-toggle").text(playing ? "❚❚" : "▶").attr("aria-label", playing ? t.pause : t.play);
      d3.select("#now-title").text(cur.title).attr("aria-label", `${t.nowPlaying}: ${cur.title}`);
      d3.select("#now-time").text(player.dur ? `${mmss(player.pos)} / ${mmss(player.dur)}` : "");
    }
    // botón y avisos del panel
    const btn = panel.select(".play-btn");
    if (!btn.empty()) {
      const mine = playing && btn.attr("data-play") === cur.id;
      btn.text(mine ? "❚❚ " + t.pause : "▶ " + t.play).classed("on", mine);
    }
    const preview = !!cur && player.dur > 0 && player.dur <= 35000;
    d3.select("#player-note").text(player.error ? t.playerError : preview ? t.previewNote : (cur && !player.started ? t.blockedNote : ""));
  }

  d3.select("#now-toggle").on("click", () => { if (player.id) play(player.id); });

  // ---------- Teclado ----------
  document.addEventListener("keydown", ev => {
    if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
    const el = ev.target, interactive = el.closest && el.closest("button, a, input, select, textarea, [role=button]");
    if (ev.key === " " && !interactive) {
      const id = player.id || (state.active !== "album" ? state.active : null);
      if (id) { ev.preventDefault(); play(id); }
    } else if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
      const ids = tracks.map(t => t.id), cur = ids.indexOf(state.active && state.active !== "album" ? state.active : player.id);
      const next = ids[(cur + (ev.key === "ArrowRight" ? 1 : cur < 0 ? 0 : -1) + ids.length) % ids.length];
      ev.preventDefault();
      const wasPlaying = player.id && !player.paused;
      select(next, { scroll: true });
      if (wasPlaying) play(next);
    }
  });
  document.addEventListener("click", ev => { if (!ev.target.closest || !ev.target.closest(".pin-hit")) hideTip(); });
  window.addEventListener("scroll", hideTip, { passive: true });
  d3.select("#now-title").on("click", () => { if (player.id) select(player.id, { scroll: true }); });

  // ---------- Eventos globales ----------
  d3.selectAll(".lang button").on("click", function () {
    state.lang = this.dataset.lang;
    try { localStorage.setItem("violator-lang", state.lang); } catch (e) { /* sin almacenamiento */ }
    render();
  });
  document.addEventListener("keydown", ev => { if (ev.key === "Escape" && state.active) select(null); });
  mq.addEventListener("change", ev => { state.mobile = ev.matches; render(); });

  // Las medidas de texto dependen de la fuente: se espera a que esté lista
  if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch (e) { /* seguimos */ } }
  render();
  const hash = decodeURIComponent(location.hash.slice(1));
  if (LAYOUT[hash]) select(hash, { silent: true, scroll: true });
})().catch(err => {
  console.error(err);
  document.getElementById("stage").insertAdjacentHTML("afterbegin",
    '<p style="color:#fff;padding:2rem;text-align:center">No se han podido cargar los datos. Si has abierto el archivo directamente, usa un servidor local (ver README).</p>');
});
