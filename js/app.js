let guestList = [];

let syncTimer = null;
let syncResumeTO = null;
let isOnScreen3 = false;      // estado actual de la vista
let giftsAbort = null;        // AbortController para cancelar fetch en curso
let pendingReservations = new Set(); // IDs de regalos que están siendo procesados (reservar/liberar)
let isNameLocked = false;
let giftView = localStorage.getItem("giftView") || "list"; // Estado de vista (persistente)
let mobileView = localStorage.getItem("mobileView") || "list";
// Estado de filtros UI (chips)
let uiFilters = {
  price: "all",   // "all" | "lt50" | "50-100" | "gt100"
  place: "all"    // "all" | "Sala" | "Cocina" | "Habitación" | "Decoración"
};

// ====== Bloqueo de pantalla para operaciones async ======
let uiBusy = false;

function lockUI(msg = "Guardando tu reserva…") {
  if (uiBusy) return;
  uiBusy = true;

  // Evita scroll de la página
  document.body.classList.add("is-busy");

  // Overlay que captura T-O-D-O
  const overlay = document.createElement("div");
  overlay.id = "uiLock";
  overlay.className = "ui-lock";
  overlay.setAttribute("aria-busy", "true");
  overlay.setAttribute("aria-live", "polite");
  overlay.setAttribute("role", "status");
  overlay.innerHTML = `
    <div class="ui-lock__box">
      <div class="ui-lock__spinner" aria-hidden="true"></div>
      <p class="ui-lock__text">${msg}</p>
    </div>
  `;
  document.body.appendChild(overlay);
}

function unlockUI(delayMs = 500) {
  // Pequeño delay para que el usuario perciba el cambio de estado
  setTimeout(() => {
    const overlay = document.getElementById("uiLock");
    if (overlay) overlay.remove();
    document.body.classList.remove("is-busy");
    uiBusy = false;
  }, delayMs);
}


  function setupGiftFilters() {
    const wrap = document.getElementById("giftFilters");
    if (!wrap) return;

    wrap.addEventListener("click", (e) => {
      const chip = e.target.closest(".filter-chip");
      if (!chip) return;

      const kind = chip.dataset.filter;   // "price" | "place"
      const val  = chip.dataset.value;    // e.g. "lt50" or "Sala"
      if (!kind || typeof val === "undefined") return;

      // Actualiza estado
      uiFilters[kind] = val;

      // Actualiza clases activas dentro del grupo
      const group = chip.closest(`.filter-group[data-group="${kind}"]`) || wrap.querySelector(`.filter-group[data-group="${kind}"]`);
      (group ? group : wrap).querySelectorAll(`.filter-chip[data-filter="${kind}"]`).forEach(b => {
        const isActive = b.dataset.value === val;
        b.classList.toggle("active", isActive);
        b.setAttribute("aria-pressed", isActive ? "true" : "false");
      });

      // Repinta con filtros aplicados
      repaintGifts();

    });
  }



function applyMobileView() {
  const grid = document.querySelector(".regalos-grid");
  if (!grid) return;

  // limpia clases
  grid.classList.remove("mobile-grid", "mobile-list");

  // solo aplicar en pantallas ≤600px
  if (window.innerWidth <= 600) {
    grid.classList.add(mobileView === "grid" ? "mobile-grid" : "mobile-list");
  }

  updateToggleUi();
}

function applyGiftView() {
  const cont = document.getElementById("listaRegalos");
  if (!cont) return;
  cont.classList.toggle("grid", giftView === "grid");
  document.getElementById("btnList")?.classList.toggle("is-active", giftView === "list");
  document.getElementById("btnGrid")?.classList.toggle("is-active", giftView === "grid");
}

// Toggle por clicks
document.getElementById("viewToggle")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".vt-btn");
  if (!btn) return;
  mobileView = btn.dataset.view;               // "list" | "grid"
  localStorage.setItem("mobileView", mobileView);
  applyMobileView();
});

function updateToggleUi() {
  const list = document.getElementById("btnList");
  const grid = document.getElementById("btnGrid");
  if (!list || !grid) return;
  list.classList.toggle("is-active", mobileView === "list");
  grid.classList.toggle("is-active", mobileView === "grid");
}

applyMobileView();
window.addEventListener("resize", applyMobileView);

function lockGuestName(lock = true) {
  const input = document.getElementById("nombre");
  const suggestions = document.getElementById("suggestions"); // usa el id de tu lista

  if (!input) return;
  isNameLocked = lock;

  // desactivar edición (readonly evita cambios pero mantiene estilos)
  input.readOnly = lock;
  input.classList.toggle("locked", lock);

  // desactivar clics en la lista de sugerencias si existe
  if (suggestions) suggestions.style.pointerEvents = lock ? "none" : "auto";
}

async function syncNow() {
  if (!isOnScreen3) return;
  await fetchGifts(true);
  if (isOnScreen3) mostrarRegalos(regalos) ; applyMobileView();
}

function pauseSync(ms = 1200) {
  if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
  if (syncResumeTO) clearTimeout(syncResumeTO);
  // reanuda el polling después de un respiro
  syncResumeTO = setTimeout(() => {
    if (isOnScreen3 && typeof syncNow === "function") {
      syncNow();                               // un refresh
      syncTimer = setInterval(syncNow, 6000);  // y retomamos
    }
  }, ms);
}

// Al recuperar foco de la pestaña, sincroniza una vez
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && isOnScreen3) {
    syncNow?.();
  }
});

