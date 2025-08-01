document.addEventListener('DOMContentLoaded', () => {

    // Prevenir scroll horizontal en dispositivos móviles
    function prevenirScrollHorizontal() {
        // Prevenir scroll horizontal con eventos de touch
        let startX = 0;
        let startY = 0;
        
        document.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });
        
        document.addEventListener('touchmove', function(e) {
            if (!startX || !startY) return;
            
            const deltaX = Math.abs(e.touches[0].clientX - startX);
            const deltaY = Math.abs(e.touches[0].clientY - startY);
            
            // Si el movimiento horizontal es mayor que el vertical, prevenir el scroll
            if (deltaX > deltaY) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Prevenir scroll horizontal con la rueda del mouse
        document.addEventListener('wheel', function(e) {
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                e.preventDefault();
            }
        }, { passive: false });
        
        // Prevenir scroll horizontal con teclas de dirección
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
            }
        });
    }
    
    // Inicializar prevención de scroll horizontal
    prevenirScrollHorizontal();

    const buscadorInput = document.getElementById('buscador-ciudad');
    const sugerenciasDiv = document.getElementById('sugerencias');
    const listaCiudadesDiv = document.getElementById('lista-ciudades');
    const timeSlider = document.getElementById('time-slider');
    const infoTiempoDiv = document.getElementById('info-tiempo');
    const resetTimeBtn = document.getElementById('reset-time-btn');
    const decrementTimeBtn = document.getElementById('decrement-time-btn');
    const incrementTimeBtn = document.getElementById('increment-time-btn');

    let todasLasCiudades = [];
    let ciudadesSeleccionadas = [];
    let desfaseMinutos = 0;

    async function inicializar() {
        try {
            const response = await fetch('ciudades_mundo.json');
            if (!response.ok) {
                throw new Error(`No se pudo cargar el archivo de ciudades.`);
            }
            todasLasCiudades = await response.json();
            
            let ciudadesGuardadas = null;
            try {
                const guardado = localStorage.getItem('ciudadesSeleccionadas');
                if (guardado) {
                    ciudadesGuardadas = JSON.parse(guardado);
                    if (!Array.isArray(ciudadesGuardadas)) ciudadesGuardadas = null;
                }
            } catch (e) {
                console.warn("No se pudieron cargar las ciudades guardadas.");
            }

            if (ciudadesGuardadas && ciudadesGuardadas.length > 0) {
                ciudadesSeleccionadas = ciudadesGuardadas
                    .map(g => todasLasCiudades.find(c => c.timezone === g.timezone))
                    .filter(Boolean); // Filtra nulos si una ciudad ya no existe
            }
            
            if (ciudadesSeleccionadas.length === 0) {
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
            const valorActual = parseInt(timeSlider.value, 10);
            let valorRedondeado = Math.round(valorActual / 15) * 15;

            // Si el valor redondeado es 1440 (24:00), lo tratamos como 0 (00:00)
            if (valorRedondeado >= 1440) {
                valorRedondeado = 0;
            }
            
            timeSlider.value = valorRedondeado;
            
            const ahora = new Date();
            const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
            desfaseMinutos = valorRedondeado - minutosActuales;
            
            const porcentaje = (valorRedondeado / 1439) * 100;
            timeSlider.style.background = `linear-gradient(90deg, var(--color-primario) ${porcentaje}%, var(--color-borde) ${porcentaje}%)`;
            
            actualizarHoras();
        });

        resetTimeBtn.addEventListener('click', () => {
            resetearSlider();
            actualizarHoras();
        });

        decrementTimeBtn.addEventListener('click', () => ajustarTiempo(-15));
        incrementTimeBtn.addEventListener('click', () => ajustarTiempo(15));
    }

    function ajustarTiempo(minutos) {
        let valorActual = parseInt(timeSlider.value, 10);
        let nuevoValor = valorActual + minutos;

        if (nuevoValor < 0) {
            nuevoValor = 1425; // El último valor múltiplo de 15 (23:45)
        } else if (nuevoValor >= 1440) {
            nuevoValor = 0;
        }
        
        timeSlider.value = nuevoValor;
        timeSlider.dispatchEvent(new Event('input'));
    }

    function ajustarTiempo(minutos) {
        let valorActual = parseInt(timeSlider.value, 10);
        let nuevoValor = valorActual + minutos;

        if (nuevoValor < 0) {
            nuevoValor = 1425; // El último valor múltiplo de 15 (23:45)
        } else if (nuevoValor >= 1440) {
            nuevoValor = 0;
        }
        
        timeSlider.value = nuevoValor;
        timeSlider.dispatchEvent(new Event('input'));
    }

    function mostrarSugerencias() {
        const texto = buscadorInput.value.toLowerCase().trim();
        sugerenciasDiv.innerHTML = '';
        
        let sugerencias;
        let titulo = '';

        if (texto === '') {
            titulo = '<div class="sugerencia-titulo">Ciudades Populares</div>';
            sugerencias = todasLasCiudades.slice(0, 15);
        } else {
            sugerencias = todasLasCiudades.filter(ciudad => {
                const textoBusqueda = texto.toLowerCase();
                return ciudad.ciudad.toLowerCase().includes(textoBusqueda) || 
                       ciudad.ciudad_en.toLowerCase().includes(textoBusqueda) ||
                       (ciudad.pais && ciudad.pais.toLowerCase().includes(textoBusqueda));
            });
        }

        sugerenciasDiv.innerHTML = titulo;
        if (sugerencias.length > 0) {
            sugerencias.forEach(ciudad => {
                const div = document.createElement('div');
                div.className = 'sugerencia';
                div.innerHTML = `${ciudad.ciudad}, <small>${ciudad.pais}</small>`;
                div.addEventListener('click', () => agregarCiudad(ciudad.timezone));
                sugerenciasDiv.appendChild(div);
            });
        } else if (texto !== '') {
            sugerenciasDiv.innerHTML += '<div class="sugerencia-none">No se encontraron resultados</div>';
        }

        sugerenciasDiv.style.display = 'block';
    }
    
    function agregarCiudad(timezone) {
        if (!ciudadesSeleccionadas.some(c => c.timezone === timezone)) {
            const ciudadAAgregar = todasLasCiudades.find(c => c.timezone === timezone);
            if (ciudadAAgregar) ciudadesSeleccionadas.push(ciudadAAgregar);
        }
        buscadorInput.value = '';
        sugerenciasDiv.style.display = 'none';
        renderizarTodo();
    }
    
    function eliminarCiudad(timezone, elementoTarjeta) {
        // Escuchar a que la animación termine, y SÓLO ENTONCES eliminar el elemento.
        elementoTarjeta.addEventListener('animationend', () => {
            ciudadesSeleccionadas = ciudadesSeleccionadas.filter(c => c.timezone !== timezone);
            localStorage.setItem('ciudadesSeleccionadas', JSON.stringify(ciudadesSeleccionadas));
            elementoTarjeta.remove();

            if (ciudadesSeleccionadas.length === 0) {
                renderizarTodo();
            }
        }, { once: true }); // { once: true } asegura que esto solo se ejecute una vez.

        // Iniciar la animación
        elementoTarjeta.classList.add('eliminando');
    }
    
    function getEstadoCompatibilidad(hora) {
        if (hora >= 9 && hora < 18) return 'verde';
        if (hora >= 7 && hora < 22) return 'amarillo';
        return 'rojo';
    }
    
    function renderizarTodo() {
        localStorage.setItem('ciudadesSeleccionadas', JSON.stringify(ciudadesSeleccionadas));
        listaCiudadesDiv.innerHTML = '';

        if (ciudadesSeleccionadas.length === 0) {
            listaCiudadesDiv.innerHTML = '<p style="text-align:center; color: #5f6368;">Añade una ciudad para empezar.</p>';
            return;
        }

        const tiempoBase = new Date(new Date().getTime() + desfaseMinutos * 60 * 1000);
        const opcionesFecha = { weekday: 'long', month: 'long', day: 'numeric' };
        infoTiempoDiv.textContent = `Mostrando horario para el ${tiempoBase.toLocaleDateString('es-ES', opcionesFecha)}`;

        ciudadesSeleccionadas.forEach(ciudad => {
            const formateador = new Intl.DateTimeFormat('es-ES', { timeZone: ciudad.timezone, hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', weekday: 'short', hour12: false });
            const parts = formateador.formatToParts(tiempoBase);
            const data = Object.fromEntries(parts.map(p => [p.type, p.value]));

            const horaLocal = parseInt(data.hour, 10);
            const estado = getEstadoCompatibilidad(horaLocal);
            
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
                eliminarCiudad(ciudad.timezone, tarjeta);
            });

            listaCiudadesDiv.appendChild(tarjeta);
        });
    }

    function resetearSlider() {
        const ahora = new Date();
        const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
        timeSlider.value = minutosActuales;
        desfaseMinutos = 0;
        
        const porcentaje = (minutosActuales / 1439) * 100;
        timeSlider.style.background = `linear-gradient(90deg, var(--color-primario) ${porcentaje}%, var(--color-borde) ${porcentaje}%)`;
    }

    function inicializarSlider() {
        const ahora = new Date();
        const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
        const minutosRedondeados = Math.round(minutosActuales / 15) * 15;
        timeSlider.value = minutosRedondeados;
        desfaseMinutos = 0;
        
        const porcentaje = (minutosRedondeados / 1439) * 100;
        timeSlider.style.background = `linear-gradient(90deg, var(--color-primario) ${porcentaje}%, var(--color-borde) ${porcentaje}%)`;
    }

    function actualizarHoras() {
        const tiempoBase = new Date(new Date().getTime() + desfaseMinutos * 60 * 1000);
        
        const opcionesFecha = { weekday: 'long', month: 'long', day: 'numeric' };
        infoTiempoDiv.textContent = `Mostrando horario para el ${tiempoBase.toLocaleDateString('es-ES', opcionesFecha)}`;
        
        const tarjetas = document.querySelectorAll('.tarjeta-ciudad');
        tarjetas.forEach(tarjeta => {
            const timezone = tarjeta.dataset.timezone;
            const ciudad = todasLasCiudades.find(c => c.timezone === timezone);
            
            if (ciudad) {
                const formateador = new Intl.DateTimeFormat('es-ES', { 
                    timeZone: ciudad.timezone, hour: '2-digit', minute: '2-digit', 
                    day: '2-digit', month: 'short', weekday: 'short', hour12: false 
                });
                const parts = formateador.formatToParts(tiempoBase);
                const data = Object.fromEntries(parts.map(p => [p.type, p.value]));

                const horaLocal = parseInt(data.hour, 10);
                const estado = getEstadoCompatibilidad(horaLocal);
                
                const fechaDisplay = tarjeta.querySelector('.fecha-display');
                const horaDisplay = tarjeta.querySelector('.hora-display');
                const puntoCompatibilidad = tarjeta.querySelector('.punto-compatibilidad');
                
                if (fechaDisplay) fechaDisplay.textContent = `${data.weekday}, ${data.day} ${data.month}`;
                if (horaDisplay) horaDisplay.textContent = `${data.hour}:${data.minute}`;
                if (puntoCompatibilidad) puntoCompatibilidad.className = `punto-compatibilidad ${estado}`;
            }
        });
    }

    inicializar();
});