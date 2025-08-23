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


function filterNames() {
    console.log("Ejecutando filterNames");
    document.getElementById("addGuestBtn").classList.add("hidden");
    const input = document.getElementById("nombre").value.toLowerCase();
    const suggestions = guestList
      .filter(n => n.toLowerCase().startsWith(input))
      .slice(0, 3); // Limita a 3 resultados

    if (suggestions.length === 0) {
      noMatchMessage.classList.remove("hidden");
      document.getElementById("addGuestBtn").classList.remove("hidden");
      suggestions.classList.add("hidden");
      return;
    }
  

    noMatchMessage.classList.add("hidden");
    document.getElementById("addGuestBtn").classList.add("hidden");
    suggestions.classList.remove("hidden");
    const list = document.getElementById("suggestions");
    list.innerHTML = "";
  
    suggestions.forEach(nombre => {
      const li = document.createElement("li");
      li.textContent = nombre;
      li.onclick = () => {
        document.getElementById("nombre").value = nombre;
        nombreSeleccionado = nombre; // <-- guarda el nombre
        list.innerHTML = "";
          // Mostrar opciones de confirmación de asistencia
        document.getElementById("confirmacion").classList.remove("hidden");

        // También podrías ocultar mensaje de error por si quedó abierto
        document.getElementById("noMatchMessage").classList.add("hidden");
        document.getElementById("addGuestBtn").classList.add("hidden");
      };
      list.appendChild(li);
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

  async function agregarInvitado() {
    const input = document.getElementById("nombre").value.trim();
    if (!input) return;
  
    const btn = document.getElementById("addGuestBtn");
    btn.disabled = true;
    btn.textContent = "Agregando...";
  
    const res = await fetch("/.netlify/functions/addGuest", {
      method: "POST",
      body: JSON.stringify({ nombre: input }),
    });
  
    if (res.ok) {
      btn.textContent = "¡Agregado!";
      guestList.push(input); // Agrega a la lista local también
      setTimeout(() => {
        selectName(input);
      }, 800);
    } else {
      btn.textContent = "Error al agregar";
      console.error(await res.text());
    }
  
    btn.disabled = false;
  }  
  
  window.goToNameInput = goToNameInput;
  window.filtrarRegalos = filtrarRegalos;
  window.goToGifts = goToGifts;
  window.filterNames = filterNames;
  window.reserveGift = reserveGift;
  window.confirmarAsistencia = confirmarAsistencia;
