document.addEventListener('DOMContentLoaded', () => {

    // --- 1. REFERENCIAS A ELEMENTOS DEL DOM ---
    const buscadorInput = document.getElementById('buscador-ciudad');
    const sugerenciasDiv = document.getElementById('sugerencias');
    const listaCiudadesDiv = document.getElementById('lista-ciudades');
    const timeSlider = document.getElementById('time-slider');
    const infoTiempoDiv = document.getElementById('info-tiempo');
    const resetTimeBtn = document.getElementById('reset-time-btn');

    // --- 2. ESTADO DE LA APLICACIÓN ---
    let todasLasCiudades = [];
    let ciudadesSeleccionadas = [];
    let desfaseMinutos = 0;

    // --- 3. FUNCIONES ---

    /**
     * Carga el JSON inicial y configura la aplicación
     */
    async function inicializar() {
        try {
            const response = await fetch('ciudades_mundo.json');
            if (!response.ok) {
                throw new Error(`No se pudo cargar el archivo de ciudades.`);
            }
            todasLasCiudades = await response.json();
            
            // Cargar ciudades guardadas en localStorage, si existen, de forma segura
            let ciudadesGuardadas = null;
            try {
                ciudadesGuardadas = JSON.parse(localStorage.getItem('ciudadesSeleccionadas'));
                if (!Array.isArray(ciudadesGuardadas)) {
                    ciudadesGuardadas = null; // Si no es un array, es inválido
                }
            } catch (e) {
                console.warn("No se pudo parsear las ciudades guardadas, se usarán las de por defecto.");
                ciudadesGuardadas = null;
            }

            if (ciudadesGuardadas && ciudadesGuardadas.length > 0) {
                ciudadesSeleccionadas = ciudadesGuardadas;
            } else {
                // Añadir un par de ciudades por defecto si no hay nada guardado
                ciudadesSeleccionadas.push(todasLasCiudades.find(c => c.timezone === 'America/Santiago'));
                ciudadesSeleccionadas.push(todasLasCiudades.find(c => c.timezone === 'Europe/Madrid'));
            }

            configurarEventListeners();
            inicializarSlider();
            renderizarTodo();

        } catch (error) {
            console.error("Error fatal al inicializar:", error);
            listaCiudadesDiv.innerHTML = "Error al cargar datos. No se puede iniciar la aplicación.";
        }
    }

    function configurarEventListeners() {
        buscadorInput.addEventListener('input', mostrarSugerencias);
        buscadorInput.addEventListener('focus', mostrarSugerencias);
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.buscador-container')) {
                sugerenciasDiv.style.display = 'none';
            }
        });
        

        
        timeSlider.addEventListener('input', () => {
            // Forzar que el valor sea múltiplo de 15
            const valorActual = parseInt(timeSlider.value, 10);
            const valorRedondeado = Math.round(valorActual / 15) * 15;
            
            timeSlider.value = valorRedondeado;
            
            const ahora = new Date();
            const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
            desfaseMinutos = valorRedondeado - minutosActuales;
            
            // Actualizar el gradiente del slider
            const porcentaje = (valorRedondeado / 1439) * 100;
            timeSlider.style.background = `linear-gradient(90deg, var(--color-primario) 0% ${porcentaje}%, var(--color-borde) ${porcentaje}% 100%)`;
            
            // Solo actualizar las horas sin re-renderizar todo
            actualizarHoras();
        });

        resetTimeBtn.addEventListener('click', () => {
            resetearSlider();
            actualizarHoras();
        });
    }

    function mostrarSugerencias() {
        const texto = buscadorInput.value.toLowerCase().trim();
        sugerenciasDiv.innerHTML = '';
        if (!texto) {
            sugerenciasDiv.style.display = 'none';
            return;
        }

        const sugerencias = todasLasCiudades.filter(ciudad => {
            const textoBusqueda = texto.toLowerCase();
            return ciudad.ciudad.toLowerCase().includes(textoBusqueda) || 
                   ciudad.ciudad_en.toLowerCase().includes(textoBusqueda) ||
                   (ciudad.pais && ciudad.pais.toLowerCase().includes(textoBusqueda));
        });

        if (sugerencias.length > 0) {
            sugerencias.forEach(ciudad => {
                const div = document.createElement('div');
                div.className = 'sugerencia';
                div.innerHTML = `${ciudad.ciudad}, <small>${ciudad.pais}</small>`;
                div.addEventListener('click', () => agregarCiudad(ciudad.timezone));
                sugerenciasDiv.appendChild(div);
            });
            sugerenciasDiv.style.display = 'block';
        } else {
            sugerenciasDiv.style.display = 'none';
        }
    }
    
    function agregarCiudad(timezone) {
        const yaExiste = ciudadesSeleccionadas.some(c => c.timezone === timezone);
        if (!yaExiste) {
            const ciudadAAgregar = todasLasCiudades.find(c => c.timezone === timezone);
            if (ciudadAAgregar) {
                ciudadesSeleccionadas.push(ciudadAAgregar);
            }
        }
        buscadorInput.value = '';
        sugerenciasDiv.style.display = 'none';
        renderizarTodo();
    }
    
    function eliminarCiudad(timezone) {
        ciudadesSeleccionadas = ciudadesSeleccionadas.filter(c => c.timezone !== timezone);
        renderizarTodo();
    }
    
    function getEstadoCompatibilidad(hora) {
        if (hora >= 9 && hora < 18) return 'verde';
        if (hora >= 7 && hora < 22) return 'amarillo';
        return 'rojo';
    }
    
    function renderizarTodo() {
        localStorage.setItem('ciudadesSeleccionadas', JSON.stringify(ciudadesSeleccionadas));

        listaCiudadesDiv.innerHTML = '';

        const tiempoBase = new Date(new Date().getTime() + desfaseMinutos * 60 * 1000);
        
        const opcionesFecha = { weekday: 'long', month: 'long', day: 'numeric' };
        infoTiempoDiv.textContent = `Horas para el ${tiempoBase.toLocaleDateString('es-ES', opcionesFecha)}`;

        ciudadesSeleccionadas.forEach(ciudad => {
            const formateador = new Intl.DateTimeFormat('es-ES', { timeZone: ciudad.timezone, hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', weekday: 'short', hour12: false });
            const parts = formateador.formatToParts(tiempoBase);
            const data = Object.fromEntries(parts.map(p => [p.type, p.value]));

            const horaLocal = parseInt(data.hour, 10);
            const estado = getEstadoCompatibilidad(horaLocal);
            
            // Obtener el desfase UTC (ej: "UTC-4")
            const utcOffset = new Intl.DateTimeFormat('en-US', {
                timeZone: ciudad.timezone,
                timeZoneName: 'shortOffset',
            }).formatToParts(tiempoBase).find(p => p.type === 'timeZoneName')?.value || '';
            
            const tarjeta = document.createElement('div');
            tarjeta.className = 'tarjeta-ciudad';
            tarjeta.dataset.timezone = ciudad.timezone;
            tarjeta.innerHTML = `
                <div class="info-ciudad">
                    <h2>${ciudad.ciudad}</h2>
                    <p>${ciudad.pais ? `${ciudad.pais} &bull; ` : ''}${utcOffset}</p>
                </div>
                <div class="info-hora">
                    <div class="fecha-display">${data.weekday}, ${data.day} ${data.month}</div>
                    <div class="hora-display">${data.hour}:${data.minute}</div>
                    <div class="punto-compatibilidad ${estado}"></div>
                    <button class="btn-eliminar-ciudad" title="Eliminar">&times;</button>
                </div>
            `;
            
            tarjeta.querySelector('.btn-eliminar-ciudad').addEventListener('click', (e) => {
                e.stopPropagation();
                eliminarCiudad(ciudad.timezone);
            });

            listaCiudadesDiv.appendChild(tarjeta);
        });
    }

    function resetearSlider() {
        const ahora = new Date();
        const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
        const minutosRedondeados = Math.round(minutosActuales / 15) * 15;
        timeSlider.value = minutosRedondeados;
        desfaseMinutos = 0;
        
        // Resetear el gradiente del slider
        const porcentaje = (minutosRedondeados / 1439) * 100;
        timeSlider.style.background = `linear-gradient(90deg, var(--color-primario) 0% ${porcentaje}%, var(--color-borde) ${porcentaje}% 100%)`;
    }

    function inicializarSlider() {
        const ahora = new Date();
        const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
        const minutosRedondeados = Math.round(minutosActuales / 15) * 15;
        timeSlider.value = minutosRedondeados;
        desfaseMinutos = 0;
        
        // Inicializar el gradiente del slider
        const porcentaje = (minutosRedondeados / 1439) * 100;
        timeSlider.style.background = `linear-gradient(90deg, var(--color-primario) 0% ${porcentaje}%, var(--color-borde) ${porcentaje}% 100%)`;
    }

    function actualizarHoras() {
        const tiempoBase = new Date(new Date().getTime() + desfaseMinutos * 60 * 1000);
        
        // Actualizar la información de tiempo
        const opcionesFecha = { weekday: 'long', month: 'long', day: 'numeric' };
        infoTiempoDiv.textContent = `Horas para el ${tiempoBase.toLocaleDateString('es-ES', opcionesFecha)}`;
        
        // Actualizar solo las horas en las tarjetas existentes
        const tarjetas = document.querySelectorAll('.tarjeta-ciudad');
        tarjetas.forEach(tarjeta => {
            const timezone = tarjeta.dataset.timezone;
            const ciudad = ciudadesSeleccionadas.find(c => c.timezone === timezone);
            
            if (ciudad) {
                const formateador = new Intl.DateTimeFormat('es-ES', { 
                    timeZone: ciudad.timezone, 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    day: '2-digit', 
                    month: 'short', 
                    weekday: 'short', 
                    hour12: false 
                });
                const parts = formateador.formatToParts(tiempoBase);
                const data = Object.fromEntries(parts.map(p => [p.type, p.value]));

                const horaLocal = parseInt(data.hour, 10);
                const estado = getEstadoCompatibilidad(horaLocal);
                
                // Actualizar solo los elementos de tiempo
                const fechaDisplay = tarjeta.querySelector('.fecha-display');
                const horaDisplay = tarjeta.querySelector('.hora-display');
                const puntoCompatibilidad = tarjeta.querySelector('.punto-compatibilidad');
                
                if (fechaDisplay) fechaDisplay.textContent = `${data.weekday}, ${data.day} ${data.month}`;
                if (horaDisplay) horaDisplay.textContent = `${data.hour}:${data.minute}`;
                if (puntoCompatibilidad) {
                    puntoCompatibilidad.className = `punto-compatibilidad ${estado}`;
                }
            }
        });
    }

    inicializar();
});