// Espera al siguiente frame de pintura del browser
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
// Fuerza un repintado completo de la grilla y deja que el browser pinte
async function repaintGifts() {
  mostrarRegalos(filtrarRegalos(regalos));      // pinta ya con filtros/orden
  await nextFrame();                             // deja que pinte
  await nextFrame();                             // (doble frame = transición suave)
}

async function fetchGuestList() {
    try {
      const res = await fetch('/.netlify/functions/getGuests');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("Error al cargar invitados:", err);
      return [];
    }
  }
  
  
  document.addEventListener("DOMContentLoaded", async () => {
    guestList = await fetchGuestList();
    console.log("Lista de invitados cargada:", guestList);
    await fetchGifts();

    // Inicializa chips de filtros
    setupGiftFilters();
  });

  document.getElementById("nombre").addEventListener("focus", () => {
    setTimeout(() => {
      document.getElementById("nombre").scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }, 300); // espera a que aparezca el teclado
  });
  
  

  let regalos = [];
  let nombreSeleccionado = "";

  async function fetchGifts(noCache = false) {
    
    // Si no estamos en screen3, no hagas nada
    if (!isOnScreen3) return;
    
    // Cancela fetch anterior (si quedaba en vuelo)
    if (giftsAbort) {
      giftsAbort.abort();
    }
    giftsAbort = new AbortController();
    const { signal } = giftsAbort;

    try {
       const url = "/.netlify/functions/getGifts" + (noCache ? `?t=${Date.now()}` : "");
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      //const res = await fetch("/.netlify/functions/getGifts");
      //const data = await res.json();

      // Normaliza al formato que ya usa tu UI
      regalos = data.map(r => ({
        id: r.id_regalo,
        nombre: r.nombre,
        precio: Number(r.precio) || 0,
        lugar: r.lugar,
        descripcion: r.descripcion,
        link : r.link || "",
        imagen: r.img || "",
        estado: r.estado || "",
        reservado_por: r.reservado_por || "",
        tipo: r.tipo || "",
        categoria: r.categoria || ""
      }));

      console.log("🎁 Regalos cargados:", regalos);
    } catch (err) {
      console.error("❌ Error cargando regalos:", err);
    }
  }

  function parseGift(item = {}) {
    const estado = String(item.estado ?? "").trim().toLowerCase();
    const invitadoRaw = (item.reservado_por ?? "").toString();
    const tipo = String(item.tipo ?? "").trim().toLowerCase();

    const toList = (s = "") => s.split(",").map(x => x.trim()).filter(Boolean);

    const invitadoList = toList(invitadoRaw);
    const isVarios = tipo === "varios";
    const isUnico  = tipo === "único" || tipo === "unico";

    // Reservado:
    // - Varios: si hay al menos un nombre en la lista, o el estado ya dice "reservado"
    // - Único : igual que antes
    const estadoEsReservado =
      estado === "reservado" || estado === "apartado" ||
      estado === "sí" || estado === "si" ||
      estado === "true" || estado === "1";

    const isReservado = isVarios ? (invitadoList.length > 0 || estadoEsReservado) : estadoEsReservado;

    return { isReservado, invitadoRaw, invitadoList, isVarios, isUnico };
  }


  function computeGiftUiState(item, nombre) {
    const { isReservado, invitadoList, isVarios, isUnico } = parseGift(item);
    const yo = (nombre ?? "").toString().trim().toLowerCase();

    if (isVarios) {
      const estoy = invitadoList.some(n => n.toLowerCase() === yo);
      return {
        disabled: false,
        label: estoy ? "Liberar" : "Apartar",
        canReservar: !estoy,
        canLiberar: estoy,
        hint: estoy ? "Ya lo apartaste. Puedes liberarlo." : "Este regalo permite varias selecciones.",
        selected: invitadoList.length > 0
      };
    }

    // Tratar vacío/desconocido como Único por seguridad
    const unico = isUnico || !isVarios;

    if (unico) {
      if (!isReservado) {
        return {
          disabled: false,
          label: "Apartar",
          canReservar: true,
          canLiberar: false,
          hint: "Disponible para reservar.",
          selected: false
        };
      }
      const invitado = (item.reservado_por ?? "").toString().trim().toLowerCase();
      const mio = invitado && yo && invitado === yo;
      return mio
        ? { disabled: false, label: "Liberar", canReservar: false, canLiberar: true, hint: "Lo reservaste tú. Puedes liberarlo.", selected: true }
        : { disabled: true,  label: "Apartado ✅", canReservar: false, canLiberar: false, hint: `Reservado por ${item.reservado_por || "otra persona"}.`, selected: true };
    }
  }

  function getVisualState(item, nombreSeleccionado) {
    const yo   = (nombreSeleccionado || "").trim().toLowerCase();
    const tipo = String(item.tipo || "").trim().toLowerCase();
    const estado = String(item.estado || "").trim().toLowerCase();
    const invitadoRaw = (item.reservado_por ?? "").toString();

    const invitadoList = invitadoRaw
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    const estadoEsReservado =
      estado === "reservado" || estado === "apartado" ||
      estado === "sí" || estado === "si" || estado === "true" || estado === "1";

    // ⬇️ Regla especial para VARIOS:
    // - Si YO lo aparté -> "mine"
    // - Si NO lo aparté -> "none" (aunque otros lo hayan apartado)
    if (tipo === "varios") {
      const estoy = invitadoList.some(n => n.toLowerCase() === yo);
      return estoy ? "mine" : "none";
    }

    // ÚNICO (o desconocido => tratamos como único)
    if (!estadoEsReservado) return "none";
    const invitado = invitadoRaw.trim().toLowerCase();
    return invitado && yo && invitado === yo ? "mine" : "others";
  }




  

  function mostrarRegalos(lista = regalos, opts = {}) {
  const target =
    opts.container
    || document.getElementById("listaRegalos")
    || document.querySelector(".regalos-grid");

  if (!target) return;

  const FALLBACK_IMG = "assets/images/Cedro_logo.png";
  const fmtCOP = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });

  // 1) Prepara datos
  
  let data = Array.isArray(lista) ? lista.slice() : [];
    // 🔸 Excluir complementos SOLO si no se indica lo contrario (por defecto: excluir)
  if (!opts.allowComplements) {
    data = data.filter(noEsComplemento);
  }

    // 🔸 Aplica filtros de precio/lugar SOLO si no es modal (o si así lo decides)
  if (!opts.bypassFilters && typeof filtrarRegalos === "function") {
    data = filtrarRegalos(data);
  }

  // Aplica filtros SOLO si no estamos en contextos especiales (modal)
  if (!opts.bypassFilters && typeof filtrarRegalos === "function") {
    data = filtrarRegalos(data);
  }

  // Añade índice estable para ordenar (sin mutar original)
  data = data.map((it, idx) => ({ ...it, __idx: idx }));

  // 2) Ordena: primero los míos (si aplica), luego el orden original
  if (typeof hasAnyGiftMine === "function") {
    data.sort((a, b) => {
      const aMine = hasAnyGiftMine([a], nombreSeleccionado);
      const bMine = hasAnyGiftMine([b], nombreSeleccionado);
      if (aMine && !bMine) return -1;
      if (!aMine && bMine) return 1;
      return a.__idx - b.__idx;
    });
  }

  // 3) Limpia y renderiza
  target.innerHTML = "";

  data.forEach((item = {}) => {
    // Normaliza campos
    const idReal       = item.id || item.id_regalo || "";
    const nombre       = (item.nombre ?? "Regalo").toString();
    const precioNum    = typeof item.precio === "number" ? item.precio : Number(item.precio) || 0;
    const lugar        = (item.lugar ?? "").toString();
    const descripcion  = (item.descripcion ?? "").toString();
    const rawImg       = (item.img ?? item.imagen ?? item.image ?? "").toString().trim();
    const link         = (item.link ?? "").toString().trim();
    const estadoRaw    = (item.estado ?? "").toString().trim();
    const estado       = estadoRaw.toLowerCase();
    const invitado     = (item.reservado_por ?? "").toString().trim();
    const tipo         = (item.tipo ?? "").toString().trim();

    // Tarjeta
    const card = document.createElement("div");
    card.className = "gift-item";

    // Imagen (con fallback)
    const imgEl = new Image();
    const imgSrc = rawImg || FALLBACK_IMG;
    imgEl.src = imgSrc;
    imgEl.alt = nombre;
    imgEl.loading = "lazy";
    imgEl.decoding = "async";
    imgEl.referrerPolicy = "no-referrer";
    imgEl.onerror = () => {
      if (imgEl.src.includes(FALLBACK_IMG)) return;
      imgEl.onerror = null;
      imgEl.src = FALLBACK_IMG;
    };

    // Wrapper media + título (clicable si hay link)
    let mediaWrap;
    if (link) {
      mediaWrap = document.createElement("a");
      mediaWrap.href = link;
      mediaWrap.target = "_blank";
      mediaWrap.rel = "noopener noreferrer";
      mediaWrap.title = "Link para comprar";
      mediaWrap.setAttribute("aria-label", `Abrir ${nombre}`);
      mediaWrap.className = "gift-link";
    } else {
      mediaWrap = document.createElement("div");
      mediaWrap.className = "gift-link";
    }
    mediaWrap.appendChild(imgEl);

    const titleEl = document.createElement("strong");
    titleEl.textContent = nombre;
    mediaWrap.appendChild(titleEl);

    // Descripción y precio
    if (descripcion) {
      const descEl = document.createElement("small");
      descEl.textContent = descripcion;
      card.appendChild(descEl);
    }

    const priceEl = document.createElement("span");
    priceEl.className = "gift-price";
    priceEl.textContent = fmtCOP.format(precioNum);

    // Botón
    const button = document.createElement("button");
    button.className = "gift-reserve-btn";
    button.setAttribute("data-id", idReal);
    button.setAttribute("data-nombre", nombre);
    button.setAttribute("data-precio", String(precioNum));
    button.setAttribute("data-link", link);
    button.setAttribute("data-imagen", imgSrc);
    button.setAttribute("data-lugar", lugar);
    button.setAttribute("data-descripcion", descripcion);
    button.setAttribute("data-estado", estado);
    button.setAttribute("data-reservado-por", invitado);
    button.setAttribute("data-tipo", tipo);

    // Click → reutiliza tu reserveGift
    button.addEventListener("click", (e) => {
      e.stopPropagation();
      Promise.resolve(reserveGift(button)).finally(() => button.blur());
    });

    // Estado UI (reusa tu computeGiftUiState si existe; si no, fallback simple)
    const ui = (typeof computeGiftUiState === "function")
      ? computeGiftUiState(item, nombreSeleccionado)
      : (() => {
          const yo = (typeof nombreSeleccionado === "string" ? nombreSeleccionado : "").trim().toLowerCase();
          const isReservado =
            estado === "reservado" || estado === "apartado" ||
            estado === "sí" || estado === "si" || estado === "true" || estado === "1";
          const isVarios = tipo.toLowerCase() === "varios";
          if (isVarios) {
            const mio = invitado && yo && invitado.toLowerCase() === yo;
            return { disabled: false, label: mio && isReservado ? "Liberar" : "Apartar", hint: "", selected: isReservado };
          }
          if (!isReservado) return { disabled: false, label: "Apartar", hint: "", selected: false };
          const mio = invitado && yo && invitado.toLowerCase() === yo;
          if (mio) return { disabled: false, label: "Liberar", hint: "", selected: true };
          return { disabled: true, label: "Apartado ✅", hint: `Reservado por ${invitado || "otra persona"}.`, selected: true };
        })();

    button.textContent = ui.label;
    button.disabled = !!ui.disabled;
    if (ui.hint) button.title = ui.hint;

    // Estado visual de la tarjeta
    if (typeof getVisualState === "function") {
      const vstate = getVisualState(item, nombreSeleccionado);
      card.classList.toggle("selected", vstate === "mine");
      card.classList.toggle("selected-others", vstate === "others");
    } else {
      card.classList.toggle("selected", !!ui.selected);
    }

    if (ui.disabled) {
      button.style.backgroundColor = "#aaa";
      button.style.cursor = "not-allowed";
    } else {
      button.style.backgroundColor = "";
      button.style.cursor = "pointer";
    }

    // Tarjeta clicable si hay link (sin interferir con botón)
    if (link) {
      card.style.cursor = "pointer";
      card.addEventListener("click", (e) => {
        if (e.target.closest("a") || e.target.closest("button")) return;
        window.open(link, "_blank", "noopener");
      });
    }

    // Montaje (SIEMPRE en el target)
    card.appendChild(mediaWrap);
    card.appendChild(priceEl);
    card.appendChild(button);
    target.appendChild(card);
  });

  // 4) Actualizaciones de UI globales una sola vez
  if (typeof updateContinueBar === "function") updateContinueBar();
  if (typeof applyGiftView === "function") applyGiftView();
  if (typeof applyMobileView === "function") applyMobileView();
}


  function setBtnLoading(button, loading = true) {
    if (!button) return;
    if (loading) {
      button.classList.add("is-loading");
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      // Si quieres cambiar texto temporalmente:
      if (!button.dataset._txt) button.dataset._txt = button.textContent;
      button.textContent = "Procesando…";
    } else {
      button.classList.remove("is-loading");
      button.disabled = false;
      button.removeAttribute("aria-busy");
      if (button.dataset._txt) {
        button.textContent = button.dataset._txt;
        delete button.dataset._txt;
      }
    }
  }


  document.getElementById("continueBtn")?.addEventListener("click", () => {
    // Guard extra: no dejes pasar sin nombre válido
    if (!nombreSeleccionado || !guestList.includes(nombreSeleccionado)) {
      mostrarToast("¡Queremos conocerte primero! ✨ Confirma tu nombre.", "warning");
      toggleScreens("screen2");
      return;
    }
    //toggleScreens("screen4");
    openComplementModal(); 
  });

  function normalizeList(csv=""){
    return csv.split(",").map(s=>s.trim()).filter(Boolean);
  }

  function hasAnyGiftMine(lista, nombre) {
    const me = (nombre || "").trim().toLowerCase();
    if (!me) return false;

    return lista.some(item => {
      const tipo = String(item.tipo || "").toLowerCase();
      const estado = String(item.estado || "").toLowerCase();
      const invitadosRaw = (item.reservado_por || "").toString();

      if (tipo === "varios") {
        const list = normalizeList(invitadosRaw);
        return list.some(n => n.toLowerCase() === me);
      } else {
        const reservado = ["reservado","apartado","sí","si","true","1"].includes(estado);
        return reservado && invitadosRaw.trim().toLowerCase() === me;
      }
    });
  }

  function updateContinueBar() {
    const bar = document.getElementById("continueBar");
    if (!bar) return;

    const Complementmodal = document.getElementById("complementModal");
    const ComplmodalOpen = Complementmodal && Complementmodal.classList.contains("show");
    const modal = document.getElementById("complementModal");
    const modalOpen = modal && modal.classList.contains("show");

    // ¿Tiene algún regalo reservado?
    const tieneRegalo = typeof hasAnyGiftMine === "function"
      ? hasAnyGiftMine(regalos, nombreSeleccionado)
      : false;

    // Mostrar solo si tiene regalo y el modal NO está abierto
    const debeMostrar = tieneRegalo && !modalOpen && !ComplmodalOpen;

    bar.classList.toggle("hidden", !debeMostrar);
  }



  function abrirGiftInfo() {
    document.getElementById("giftInfoModal").classList.remove("hidden");
  }

  function cerrarGiftInfo() {
    document.getElementById("giftInfoModal").classList.add("hidden");
  }

  
  
  function filtrarRegalos(regalos_lista = []) {
  // 1) Si existen chips, usa uiFilters
  const hasChips = !!document.getElementById("giftFilters");
  let price = uiFilters.price;
  let place = uiFilters.place;

  // 2) Fallback a selects (si aún existen / legacy)
  if (!hasChips) {
    const precioSel = document.getElementById("filtroPrecio")?.value || "";
    const lugarSel  = document.getElementById("filtroLugar")?.value || "";

    price = (precioSel === "" ? "all" : (precioSel === "-50" ? "lt50" : (precioSel === "100+" ? "gt100" : precioSel)));
    place = (lugarSel === "" ? "all" : lugarSel);
  }

  // 3) Aplica filtros
  let out = Array.isArray(regalos_lista) ? regalos_lista.slice() : [];

  if (price && price !== "all") {
    out = out.filter(item => {
      const p = Number(item.precio) || 0;
      if (price === "lt50")    return p < 50000;
      if (price === "50-100")  return p >= 50000 && p <= 100000;
      if (price === "gt100")   return p > 100000;
      return true;
    });
  }

  if (place && place !== "all") {
    out = out.filter(item => (item.lugar || "").toString().toLowerCase() === place.toString().toLowerCase());
  }

  return out;
}

  

  
function goToNameInput() {
    document.body.classList.add('white-mode'); // activa fondo blanco
    toggleScreens("screen2"); // o mostrar la siguiente pantalla
  }  

