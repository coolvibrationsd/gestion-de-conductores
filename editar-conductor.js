(function() {
    let DB;
    let idConductor;
    const formulario = document.querySelector('#formulario');
   
    const nombreInput = document.querySelector('#nombre');
    const telefonoInput = document.querySelector('#telefono');
    const licenciaInput = document.querySelector('#licencia');
    const emisionInput = document.querySelector('#emision');
    const venceInput = document.querySelector('#vence');
    const nacimientoInput = document.querySelector('#nacimiento');

    document.addEventListener('DOMContentLoaded', () => {
        conectarDB();

        formulario.addEventListener('submit', actualizarConductor);

        const parametrosURL = new URLSearchParams(window.location.search);
        idConductor = parametrosURL.get('id');
        if (idConductor) {
            setTimeout(() => {
                obtenerConductor(idConductor);
            }, 100);
        }
    });

    function conectarDB() {
        let abrirConexion = window.indexedDB.open('crm', 1);

        abrirConexion.onerror = function() {
            console.log('Hubo un error al abrir la conexión con la base de datos');
        };
     
        abrirConexion.onsuccess = function() {
            DB = abrirConexion.result;
        };
    }

    function obtenerConductor(id) {
        if (!DB) {
            console.log('No se ha podido conectar a la base de datos');
            return;
        }

        const transaction = DB.transaction(['crm'], 'readonly');
        const objectStore = transaction.objectStore('crm');

        const request = objectStore.openCursor();
        request.onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor) {
                if (cursor.value.id == id) {
                    llenarFormulario(cursor.value);
                }
                cursor.continue();
            }
        };
        request.onerror = function() {
            console.log('Hubo un error al obtener el conductor');
        };
    }

    function llenarFormulario(datosConductor) {
        const { nombre, telefono, licencia, emision, vence, nacimiento } = datosConductor;
        
        if (nombreInput && telefonoInput && licenciaInput && emisionInput && venceInput && nacimientoInput) {
            nombreInput.value = nombre;
            telefonoInput.value = telefono;
            licenciaInput.value = licencia;
            emisionInput.value = emision;
            venceInput.value = vence;
            nacimientoInput.value = nacimiento;
        } else {
            console.log('Uno o más elementos de entrada no se encontraron en el DOM');
        }
    }

    function actualizarConductor(e) {
        e.preventDefault();
    
        if (nombreInput.value === '' || telefonoInput.value === '' || licenciaInput.value === '' || emisionInput.value === '' || venceInput.value === '' || nacimientoInput.value === '') {
            imprimirAlerta('Todos los campos son obligatorios', 'error');
            return;
        }
    
        const conductorActualizado = {
            nombre: nombreInput.value,
            telefono: telefonoInput.value,
            licencia: licenciaInput.value,
            emision: emisionInput.value,
            vence: venceInput.value,
            nacimiento: nacimientoInput.value,
            id: Number(idConductor)
        };
    
        const transaction = DB.transaction(['crm'], 'readwrite');
        const objectStore = transaction.objectStore('crm');
    
        const request = objectStore.put(conductorActualizado);
        request.onsuccess = function() {
            imprimirAlerta('Editado Correctamente');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000); // Redirige a index.html después de 1 segundo
        };
        request.onerror = function(event) {
            console.log('Hubo un error al actualizar el conductor', event);
        };
    }
    

    function imprimirAlerta(mensaje, tipo) {
        const alertas = document.querySelectorAll('.alerta');
        alertas.forEach(alerta => alerta.remove());

        const divMensaje = document.createElement('div');
        divMensaje.classList.add('px-4', 'py-3', 'rounded', 'max-w-lg', 'mx-auto', 'mt-6', 'text-center');

        if (tipo === 'error') {
            divMensaje.classList.add('bg-red-100', 'border-red-400', 'text-red-700');
        } else {
            divMensaje.classList.add('bg-green-100', 'border-green-400', 'text-green-700');
        }

        divMensaje.textContent = mensaje;
        formulario.appendChild(divMensaje);

        setTimeout(() => {
            divMensaje.remove();
        }, 3000);
    }
})(); 