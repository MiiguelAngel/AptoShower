let guestList = [];

let syncTimer = null;

async function syncNow() {
  await fetchGifts(true); // true = bust cache
  mostrarRegalos(regalos);
}

// Al recuperar foco de la pestaña, sincroniza una vez
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    syncNow();
  }
});

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
        tipo: r.tipo || "" 
      }));

      console.log("🎁 Regalos cargados:", regalos);
    } catch (err) {
      console.error("❌ Error cargando regalos:", err);
    }
  }

  function parseGift(item = {}) {
    const estado = String(item.estado ?? "").trim().toLowerCase();
    const invitado = (item.reservado_por ?? "").toString().trim();
    const tipo = String(item.tipo ?? "").trim().toLowerCase();

    const isReservado =
      estado === "reservado" ||
      estado === "apartado" ||
      estado === "sí" || estado === "si" ||
      estado === "true" || estado === "1";

    const isVarios = tipo === "varios";
    const isUnico  = tipo === "único" || tipo === "unico";

    return { isReservado, invitado, isVarios, isUnico };
  }

  function computeGiftUiState(item, nombre) {
    const { isReservado, invitado, isVarios, isUnico } = parseGift(item);
    const yo = (nombre ?? "").toString().trim();

    if (isVarios) {
      return {
        disabled: false,
        label: isReservado && invitado.toLowerCase() === yo.toLowerCase() ? "Liberar" : "Apartar",
        canReservar: true,
        canLiberar: invitado.toLowerCase() === yo.toLowerCase(),
        hint: "Este regalo permite varias selecciones."
      };
    }

    // Por defecto tratamos como Único si K está vacío
    const unico = isUnico || !isVarios;

    if (unico) {
      if (!isReservado) {
        return {
          disabled: false,
          label: "Apartar",
          canReservar: true,
          canLiberar: false,
          hint: "Disponible para reservar."
        };
      }
      const mio = invitado && yo && invitado.toLowerCase() === yo.toLowerCase();
      return mio
        ? { disabled: false, label: "Liberar", canReservar: false, canLiberar: true, hint: "Lo reservaste tú. Puedes liberarlo." }
        : { disabled: true,  label: "Apartado ✅", canReservar: false, canLiberar: false, hint: `Reservado por ${invitado || "otra persona"}.` };
    }
  }

  
  function mostrarRegalos(lista) {
    const FALLBACK_IMG = "assets/images/Cedro_logo.png";
    const fmtCOP = new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0
    });

    const contenedor = document.getElementById("listaRegalos");
    if (!contenedor) return;
    contenedor.innerHTML = "";

    lista.forEach((item = {}) => {
      // Normaliza campos
      const id          = item.id || item.id_regalo || "";
      const nombre      = (item.nombre ?? "Regalo").toString();
      const precioNum   = typeof item.precio === "number" ? item.precio : Number(item.precio) || 0;
      const lugar       = (item.lugar ?? "").toString();
      const descripcion = (item.descripcion ?? "").toString();
      const rawImg      = (item.img ?? item.imagen ?? item.image ?? "").toString().trim();
      const link        = (item.link ?? "").toString().trim();
      const estado      = (item.estado ?? "").toString().toLowerCase().trim();

      // Tarjeta
      const card = document.createElement("div");
      card.className = "gift-item";

      // Imagen con fallback y lazy load
      const imgEl = new Image();
      const imgSrc = rawImg || FALLBACK_IMG;
      imgEl.src = imgSrc;
      imgEl.alt = nombre;
      imgEl.loading = "lazy";
      imgEl.decoding = "async";
      imgEl.referrerPolicy = "no-referrer";
      imgEl.onerror = () => {
        if (imgEl.src.includes(FALLBACK_IMG)) return; // evita bucle
        imgEl.onerror = null;
        imgEl.src = FALLBACK_IMG;
      };

      // Contenedor de media + título (clicable si hay link)
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
      const descEl = document.createElement("small");
      descEl.textContent = descripcion;

      const priceEl = document.createElement("span");
      priceEl.className = "gift-price";
      priceEl.textContent = fmtCOP.format(precioNum);

      // Botón

      const button = document.createElement("button");
      button.className = "gift-reserve-btn";
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        reserveGift(button);
      });

      // Atributos data-* (usando la imagen efectiva)
      button.setAttribute("data-id", id);
      button.setAttribute("data-nombre", nombre);
      button.setAttribute("data-precio", String(precioNum));
      button.setAttribute("data-link", link);
      button.setAttribute("data-imagen", imgSrc);
      button.setAttribute("data-lugar", lugar);
      button.setAttribute("data-descripcion", descripcion);
      button.setAttribute("data-estado", estado);
      button.setAttribute("data-reservado-por", item.reservado_por ?? "");
      button.setAttribute("data-tipo", item.tipo ?? "");


      // ✅ NUEVO: pinta según reglas con el nombreSeleccionado
      const invitado       = (item.reservado_por ?? "").toString().trim();
      const tipo           = (item.tipo ?? "").toString().trim();

      const yo = (typeof nombreSeleccionado === "string" ? nombreSeleccionado : "").trim();
      const isReservado =
        estado === "reservado" || estado === "apartado" ||
        estado === "sí" || estado === "si" ||
        estado === "true" || estado === "1";

      const isVarios = tipo.toLowerCase() === "varios";
      const isUnico  = tipo.toLowerCase() === "único" || tipo.toLowerCase() === "unico";

      // Función auxiliar inline para decidir UI (si ya agregaste computeGiftUiState, puedes usarla aquí)
      function decideUi() {
        if (isVarios) {
          const mio = invitado && yo && invitado.toLowerCase() === yo.toLowerCase();
          return {
            disabled: false,
            label: mio && isReservado ? "Liberar" : "Apartar",
            hint: "Este regalo permite varias selecciones.",
            selected: isReservado
          };
        }

        // Tratar vacío/desconocido como Único por seguridad
        const unico = isUnico || !isVarios;

        if (unico) {
          if (!isReservado) {
            return { disabled: false, label: "Apartar", hint: "Disponible para reservar.", selected: false };
          }
          const mio = invitado && yo && invitado.toLowerCase() === yo.toLowerCase();
          if (mio) {
            return { disabled: false, label: "Liberar", hint: "Lo reservaste tú. Puedes liberarlo.", selected: true };
          }
          return { disabled: true, label: "Apartado ✅", hint: `Reservado por ${invitado || "otra persona"}.`, selected: true };
        }

        // Fallback
        return { disabled: false, label: "Apartar", hint: "", selected: false };
      }

      const ui = decideUi();

      // Aplica UI
      button.textContent = ui.label;
      button.disabled = !!ui.disabled;
      if (ui.hint) button.title = ui.hint;

      // Estilos de tarjeta/btn según estado
      if (ui.selected) {
        card.classList.add("selected");
      } else {
        card.classList.remove("selected");
      }
      button.style.backgroundColor = ui.disabled ? "#aaa" : "";
      button.style.cursor = ui.disabled ? "not-allowed" : "pointer";


      // (Opcional) Hacer toda la tarjeta clicable si hay link
      if (link) {
        card.style.cursor = "pointer";
        card.addEventListener("click", (e) => {
          // evita abrir dos veces si el click fue sobre <a> o sobre el botón
          if (e.target.closest("a") || e.target.closest("button")) return;
          window.open(link, "_blank", "noopener");
        });
      }

      // Montaje
      card.appendChild(mediaWrap);
      if (descripcion) card.appendChild(descEl);
      card.appendChild(priceEl);
      card.appendChild(button);
      contenedor.appendChild(card);
    });
  }
  
  
  function filtrarRegalos() {
    const precio = document.getElementById("filtroPrecio").value;
    const lugar = document.getElementById("filtroLugar").value;
  
    let filtrados = regalos;
  
    if (precio) {
      filtrados = filtrados.filter(item => {
        if (precio === "-50") return item.precio < 50000;
        if (precio === "50-100") return item.precio >= 50000 && item.precio <= 100000;
        if (precio === "100+") return item.precio > 100000;
      });
    }
  
    if (lugar) {
      filtrados = filtrados.filter(item => item.lugar === lugar);
    }
  
    mostrarRegalos(filtrados);
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
}