function goToGifts() {
  const input = document.getElementById("nombre").value.trim();
  if (!guestList.includes(input)) {
    alert("Por favor, selecciona un nombre válido de la lista.");
    return;
  }
  toggleScreens("screen3");
  mostrarRegalos(regalos);
  applyMobileView();
}

  function ensureSelectedName() {
    if (!nombreSeleccionado) {
      const val = document.getElementById("nombre")?.value?.trim();
      if (val && guestList.includes(val)) nombreSeleccionado = val;
    }
    return !!nombreSeleccionado;
  }

function setInviteGuestName() {
  const el = document.getElementById("inviteGuestName");
  if (!el) return;
  const n = (nombreSeleccionado || "").trim();
  el.textContent = n ? n : "";
  el.style.display = n ? "block" : "none";
}

function toggleScreens(id) {

  // 🚧 Si quieren ir a screen3 sin nombre, redirige a screen2 con toast
  if (id === "screen4" && !ensureSelectedName()) {
    mostrarToast("¡Queremos conocerte primero! ✨ Escribe tu nombre y confirma asistencia.", "warning");
    id = "screen2"; // forzamos screen2
  }

  if (id === "screen4") {
    closeInvite();
    setInviteGuestName();
  }

  if (id !== "screen4") {
    closeInvite();
  }
  // 🚧 Si quieren ir a screen3 sin nombre, redirige a screen2 con toast
  if (id === "screen3" && !ensureSelectedName()) {
    mostrarToast("¡Queremos conocerte primero! ✨ Escribe tu nombre y confirma asistencia.", "warning");
    id = "screen2"; // forzamos screen2
  }

  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('visible');
  });
  document.getElementById(id).classList.add('visible');

  // 🟣 Actualiza progreso visual
  const stepMap = {
    screen: "step1",
    screen2: "step2",
    screen3: "step3",
    screen4: "step4"
  };

  document.querySelectorAll('.progress-bubble .step-icon').forEach(step => {
    step.classList.remove("active");
  }); 

  const stepId = stepMap[id];
  if (stepId) document.getElementById(stepId).classList.add("active");

  // 🔁 Manejo de sincronización (polling) según la pantalla
  if (id === "screen3") {
      isOnScreen3 = true;
      updateContinueBar();
      applyGiftView();

      // Abre el modal de info (si lo estás usando)
      if (typeof abrirGiftInfo === "function") abrirGiftInfo();

      // Carga o repinta regalos
      if (regalos.length === 0) {
        fetchGifts().then(() => mostrarRegalos(regalos) && applyMobileView());
      } else {
        mostrarRegalos(regalos);
        applyMobileView();
      }

      // Inicia/renueva polling
      if (syncTimer) clearInterval(syncTimer);
      if (typeof syncNow === "function") syncNow();     // primer sync rápido
      syncTimer = setInterval(() => {
        if (typeof syncNow === "function") syncNow();
      }, 6000);
    } else {
      isOnScreen3 = false;
      document.getElementById("continueBar")?.classList.add("hidden");
      // Al salir de screen3, detén polling
      if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
      if (giftsAbort) { giftsAbort.abort(); giftsAbort = null; }
  }
}

