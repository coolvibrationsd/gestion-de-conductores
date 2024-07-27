(function () {
    let DB;
    const formulario = document.querySelector('#formulario');

    document.addEventListener('DOMContentLoaded', () => {
        formulario.addEventListener('submit', validarConductor);
        conectarDB();
    });

    function conectarDB() {
        let abrirConexion = window.indexedDB.open('crm', 1);

        abrirConexion.onerror = function() {
            console.log('Hubo un error al conectar la base de datos');
        };

        abrirConexion.onsuccess = function() {
            DB = abrirConexion.result;
        };

        abrirConexion.onupgradeneeded = function(e) {
            const db = e.target.result;
            const objectStore = db.createObjectStore('crm', { keyPath: 'id', autoIncrement: true });

            objectStore.createIndex('nombre', 'nombre', { unique: true });
            objectStore.createIndex('telefono', 'telefono', { unique: true });
            objectStore.createIndex('licencia', 'licencia', { unique: true });
            objectStore.createIndex('emision', 'emision', { unique: false });
            objectStore.createIndex('vence', 'vence', { unique: false });
            objectStore.createIndex('nacimiento', 'nacimiento', { unique: false });

            console.log('Base de datos creada');
        };
    }

    function validarConductor(e) {
        e.preventDefault();

        const nombre = document.querySelector('#nombre').value;
        const telefono = document.querySelector('#telefono').value;
        const licencia = document.querySelector('#licencia').value;
        const emision = document.querySelector('#emision').value;
        const vence = document.querySelector('#vence').value;
        const nacimiento = document.querySelector('#nacimiento').value;

        if (nombre === '' || telefono === '' || licencia === '' || emision === '' || vence === '' || nacimiento === '') {
            imprimirAlerta('Todos los campos son obligatorios', 'error');
            return;
        }

        const conductor = {
            nombre,
            telefono,
            licencia,
            emision,
            vence,
            nacimiento,
            id: Date.now()
        };

        crearNuevoConductor(conductor);
    }

    function crearNuevoConductor(conductor) {
        const transaction = DB.transaction(['crm'], 'readwrite');
        const objectStore = transaction.objectStore('crm');

        const request = objectStore.add(conductor);

        request.onsuccess = () => {
            imprimirAlerta('Conductor agregado correctamente', 'exito');
            formulario.reset();
        };

        request.onerror = () => {
            imprimirAlerta('Hubo un error al agregar el conductor', 'error');
        };
    }

    function imprimirAlerta(mensaje, tipo) {
        const divMensaje = document.createElement('div');
        divMensaje.classList.add("px-4", "py-3", "rounded", "max-w-lg", "mx-auto", "mt-6", "text-center");

        if (tipo === 'error') {
            divMensaje.classList.add('bg-red-100', "border-red-400", "text-red-700");
        } else {
            divMensaje.classList.add('bg-green-100', "border-green-400", "text-green-700");
        }

        divMensaje.textContent = mensaje;
        formulario.appendChild(divMensaje);

        setTimeout(() => {
            divMensaje.remove();
        }, 3000);
    }
})();

(function () {
    let DB;

    document.addEventListener('DOMContentLoaded', () => {
        conectarDB();
        if (window.indexedDB.open('crm', 1)) {
            obtenerConductores();
        }

        const listadoConductores = document.querySelector('#listadoConductores');
        if (listadoConductores) {
            listadoConductores.addEventListener('click', eliminarRegistro);
        } else {
            console.error('Elemento #listadoConductores no encontrado');
        }
    });

    function conectarDB() {
        const abrirConexion = window.indexedDB.open('crm', 1);

        abrirConexion.onerror = function() {
            console.log('Hubo un error');
        };

        abrirConexion.onsuccess = function() {
            DB = abrirConexion.result;
        };
    }

    function obtenerConductores() {
        const abrirConexion = window.indexedDB.open('crm', 1);

        abrirConexion.onerror = function() {
            console.log('hubo un error');
        };

        abrirConexion.onsuccess = function() {
            DB = abrirConexion.result;

            const objectStore = DB.transaction('crm').objectStore('crm');

            objectStore.openCursor().onsuccess = function(e) {
                const cursor = e.target.result;

                if (cursor) {
                    const { nombre, telefono, licencia, emision, vence, nacimiento, id } = cursor.value;
                    const listadoConductores = document.querySelector('#listadoConductores');
                    listadoConductores.innerHTML += `
                        <tr>
                            <td class="px-6 py-4 whitespace-no-wrap border-b border-gray-200">
                                <p class="text-sm leading-5 font-medium text-gray-700 text-lg font-bold">${nombre}</p>
                                <p class="text-sm leading-10 text-gray-700">${telefono}</p>
                            </td>
                            <td class="px-6 py-4 whitespace-no-wrap border-b border-gray-200">
                                <p class="text-gray-700">${telefono}</p>
                            </td>
                            <td class="px-6 py-4 whitespace-no-wrap border-b border-gray-200 leading-5 text-gray-700">
                                <p class="text-gray-600">${licencia}</p>
                            </td>
                            <td class="px-6 py-4 whitespace-no-wrap border-b border-gray-200">
                                <p class="text-gray-700">${emision}</p>
                            </td>
                            <td class="px-6 py-4 whitespace-no-wrap border-b border-gray-200">
                                <p class="text-gray-600">${vence}</p>
                            </td>
                            <td class="px-6 py-4 whitespace-no-wrap border-b border-gray-200">
                                <p class="text-gray-700">${nacimiento}</p>
                            </td>
                            <td class="px-6 py-4 whitespace-no-wrap border-b border-gray-200 text-sm leading-5">
                                <a href="editar-cliente.html?id=${id}" class="text-teal-600 hover:text-teal-900 mr-5">Editar</a>
                                <a href="#" data-conductor="${id}" class="text-red-600 hover:text-red-900 eliminar">Eliminar</a>
                            </td>
                        </tr>`;
                    cursor.continue();
                } else {
                    console.log('No hay más registros');
                }
            };
        };
    }

    function eliminarRegistro(e) {
        if (e.target.classList.contains('eliminar')) {
            const idEliminar = Number(e.target.dataset.conductor);

            const confirmar = confirm('¿Deseas eliminar este conductor?');

            if (confirmar) {
                const transaction = DB.transaction(['crm'], 'readwrite');
                const objectStore = transaction.objectStore('crm');

                const request = objectStore.delete(idEliminar);

                request.onsuccess = function() {
                    console.log('Conductor eliminado');
                    e.target.parentElement.parentElement.remove();
                };

                request.onerror = function() {
                    console.log('Hubo un error al eliminar');
                };
            }
        }
    }

    function fetchNotifications() {
        fetch('/notifications')
            .then(response => response.json())
            .then(notifications => {
                notifications.forEach(notification => {
                    alert(notification.message); // Mostrar la notificación
                    // Alternativamente, puedes usar una librería para mostrar notificaciones
                });
            });
    }
    
    setInterval(fetchNotifications, 60000); // Verificar notificaciones cada minuto
    

})();