function toggleScreens(id) {
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

  // ✅ Si el usuario entra a screen3, pintamos los regalos
  if (id === "screen3") {
    // Si todavía no cargamos regalos, los traemos ahora
    if (regalos.length === 0) {
      fetchGifts().then(() => mostrarRegalos(regalos));
    } else {
      mostrarRegalos(regalos);
    }
  }

  if (id === "screen3") {
    if (syncTimer) clearInterval(syncTimer);
      // Primer sync rápido
      syncNow();
      // Polling cada 6s (ajústalo si quieres)
      syncTimer = setInterval(syncNow, 6000);
    } else {
      if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
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
    
    };
    suggestionsList.appendChild(li);
  });
}
 

  let regaloSeleccionado = null; // nueva variable global

  async function reserveGift(button) {
    if (!button) return;
    const id = button.dataset.id;
    const item = regalos.find(r => (r.id || r.id_regalo) === id);
    if (!item) return;

    // helpers
    const toList = (s="") => s.split(",").map(x => x.trim()).filter(Boolean);
    const eq = (a="", b="") => a.toLowerCase() === b.toLowerCase();

    const tipo = (item.tipo || "").toLowerCase();
    const yo   = (nombreSeleccionado || "").trim();
    if (!yo) { mostrarToast("Primero confirma tu nombre.", "warning"); return; }

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
        } else {
          lista = lista.filter(n => !eq(n, yo));
          item.estado = lista.length ? "Reservado" : "Disponible";
        }
        item.reservado_por = lista.join(", ");

        if (reservar) confetti({ particleCount: 200, spread: 70, origin: { y: 0.6 } });
        mostrarRegalos(regalos);
      } catch (err) {
        console.error("❌ Error (varios):", err);
        mostrarToast("No se pudo actualizar el regalo.", "error");
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
      } else {
        item.estado = "Disponible";
        item.reservado_por = "";
      }

      mostrarRegalos(regalos);
    } catch (err) {
      console.error("❌ Error (único):", err);
      mostrarToast("No se pudo actualizar el regalo.", "error");
    }
  }


  
  async function confirmarAsistencia(asistira) {
    // Oculta las opciones de asistencia con transición
    const confirmBox = document.getElementById("confirmacion");
    const mensaje = document.getElementById("mensajeRespuesta");
    const boton = document.getElementById("verRegalosBtn");
  
    confirmBox.classList.add("hidden");
    // Oculta nombre y elementos relacionados
    document.getElementById("mensajeGuia").style.display = "none";
    document.getElementById("nombre").style.display = "none";
    document.getElementById("suggestions").style.display = "none";
    document.querySelector(".input-wrapper").style.display = "none";

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
      ? "Elige el regalo perfecto 🎁"
      : "Elige un regalo si deseas enviarnos uno 💝";

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
  setTimeout(() => {
    card.classList.add('open');

    const inner = card.querySelector('.inv-inner');
    if (inner) inner.setAttribute('aria-hidden', 'false');

    if (btn) {
      btn.dataset.lock = '0';
      btn.removeAttribute('aria-disabled');
    }
    console.log('✨ Invitación abierta');
  }, 1000);
};

  
  window.goToNameInput = goToNameInput;
  window.filtrarRegalos = filtrarRegalos;
  window.goToGifts = goToGifts;
  window.filterNames = filterNames;
  window.reserveGift = reserveGift;
  window.confirmarAsistencia = confirmarAsistencia;