function mostrarConfirmacion(nombre) {
  document.getElementById("confirmacion").classList.remove("hidden");
  document.getElementById("btnCorregirNombre").classList.remove("hidden");
  document.getElementById("nombre").value = nombre;
  nombreSeleccionado = nombre;
}

function corregirNombre() {
  document.getElementById("nombre").value = "";
  document.getElementById("confirmacion").classList.add("hidden");
  document.getElementById("nombre").focus();
  lockGuestName(false);
}

function filterNames() {

  console.log("Ejecutando filterNames");

  const input = document.getElementById("nombre").value.toLowerCase();
  const suggestionsList = document.getElementById("suggestions"); // <-- usa otro nombre

  const matches = guestList
    .filter(n => n.toLowerCase().includes(input))
    .slice(0, 3);

  if (input === "") {
    noMatchMessage.classList.add("hidden");
    document.getElementById("addGuestBtn").classList.add("hidden");
    suggestionsList.classList.add("hidden");
    return;
  }

  if (matches.length === 0) {
    noMatchMessage.classList.remove("hidden");
    document.getElementById("addGuestBtn").classList.remove("hidden");
    suggestionsList.classList.add("hidden");
    return;
  }

  noMatchMessage.classList.add("hidden");
  document.getElementById("addGuestBtn").classList.add("hidden");
  suggestionsList.classList.remove("hidden");
  suggestionsList.innerHTML = "";

  matches.forEach(nombre => {
    const li = document.createElement("li");
    li.textContent = nombre;
    li.onclick = () => {
      document.getElementById("nombre").value = nombre;
      nombreSeleccionado = nombre;
      suggestionsList.innerHTML = "";
      mostrarConfirmacion(nombre);
      lockGuestName(true);
    };
    suggestionsList.appendChild(li);
  });
}
 

  let regaloSeleccionado = null; // nueva variable global

  async function reserveGift(button) {
    if (!button) return;
    if (uiBusy) return; 

    const id = button.dataset.id;
    const item = regalos.find(r => (r.id || r.id_regalo) === id);
    if (!item) return;

    // 🚫 Si ya se está procesando este regalo, ignorar el nuevo clic
    if (pendingReservations.has(id)) return;

    // Marcar como en proceso (estado global + spinner en botón)
    pendingReservations.add(id);
    setBtnLoading(button, true);

    // Bloquear UI completa
    lockUI("Guardando tu reserva…");   // 👈 NUEVO

    // helpers
    const toList = (s="") => s.split(",").map(x => x.trim()).filter(Boolean);
    const eq = (a="", b="") => a.toLowerCase() === b.toLowerCase();

    const tipo = (item.tipo || "").toLowerCase();
    const yo   = (nombreSeleccionado || "").trim();
    if (!yo) {
      mostrarToast("Primero confirma tu nombre.", "warning");
      pendingReservations.delete(id);
      setBtnLoading(button, false);
      unlockUI(200);                   // 👈 asegurar desbloqueo en return temprano
      return;
    }

    // --- CASO 1: VARIOS -> columna I es lista de nombres ---
    if (tipo === "varios") {
      let lista = toList(item.reservado_por);
      const yaEstoy = lista.some(n => eq(n, yo));

      // Elegir acción
      const reservar = !yaEstoy;     // si no estoy, agrego; si estoy, libero

      try {
        const res = await fetch("/.netlify/functions/updateGiftGuest", {
          method: "POST",
          body: JSON.stringify({
            id,
            reservado: reservar,     // true = agregarme | false = quitarme
            invitado: yo
          })
        });
        const data = await res.json();

        if (res.status === 409 || res.status === 403) {
          mostrarToast(data?.error || "Conflicto de reserva.", "warning");
          // refresco opcional si implementaste syncNow()
          if (typeof syncNow === "function") await syncNow();
          return;
        }
        if (!res.ok) throw new Error(data?.error || "Error de servidor");

        // Actualiza modelo local
        if (reservar) {
          if (!yaEstoy) lista.push(yo);
          item.estado = "Reservado";
          confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 } });
          mostrarRegalos(regalos);
          applyMobileView();
          refreshComplementModal();
          window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          lista = lista.filter(n => !eq(n, yo));
          item.estado = lista.length ? "Reservado" : "Disponible";
          mostrarRegalos(regalos);
          applyMobileView();
          refreshComplementModal();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        item.reservado_por = lista.join(", ");

      } catch (err) {
        console.error("❌ Error (varios):", err);
        mostrarToast("No se pudo actualizar el regalo.", "error");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } finally {
        pendingReservations.delete(id);
        setBtnLoading(button, false);
        unlockUI(600);   
        refreshComplementModal();  // ← clave
        applyMobileView();
        mostrarRegalos(regalos);
      }
      return;
    }

    // --- CASO 2: ÚNICO (o vacío => tratamos como Único por seguridad) ---
    const estado = (item.estado || "").toLowerCase();
    const invitado = (item.reservado_por || "").trim();
    const isReservado =
      estado === "reservado" || estado === "apartado" ||
      estado === "sí" || estado === "si" || estado === "true" || estado === "1";
    const soyElMismo = invitado && eq(invitado, yo);

    // decidir acción
    let action = null; // "reservar" | "liberar"
    if (!isReservado) action = "reservar";
    else if (soyElMismo) action = "liberar";
    else {
      mostrarToast(`Este regalo está reservado por ${invitado || "otra persona"}.`, "warning");
      pendingReservations.delete(id);
      setBtnLoading(button, false);
      unlockUI(200); 
      return;
    }

    try {
      const res = await fetch("/.netlify/functions/updateGiftGuest", {
        method: "POST",
        body: JSON.stringify({
          id,
          reservado: action === "reservar",
          invitado: action === "reservar" ? yo : ""
        })
      });
      const data = await res.json();

      if (res.status === 409 || res.status === 403) {
        mostrarToast(data?.error || "Conflicto de reserva.", "warning");
        if (typeof syncNow === "function") await syncNow();
        return;
      }
      if (!res.ok) throw new Error(data?.error || "Error de servidor");

      // Actualiza modelo local
      if (action === "reservar") {
        item.estado = "Reservado";
        item.reservado_por = yo;
        confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 } });
        mostrarRegalos(regalos);
        applyMobileView();
        refreshComplementModal();
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        item.estado = "Disponible";
        item.reservado_por = "";
        mostrarRegalos(regalos);
        applyMobileView();
        refreshComplementModal();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      
    } catch (err) {
      console.error("❌ Error (único):", err);
      mostrarToast("No se pudo actualizar el regalo.", "error");
    } finally {
      pendingReservations.delete(id);
      setBtnLoading(button, false);
      unlockUI(600);   
      refreshComplementModal();  // ← clave
      applyMobileView();
      mostrarRegalos(regalos);
    }
  
    // Si el modal está abierto, vuelve a renderizar allí también
    (function refreshComplementIfOpen(){
      const m = document.getElementById("complementModal");
      if (!m || !m.classList.contains("show")) return;
      const cont = document.getElementById("complementList");
      if (!cont) return;
      const complementos = (regalos || []).filter(esComplemento);
      cont.innerHTML = "";
      mostrarRegalos(complementos, { container: cont });
      if (typeof applyMobileView === "function") applyMobileView();
    })();


  }


  
  async function confirmarAsistencia(asistira) {
    lockGuestName(true);
    // Oculta las opciones de asistencia con transición
    const confirmBox = document.getElementById("confirmacion");
    const mensaje = document.getElementById("mensajeRespuesta");
    const boton = document.getElementById("verRegalosBtn");
  
    confirmBox.classList.add("hidden");
    // Oculta nombre y elementos relacionados
    document.getElementById("mensajeGuia").style.display = "none";
    document.getElementById("mensajeGuia2").style.display = "none";
    document.getElementById("nombre").style.display = "none";
    document.getElementById("suggestions").style.display = "none";
    document.querySelector(".input-wrapper").style.display = "none";
    document.getElementById("btnCorregirNombre").classList.remove("hidden");

    // ✅ Guardar en Google Sheets
    try {
      const res = await fetch("/.netlify/functions/updateAttendance", {
        method: "POST",
        body: JSON.stringify({ nombre: nombreSeleccionado, asistencia: asistira }),
      });
      const data = await res.json();
      console.log("📌 Respuesta Sheets:", data);
      } 
    catch (err) {
        console.error("❌ Error al guardar asistencia:", err);
      }
  
    // Muestra el mensaje personalizado con delay
    setTimeout(() => {
        // Efecto de confeti
        if (asistira) {
            confetti({
              particleCount: 200,
              spread: 70,
              origin: { y: 0.6 }
            });
          }          
          mensaje.innerHTML = asistira
          ? `
            <p class="mensaje-personalizado">
              ¡Qué alegría que puedas acompañarnos <span class="emoji">🎉</span><br>
              <strong class="nombre-resaltado">${nombreSeleccionado}</strong>!
            </p>
          `
          : `
            <p class="mensaje-personalizado">
              ¡Gracias por avisarnos, <strong class="nombre-resaltado">${nombreSeleccionado}</strong>!<br>
              Te tendremos presente <span class="emoji">💌</span>
            </p>
          `;       
  
      mensaje.classList.remove("hidden");
      mensaje.classList.add("visible");
  
      // Personaliza botón
      boton.textContent = asistira
      ? "Continuar a la lista de regalos 🎁"
      : "Puedes echar un vistazo a la lista de regalos 🎁";

    boton.classList.remove("hidden");

    // 🧼 Elimina clases previas de animación si las tuviera
    boton.classList.remove("animate-in");
    // 🔥 Reaplica animación con timeout para reiniciar clase
    
    setTimeout(() => {
      boton.classList.add("animate-in");
      }, 50);
    
    }, 500);
  }

  function agregarInvitado() {
    const input = document.getElementById("nombre").value.trim();
    const modal = document.getElementById("modalAgregarInvitado");
    document.getElementById("modalAgregarInvitado").classList.add("show");
    //document.getElementById("mainCard").classList.add("blur-behind");
  
    // (Opcional) prellenar el campo nombre en el modal
    if (input) {
      document.getElementById("inputNombreNuevo").value = input;
      document.getElementById("inputApellidoNuevo").focus();
    } else {
      document.getElementById("inputNombreNuevo").value = "";
      document.getElementById("inputApellidoNuevo").value = "";
      document.getElementById("inputNombreNuevo").focus();
    }
  }
  

  function cerrarModal() {
    document.getElementById("modalAgregarInvitado").classList.remove("show");
    //document.getElementById("mainCard").classList.remove("blur-behind");
  }

  function capitalizarNombre(nombre) {
    return nombre
      .trim()
      .toLowerCase()
      .split(" ")
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(" ");
  }
  
  
  async function enviarNuevoInvitado() {
    const nombre = document.getElementById("inputNombreNuevo").value.trim();
    const apellido = document.getElementById("inputApellidoNuevo").value.trim();
  
    if (!nombre || !apellido) {
      mostrarToast("Por favor ingresa nombre y apellido.","warning");
      return;
    }
  
    const nombreCompleto = capitalizarNombre(`${nombre} ${apellido}`);
  
    // ✅ Verifica si ya está en la lista
    const yaExiste = guestList.some(
      invitado => invitado.toLowerCase() === nombreCompleto.toLowerCase()
    );
  
    if (yaExiste) {
      mostrarToast(`El nombre "${nombreCompleto}" ya está registrado.`,"warning");
      cerrarModal();
      document.getElementById("nombre").value = nombreCompleto;
      selectName(nombreCompleto);
      return;
    }
  
    // ✅ Si no está, lo guarda
    const res = await fetch("/.netlify/functions/addGuest", {
      method: "POST",
      body: JSON.stringify({ nombre: nombreCompleto }),
    });
  
    if (res.ok) {
      guestList.push(nombreCompleto);
      document.getElementById("nombre").value = nombreCompleto;
      mostrarToast("Nombre agregado correctamente", "success");
      // espera de 1 segundo antes de cerrar el modal
      await new Promise(resolve => setTimeout(resolve, 1000));
      cerrarModal();
      nombreSeleccionado = nombreCompleto;
      mostrarConfirmacion(nombreCompleto);
      noMatchMessage.classList.add("hidden");
      document.getElementById("addGuestBtn").classList.add("hidden");
    } else {
      mostrarToast("No se pudo agregar. Por favor comunicate con el organizador.", "error");
    }
  }  

  function mostrarToast(mensaje, tipo = "info", duracion = 3000) {
    const toast = document.getElementById("toast");
  
    let icono = "ℹ️";
    if (tipo === "success") icono = "✅";
    else if (tipo === "error") icono = "❌";
    else if (tipo === "warning") icono = "⚠️";
  
    toast.innerHTML = `<span>${icono}</span><span>${mensaje}</span>`;
    toast.classList.add("show");
  
    setTimeout(() => {
      toast.classList.remove("show");
    }, duracion);
  }
  
