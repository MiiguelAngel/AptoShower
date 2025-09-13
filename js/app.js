let guestList = [];

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

  async function fetchGifts() {
    try {
      const res = await fetch("/.netlify/functions/getGifts");
      const data = await res.json();

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
        reservado_por: r.reservado_por || ""
      }));

      console.log("🎁 Regalos cargados:", regalos);
    } catch (err) {
      console.error("❌ Error cargando regalos:", err);
    }
  }

  
  function mostrarRegalos(lista) {

  function esUrlImagen(url = "") {
    // valida extensión común de imagen y permite querystrings
    return /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i.test(url);
  }

  const FALLBACK_IMG = "assets/images/Cedro_logo.png";
  const fmtCOP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

  const contenedor = document.getElementById("listaRegalos");
  if (!contenedor) return;
  contenedor.innerHTML = "";

  lista.forEach((item = {}) => {
    // Normaliza campos esperados
    const id          = item.id || item.id_regalo || "";
    const nombre      = item.nombre || "Regalo";
    const precioNum   = typeof item.precio === "number" ? item.precio : Number(item.precio) || 0;
    const lugar       = item.lugar || "";
    const descripcion = item.descripcion || "";
    const rawImg      = (item.img ?? "").toString().trim();
    const link        = item.link || "";
    const estado      = (item.estado || "").toLowerCase().trim();

    // Decide la fuente inicial de la imagen
    const initialImg = rawImg && esUrlImagen(rawImg) ? rawImg : (rawImg || FALLBACK_IMG);

    // Tarjeta
    const card = document.createElement("div");
    card.className = "gift-item";

    // Imagen con fallback y lazy load (creada por DOM, no innerHTML)
    const imgEl = new Image();
    imgEl.alt = nombre;
    imgEl.loading = "lazy";
    imgEl.decoding = "async";
    imgEl.referrerPolicy = "no-referrer";
    imgEl.src = initialImg;
    imgEl.onerror = () => {
      // evitar bucle si FALLBACK falla
      if (imgEl.src.includes(FALLBACK_IMG)) return;
      imgEl.onerror = null;
      imgEl.src = FALLBACK_IMG;
    };

    // Título (link si existe)
    let titleEl;
    if (link) {
      const a = document.createElement("a");
      a.href = link;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.textContent = nombre;
      titleEl = document.createElement("strong");
      titleEl.appendChild(a);
    } else {
      titleEl = document.createElement("strong");
      titleEl.textContent = nombre;
    }

    // Descripción y precio
    const descEl = document.createElement("small");
    descEl.textContent = descripcion;

    const priceEl = document.createElement("span");
    priceEl.className = "gift-price";
    priceEl.textContent = fmtCOP.format(precioNum);

    // Botón
    const button = document.createElement("button");
    button.textContent = "Apartar";
    button.className = "gift-reserve-btn";
    button.onclick = () => reserveGift(button);

    // Atributos data-* (usa la URL efectiva o fallback)
    const effectiveImg = initialImg || FALLBACK_IMG;
    button.setAttribute("data-id", id);
    button.setAttribute("data-nombre", nombre);
    button.setAttribute("data-precio", String(precioNum));
    button.setAttribute("data-link", link);
    button.setAttribute("data-imagen", effectiveImg);  // <- consistente con otros flujos
    button.setAttribute("data-lugar", lugar);
    button.setAttribute("data-descripcion", descripcion);

    // Estado reservado
    if (estado === "reservado" || estado === "apartado") {
      button.textContent = "Apartado ✅";
      button.disabled = true;
      card.classList.add("selected");
      button.style.backgroundColor = "#aaa";
      button.style.cursor = "not-allowed";
    }

    // Montaje
    card.appendChild(imgEl);
    card.appendChild(titleEl);
    card.appendChild(descEl);
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
        if (precio === "-50") return item.precio < 50;
        if (precio === "50-100") return item.precio >= 50 && item.precio <= 100;
        if (precio === "100+") return item.precio > 100;
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

  function reserveGift(button) {
      // 1. Leer datos del botón seleccionado
    const id = button.dataset.id;

    async function actualizarEstadoRegalo(id, reservado, Invitado) {
      // ✅ Guardar en Google Sheets
      try {
        const res = await fetch("/.netlify/functions/updateGiftGuest", {
          method: "POST",
          body: JSON.stringify({ id: id, reservado: reservado, invitado: Invitado }),
        });
        const data = await res.json();
        console.log("📌 Respuesta Sheets:", data);
        } 
      catch (err) {
          console.error("❌ Error al guardar asistencia:", err);
        }
    }

    if (regaloSeleccionado && regaloSeleccionado !== button) {
      regaloSeleccionado.textContent = "Apartar";
      regaloSeleccionado.disabled = false;
      regaloSeleccionado.style.backgroundColor = "";
      regaloSeleccionado.parentElement.classList.remove("selected");
      actualizarEstadoRegalo(id, false, nombreSeleccionado); // libera el regalo previo
    }
  
    if (regaloSeleccionado === button) {
      button.textContent = "Apartar";
      button.disabled = false;
      button.style.backgroundColor = "";
      button.parentElement.classList.remove("selected");
      regaloSeleccionado = null;
      actualizarEstadoRegalo(id, false, nombreSeleccionado); // libera el regalo previo
      
    } else {
      button.textContent = "Apartado ✅";
      button.disabled = false;
      button.style.backgroundColor = "#aaa";
      button.parentElement.classList.add("selected");
      regaloSeleccionado = button;
      actualizarEstadoRegalo(id, true, nombreSeleccionado); // marca como reservado
  
      confetti({
        particleCount: 200,
        spread: 70,
        origin: { y: 0.6 }
      });
  
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
