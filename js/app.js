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
  });

  document.getElementById("nombre").addEventListener("focus", () => {
    setTimeout(() => {
      document.getElementById("nombre").scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }, 300); // espera a que aparezca el teclado
  });
  
const regalos = [
    {
      nombre: "Portavasos decorativos",
      lugar: "Sala",
      precio: 30000,
      descripcion: "Perfectos para proteger tus muebles con estilo",
      imagen: "https://via.placeholder.com/60?text=Portavasos"
    },
    {
      nombre: "Lámpara LED de ambiente",
      lugar: "Sala",
      precio: 75000,
      descripcion: "Ilumina con calidez cualquier rincón",
      imagen: "https://via.placeholder.com/60?text=Lámpara"
    },
    {
      nombre: "Juego de cucharas medidoras",
      lugar: "Cocina",
      precio: 28000,
      descripcion: "Para que cada receta te salga perfecta",
      imagen: "https://via.placeholder.com/60?text=Cucharas"
    },
    {
      nombre: "Freidora de aire",
      lugar: "Cocina",
      precio: 180000,
      descripcion: "Cocina saludable y rápida sin aceite",
      imagen: "https://via.placeholder.com/60?text=Freidora"
    },
    {
      nombre: "Organizador de cajones",
      lugar: "Habitación",
      precio: 42000,
      descripcion: "Ordena tu ropa con facilidad",
      imagen: "https://via.placeholder.com/60?text=Organizador"
    },
    {
      nombre: "Set de sábanas 300 hilos",
      lugar: "Habitación",
      precio: 95000,
      descripcion: "Suavidad y confort para un mejor descanso",
      imagen: "https://via.placeholder.com/60?text=Sábanas"
    },
    {
      nombre: "Cuadro abstracto",
      lugar: "Decoración",
      precio: 65000,
      descripcion: "Dale un toque moderno a tu pared",
      imagen: "https://via.placeholder.com/60?text=Cuadro"
    },
    {
      nombre: "Plantas artificiales",
      lugar: "Decoración",
      precio: 48000,
      descripcion: "Verde eterno sin cuidados",
      imagen: "https://via.placeholder.com/60?text=Plantas"
    },
    {
      nombre: "Cafetera básica",
      lugar: "Cocina",
      precio: 99000,
      descripcion: "Comienza el día con energía",
      imagen: "https://via.placeholder.com/60?text=Cafetera"
    },
    {
      nombre: "Portarretratos múltiple",
      lugar: "Decoración",
      precio: 38000,
      descripcion: "Muestra tus mejores recuerdos",
      imagen: "https://via.placeholder.com/60?text=Fotos"
    },
    {
      nombre: "Almohadas viscoelásticas",
      lugar: "Habitación",
      precio: 120000,
      descripcion: "Comodidad y soporte para dormir mejor",
      imagen: "https://via.placeholder.com/60?text=Almohadas"
    }
  ];
  
  function mostrarRegalos(lista) {
    const contenedor = document.getElementById("listaRegalos");
    contenedor.innerHTML = "";
  
    lista.forEach(item => {
      const div = document.createElement("div");
      div.className = "gift-item";
      div.innerHTML = `
        <img src="${item.imagen}" alt="${item.nombre}" />
        <strong>${item.nombre}</strong>
        <small>${item.descripcion}</small>
        <button onclick="reserveGift(this)">Apartar</button>
      `;
      contenedor.appendChild(div);
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
    screen1: "step1",
    screen2: "step2",
    screen3: "step3"
  };

  document.querySelectorAll('.progress-bubble .step-icon').forEach(step => {
    step.classList.remove("active");
  }); 

  const stepId = stepMap[id];
  if (stepId) document.getElementById(stepId).classList.add("active");
}

function mostrarConfirmacion(nombre) {
  document.getElementById("confirmacion").classList.remove("hidden");
  document.getElementById("nombre").value = nombre;
  nombreSeleccionado = nombre;
}


function filterNames() {

  console.log("Ejecutando filterNames");

  const input = document.getElementById("nombre").value.toLowerCase();
  const suggestionsList = document.getElementById("suggestions"); // <-- usa otro nombre

  const matches = guestList
    .filter(n => n.toLowerCase().startsWith(input))
    .slice(0, 3);

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
    if (regaloSeleccionado && regaloSeleccionado !== button) {
      regaloSeleccionado.textContent = "Apartar";
      regaloSeleccionado.disabled = false;
      regaloSeleccionado.style.backgroundColor = "";
      regaloSeleccionado.parentElement.classList.remove("selected");
    }
  
    if (regaloSeleccionado === button) {
      button.textContent = "Apartar";
      button.disabled = false;
      button.style.backgroundColor = "";
      button.parentElement.classList.remove("selected");
      regaloSeleccionado = null;
  
      // Oculta mensaje final si se deselecciona
      document.getElementById("mensajeFinal").classList.remove("visible");
    } else {
      button.textContent = "Apartado ✅";
      button.disabled = false;
      button.style.backgroundColor = "#aaa";
      button.parentElement.classList.add("selected");
  
      regaloSeleccionado = button;
  
      confetti({
        particleCount: 200,
        spread: 70,
        origin: { y: 0.6 }
      });
  
      // 🥳 Mostrar mensaje de cierre
      setTimeout(() => {
        const mensajeFinal = document.getElementById("mensajeFinal");
        mensajeFinal.classList.remove("hidden");
        mensajeFinal.classList.add("visible");
      }, 500);
    }
  }
  
  function confirmarAsistencia(asistira) {
    // Oculta las opciones de asistencia con transición
    const confirmBox = document.getElementById("confirmacion");
    const mensaje = document.getElementById("mensajeRespuesta");
    const boton = document.getElementById("verRegalosBtn");
  
    confirmBox.classList.add("hidden");
    // Oculta nombre y elementos relacionados
    document.getElementById("mensajeGuia").style.display = "none";
    document.querySelector('label[for="nombre"]').style.display = "none";
    document.getElementById("nombre").style.display = "none";
    document.getElementById("suggestions").style.display = "none";
  
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
        ? `¡Qué alegría que puedas acompañarnos, ${nombreSeleccionado}! <span class="emoji">🎉</span>`
        : `¡Gracias, ${nombreSeleccionado}! Te tendremos presente <span class="emoji">💌</span>`;        
  
      mensaje.classList.remove("hidden");
      mensaje.classList.add("visible");
  
      // Personaliza botón
      boton.textContent = asistira
        ? "Elige el regalo perfecto 🎁"
        : "Elige un regalo si deseas enviarnos uno 💝";
  
      boton.classList.remove("hidden");

        // 🔥 Agrega la animación flash aquí:
        boton.classList.add("flash");
        setTimeout(() => boton.classList.remove("flash"), 1000);
    }, 500);
  }

  function agregarInvitado() {
    const input = document.getElementById("nombre").value.trim();
    const modal = document.getElementById("modalAgregarInvitado");
    document.getElementById("modalAgregarInvitado").classList.add("show");
  
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
      cerrarModal();
      selectName(nombreCompleto);
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
  
  
  
  
  window.goToNameInput = goToNameInput;
  window.filtrarRegalos = filtrarRegalos;
  window.goToGifts = goToGifts;
  window.filterNames = filterNames;
  window.reserveGift = reserveGift;
  window.confirmarAsistencia = confirmarAsistencia;