// Guardar el timeout de open para poder cancelarlo si cambiamos de screen
let _openInviteTO = null;

// --- Función para habilitar la apertura de la invitación ---
// Abre la invitación solo cuando se llama explícitamente desde el onclick del botón
// Mantén esta función en el scope global:
window.openInvite = function openInvite() {
  const btn  = document.getElementById('openInvite');
  const card = btn ? btn.closest('.inv-card') : document.querySelector('.inv-card');
  if (!card) { console.warn('No se encontró .inv-card'); return; }

  // Evitar doble activación si ya está abierta o en transición
  if (card.classList.contains('open') || btn?.dataset.lock === '1') return;

  console.log('✅ Click en Invitación. Mostrando interior en 2s...');
  if (btn) btn.dataset.lock = '1';           // bloquea clicks repetidos
  if (btn) btn.setAttribute('aria-disabled', 'true');

  // Delay de 2 segundos antes de abrir (tu pedido)
  _openInviteTO = setTimeout(() => {
    card.classList.add('open');
    card.querySelector('.inv-inner')?.setAttribute('aria-hidden','false');
    if (btn) { btn.dataset.lock = '0'; btn.removeAttribute('aria-disabled'); }
    _openInviteTO = null;
    console.log('✨ Invitación abierta');
  }, 1000);
};

window.closeInvite = function closeInvite() {
  const card = document.querySelector('.inv-card');
  if (!card) return;

  // Si había un open pendiente, cancelarlo
  if (_openInviteTO) {
    clearTimeout(_openInviteTO);
    _openInviteTO = null;
  }

  // Quitar estado "open" y restaurar accesibilidad/transform
  card.classList.remove('open');
  card.querySelector('.inv-inner')?.setAttribute('aria-hidden','true');
  const cover = card.querySelector('.inv-cover');
  if (cover) {
    // volver a la posición de portada (tu CSS ya tiene transition)
    cover.style.transform = 'rotateY(0deg)';
    cover.style.opacity = ''; // por si quedó en 0 durante la transición
    cover.style.pointerEvents = ''; 
  }
};

//------------------------------------------------------------------------------------------

// --- Helpers de modal ---
const $compModal = () => document.getElementById("complementModal");
const $compList  = () => document.getElementById("complementList");

function esComplemento(item) {
  const norm = (s) => (s ?? "")
  .toString()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .trim()
  .toLowerCase();
  const cat = norm(item?.categoria);
  if (cat.includes("complemento")) return true;
  // respaldo por si alguien lo puso en "tipo"
  return norm(item?.tipo).includes("complemento");
}

function noEsComplemento(item) {
  const norm = (s) => (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  const cat  = norm(item?.categoria);
  const tipo = norm(item?.tipo);

  // Excluir si aparece "complemento" en categoría O tipo
  const esComplemento = cat.includes("complemento") || tipo.includes("complemento");
  return !esComplemento; // ← "no es complemento"
}



function openComplementModal() {
  document.getElementById("continueBar")?.classList.add("hidden");
  document.getElementById("continueBtn")?.classList.add("hidden");
  const modal = document.getElementById("complementModal");
  const cont  = document.getElementById("complementList");
  if (!modal || !cont) return;

  const complementos = (regalos || []).filter(esComplemento);
  console.log("Complementos:", complementos.length); // debug rápido

  cont.innerHTML = "";
  mostrarRegalos(complementos, { container: cont, allowComplements: true, bypassFilters: true });

  modal.classList.add("show");

  document.body.style.overflow = "hidden";
  if (typeof applyMobileView === "function") applyMobileView();
}

function closeComplementModal() {
  const modal = document.getElementById("complementModal");
  if (!modal) return;
  modal.classList.remove("show");
  document.body.style.overflow = "";
  document.getElementById("continueBar")?.classList.remove("hidden");
  document.getElementById("continueBtn")?.classList.remove("hidden");
}

function refreshComplementModal() {
  const modal = document.getElementById("complementModal");
  if (!modal || !modal.classList.contains("show")) return;

  const cont = document.getElementById("complementList");
  if (!cont) return;

  // mismo filtro robusto que ya usas
  const norm = (s) => (s ?? "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
  const esComplemento = (it) =>
    norm(it.categoria).includes("complemento") || norm(it.tipo).includes("complemento");

  const complementos = (regalos || []).filter(esComplemento);

  // repinta en el CONTENEDOR DEL MODAL usando tu mismo render
  mostrarRegalos(complementos, { container: cont, allowComplements: true, bypassFilters: true });

  // aplica los mismos ajustes de vista móvil/PC
  if (typeof applyMobileView === "function") applyMobileView();

  // sincroniza visibilidad de la barra “continuar”
  if (typeof updateContinueBar === "function") updateContinueBar();
}

//------------------------------------------------------------------------------------------


// Cierres (X, seguir viendo, clic fuera, Esc)
document.getElementById("closeComplementModal")?.addEventListener("click", closeComplementModal);
document.getElementById("keepBrowsingBtn")?.addEventListener("click", closeComplementModal);
$compModal()?.addEventListener("click", (e) => { if (e.target === e.currentTarget) closeComplementModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeComplementModal(); });

// Ir a la invitación (sin obligar a elegir complementos)
document.getElementById("goToInviteBtn")?.addEventListener("click", () => {
  closeComplementModal();
  toggleScreens("screen4");
});


//------------------------------------------------------------------------------------------


  
  window.goToNameInput = goToNameInput;
  window.filtrarRegalos = filtrarRegalos;
  window.goToGifts = goToGifts;
  window.filterNames = filterNames;
  window.reserveGift = reserveGift;
  window.confirmarAsistencia = confirmarAsistencia;
