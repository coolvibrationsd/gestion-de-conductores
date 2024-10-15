(function () { 
    let DB;
    let DBNotificaciones
    const formulario = document.querySelector('#formulario');
    const formularioAccidentes = document.querySelector('#formAccidentes');

    document.addEventListener('DOMContentLoaded', async () => {
        try {
            await Promise.all([conectarDB(), conectarDBNotificaciones()]);
            verificarNotificaciones(); 
    
            formulario.addEventListener('submit', validarConductor);
            formularioAccidentes.addEventListener('submit', registrarAccidente);
    
            const listadoConductores = document.querySelector('#listadoConductores');
            if (listadoConductores) {
                listadoConductores.addEventListener('click', eliminarRegistro);
            } else { 
                console.error('Elemento #listadoConductores no encontrado');
            } 

            const botonExportar = document.querySelector('.text-crema-500'); // Selecciona el botón Exportar
            if (botonExportar) {
                botonExportar.addEventListener('click', exportarConductores);
            }       
            
            const botonImportar = document.querySelector('.boton-lindo'); // Selecciona el botón Importar
            if (botonImportar) {
                botonImportar.addEventListener('click', () => {
                    const inputFile = document.createElement('input');
                    inputFile.type = 'file';
                    inputFile.accept = '.json';
                    inputFile.addEventListener('change', importarConductores); // Llama a importarConductores cuando se seleccione un archivo
                    inputFile.click(); // Abre el diálogo para seleccionar un archivo
                });
            }            
    
            obtenerConductores(); 
        } catch (error) {
            console.error(error);
        }
    });
    
 function conectarDB() {
        return new Promise((resolve, reject) => {
          if (DB) {
              console.log("Reutilizando la conexión existente a la base de datos 'crm'");
              resolve();
              return;
            }

           const abrirConexion = window.indexedDB.open('crm', 2);

           abrirConexion.onerror = function () {
                console.log('Hubo un error al conectar la base de datos');
                reject(new Error('Error al conectar la base de datos'));
            };

          abrirConexion.onsuccess = function () {
              DB = abrirConexion.result; 
              console.log("Conexión a la base de datos 'crm' establecida.");
              resolve(); 
              mostrarAccidentes();
           };

          abrirConexion.onupgradeneeded = function (e) {
             const db = e.target.result;
    
             if (!db.objectStoreNames.contains('crm')) {
                 const objectStore = db.createObjectStore('crm', { keyPath: 'id', autoIncrement: true });
    
                 objectStore.createIndex('id', 'id', { unique: true });
                 objectStore.createIndex('nombre', 'nombre', { unique: false });
                 objectStore.createIndex('telefono', 'telefono', { unique: false });
                 objectStore.createIndex('licencia', 'licencia', { unique: false });
                 objectStore.createIndex('emision', 'emision', { unique: false });
                 objectStore.createIndex('vence', 'vence', { unique: false });
                 objectStore.createIndex('nacimiento', 'nacimiento', { unique: false });
               }
    
               if (!db.objectStoreNames.contains('accidentes')) {
                 const objectStore = db.createObjectStore('accidentes', { keyPath: 'id', autoIncrement: true });
    
                 objectStore.createIndex('idConductor', 'idConductor', { unique: false });
                 objectStore.createIndex('fechaAccidente', 'fechaAccidente', { unique: false });
                 objectStore.createIndex('lugarAccidente', 'lugarAccidente', { unique: false });
                 objectStore.createIndex('dineroPerdido', 'dineroPerdido', { unique: false });
                 objectStore.createIndex('descripcionAccidente', 'descripcionAccidente', { unique: false });
    
                 console.log('Object store de accidentes creado');
               }
           };
       });
    }
    
   async function conectarDBNotificaciones() {
        return new Promise((resolve, reject) => {
            if (DBNotificaciones) {
               console.log("Reutilizando la conexión existente a la base de datos 'notificaciones'");
               resolve();
               return;
            }

            const abrirConexion = window.indexedDB.open('notificaciones', 1);
    
            abrirConexion.onerror = function () {
                console.log('Hubo un error al conectar la base de datos de notificaciones');
                reject(new Error('Error al conectar la base de datos de notificaciones'));
            };

    
            abrirConexion.onsuccess = function (event) {
               DBNotificaciones = event.target.result;  
               resolve();
           };

           abrirConexion.onupgradeneeded = function (e) {
             const db = e.target.result;

              if (!db.objectStoreNames.contains('notificaciones')) {
              const objectStore = db.createObjectStore('notificaciones', { keyPath: 'id', autoIncrement: true });
    
                 objectStore.createIndex('idConductor', 'idConductor', { unique: false });
                 objectStore.createIndex('fechaNotificacion', 'fechaNotificacion', { unique: false });
                 objectStore.createIndex('tipoNotificacion', 'tipoNotificacion', { unique: false }); 
                 objectStore.createIndex('mensaje', 'mensaje', { unique: false }); 
                 objectStore.createIndex('leida', 'leida', { unique: false }); 
    
                 console.log('Base de datos de notificaciones creada');
               }
           };
       });
    }

     //para comprobar que lleguen notificaciones cuando sea realmente necesario
    function verificarNotificaciones() {
        const transaction = DB.transaction(['crm'], 'readonly');
        const objectStore = transaction.objectStore('crm');
        const hoy = new Date();
    
        objectStore.openCursor().onsuccess = function(event) {
            const cursor = event.target.result;
    
            if (cursor) {
                const { id, vence, nombre } = cursor.value;       
                const fechaLicencia = new Date(vence);
                
                if (isNaN(fechaLicencia)) {
                    console.error(`Error: La fecha de vencimiento de ${nombre} no es válida.`);
                    cursor.continue();
                    return;  
                }
    
                const diasRestantes = Math.floor((fechaLicencia - hoy) / (1000 * 60 * 60 * 24));  
    
                // Solo crea notificaciones si quedan 30 días o menos
                if (diasRestantes <= 30 && diasRestantes >= 0) {
                    const transactionNotificaciones = DBNotificaciones.transaction(['notificaciones'], 'readwrite');  
                    const objectStoreNotificaciones = transactionNotificaciones.objectStore('notificaciones');
                    const index = objectStoreNotificaciones.index('idConductor');
    
                    index.get(id).onsuccess = function(event) {
                        const notificacionExistente = event.target.result;
    
                        if (!notificacionExistente) {
                            crearNotificacion({
                                idConductor: id,
                                fechaNotificacion: hoy.toISOString(),
                                tipoNotificacion: 'Vencimiento',
                                mensaje: `La licencia de ${nombre} vencerá en ${diasRestantes} días.`,
                                leida: false
                            });
                        }
                    };
                }
                cursor.continue();
            }
        };
    
        transaction.onerror = function (error) {
            console.error('Error en la transacción:', error);
        };
    }

    function crearNotificacion(notificacion) {
        const transaction = DBNotificaciones.transaction(['notificaciones'], 'readwrite');
        const objectStore = transaction.objectStore('notificaciones');
    
        const request = objectStore.add(notificacion);
    
        request.onsuccess = () => {
            console.log('Notificación agregada correctamente');
            obtenerNotificaciones(); 
        };
    
        request.onerror = (event) => {
            console.error('Error al agregar la notificación:', event.target.error);
        };
    };
    
    function exportarConductores() {
        const transaction = DB.transaction(['crm'], 'readonly'); // Inicia una transacción de solo lectura
        const objectStore = transaction.objectStore('crm'); // Accede al almacén de datos 'crm'
    
        let conductores = []; // Array para almacenar los conductores
    
        objectStore.openCursor().onsuccess = function(event) {
            const cursor = event.target.result;
    
            if (cursor) {
                conductores.push(cursor.value); // Agrega el conductor al array
                cursor.continue(); // Continúa al siguiente conductor
            } else {
                // Cuando termina el cursor, exporta los datos a JSON
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(conductores));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                downloadAnchorNode.setAttribute("download", "conductores.json");
                document.body.appendChild(downloadAnchorNode); // Añade temporalmente el enlace de descarga
                downloadAnchorNode.click(); // Simula el clic para descargar
                downloadAnchorNode.remove(); // Elimina el enlace después de descargar
            }
        };
    
        transaction.onerror = function(error) {
            console.error('Error exportando conductores:', error);
        };
    }

    function importarConductores(event) {
        const file = event.target.files[0]; // Obtén el archivo cargado
    
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const contenido = e.target.result;
                const conductores = JSON.parse(contenido); // Convierte el contenido JSON en objetos
    
                const transaction = DB.transaction(['crm'], 'readwrite'); // Inicia una transacción de escritura
                const objectStore = transaction.objectStore('crm'); // Accede al almacén de datos 'crm'
    
                conductores.forEach(function(conductor) {
                    objectStore.add(conductor); // Añade cada conductor al almacén de datos
                });
    
                transaction.oncomplete = function() {
                    console.log('Conductores importados correctamente');
                    obtenerConductores(); // Actualiza la lista de conductores
                };
    
                transaction.onerror = function(error) {
                    console.error('Error importando conductores:', error);
                };
            };
    
            reader.readAsText(file); // Lee el archivo como texto
        }
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
    
        request.onsuccess = (e) => {
            const conductorID = e.target.result;  
            
            imprimirAlerta('Conductor agregado correctamente', 'exito');
            formulario.reset();
            obtenerConductores();
            verificarNotificaciones();
    
            const fechaHoy = new Date();
            const fechaVencimiento = new Date(conductor.vence);
            const diferencia = Math.floor((fechaVencimiento - fechaHoy) / (1000 * 60 * 60 * 24));
    
            if (diferencia <= 7 && diferencia >= 0) {
                const nuevaNotificacion = {
                    idConductor: conductorID,
                    fechaNotificacion: new Date().toISOString(),
                    tipoNotificacion: 'Vencimiento',
                    mensaje: `La licencia de ${conductor.nombre} vencerá pronto`,
                    leida: false
                };
    
                crearNotificacion(nuevaNotificacion);
            }
        };
    
        request.onerror = () => {
            imprimirAlerta('Hubo un error al agregar el conductor', 'error');
        };
    }
    
    function obtenerNotificaciones() {
        const objectStore = DBNotificaciones.transaction('notificaciones', 'readonly').objectStore('notificaciones');
        const bandeja = document.getElementById('bandejaNotificaciones');
        bandeja.innerHTML = '';  

        let numeroNotificaciones = 0;

        objectStore.openCursor().onsuccess = function (e) {
            const cursor = e.target.result;

            if (cursor) {
                const notificacion = cursor.value;

                if (!notificacion.leida) {
                    const notificacionElemento = document.createElement('div');
                    notificacionElemento.classList.add('p-2', 'border-b', 'border-gray-200');
                    notificacionElemento.innerHTML = `
                        <p><strong>${notificacion.tipoNotificacion}:</strong> ${notificacion.mensaje}</p>
                        <small>${new Date(notificacion.fechaNotificacion).toLocaleString()}</small>
                    `;

                    bandeja.appendChild(notificacionElemento);
                    numeroNotificaciones++;
                }

                cursor.continue();
               } else {
                if (bandeja.innerHTML === '') {
                    bandeja.innerHTML = '<p class="text-gray-600">No hay notificaciones</p>';
                }

                const badge = document.getElementById('badgeNotificaciones');
                if (badge) {
                    if (numeroNotificaciones > 0) {
                        badge.textContent = numeroNotificaciones;
                        badge.classList.remove('hidden');
                    } else {
                        badge.classList.add('hidden');
                    }
                }
            }
        };
    }
    
    function obtenerConductores() {
           const abrirConexion = window.indexedDB.open('crm', 2);
           const listadoConductores = document.querySelector('#listadoConductores');
           listadoConductores.innerHTML = '';

    
           abrirConexion.onerror = function () {
                  console.log('Hubo un error al obtener los conductores');
              };
        
              abrirConexion.onsuccess = function () {
                DB = abrirConexion.result;
        
                  const objectStore = DB.transaction('crm').objectStore('crm');
        
                  const listadoConductores = document.querySelector('#listadoConductores');
                  listadoConductores.innerHTML = '';
        
                  const conductores = [];
        
                  objectStore.openCursor().onsuccess = function (e) {
                      const cursor = e.target.result;
         
                      if (cursor) {
                          conductores.push(cursor.value);
                          cursor.continue();
                        } else {
                          const ordenarFechas = document.querySelector('#ordenarFechas').value;
                         if (ordenarFechas === 'asc') {
                             conductores.sort((a, b) => new Date(a.vence) - new Date(b.vence));
                         } else {
                             conductores.sort((a, b) => new Date(b.vence) - new Date(a.vence));
                            }
        
                          conductores.forEach(conductor => {
                             const { nombre, telefono, licencia, emision, vence, nacimiento, id } = conductor;
        
                             listadoConductores.innerHTML += `
                                <tr>
                                    <td class="px-6 py-3 whitespace-no-wrap border-b border-gray-200">
                                        <p class="text-crema-500">${nombre}</p>
                                    </td>
                                    <td class="px-6 py-3 whitespace-no-wrap border-b border-gray-200">
                                        <p class="text-crema-500">${telefono}</p>
                                    </td>
                                    <td class="px-6 py-3 whitespace-no-wrap border-b border-gray-200 leading-5 text-gray-700">
                                        <p class="text-crema-500">${licencia}</p>
                                    </td>
                                    <td class="px-6 py-3 whitespace-no-wrap border-b border-gray-200">
                                        <p class="text-crema-500">${emision}</p>
                                    </td>
                                    <td class="px-6 py-3 whitespace-no-wrap border-b border-gray-200">
                                        <p class="text-crema-500">${vence}</p>
                                    </td>
                                    <td class="px-6 py-3 whitespace-no-wrap border-b border-gray-200">
                                        <p class="text-crema-500">${nacimiento}</p>
                                    </td>
                                    <td class="px-6 py-3 whitespace-no-wrap border-b border-gray-200 text-sm leading-5">
                                        <a href="editar-cliente.html?id=${id}" class="text-crema-500 hover:text-teal-900 mr-5">Editar</a>
                                        <a href="#" data-conductor="${id}" class="text-red-600 hover:text-red-900 eliminar">Eliminar</a>
                                    </td>
                                </tr>`;
                        });
                    }
                };
            };
        }

        function registrarAccidente(e) {
            e.preventDefault();
        
            const nombreConductor = document.querySelector('#nombreConductor').value;
            const fechaAccidente = document.querySelector('#fechaAccidente').value;
            const lugarAccidente = document.querySelector('#lugarAccidente').value;
            const dineroPerdido = document.querySelector('#dineroPerdido').value;
            const descripcionAccidente = document.querySelector('#descripcionAccidente').value;
        
            if (nombreConductor === '' || fechaAccidente === '' || lugarAccidente === '' || dineroPerdido === '' || descripcionAccidente === '') {
                console.log('Todos los campos son obligatorios');
                return;
            }
    
           const transaction = DB.transaction(['crm'], 'readonly');
           const objectStore = transaction.objectStore('crm');
    
           const index = objectStore.index('nombre'); 
           const request = index.get(nombreConductor); 
    
          request.onsuccess = (event) => {
             const conductor = event.target.result;
             if (conductor) {
                 const idConductor = conductor.id;
    
                 const accidente = {
                    idConductor,
                    fechaAccidente,
                    lugarAccidente,
                    dineroPerdido,
                    descripcionAccidente,
                    id: Date.now() 
                };
        
                    const transactionAccidente = DB.transaction(['accidentes'], 'readwrite');
                    const objectStoreAccidente = transactionAccidente.objectStore('accidentes');
                    const requestAccidente = objectStoreAccidente.add(accidente);
        
                    requestAccidente.onsuccess = () => {
                        console.log('Accidente registrado correctamente');
                        mostrarAccidentes();
                        formularioAccidentes.reset();
                    };
        
                    requestAccidente.onerror = () => {
                        console.log('Hubo un error al registrar el accidente');
                    };
                } else {
                    console.log('No se encontró el conductor');
                }
            };
        }
   
        function mostrarAccidentes() {
                const listadoAccidentes = document.querySelector('#listadoAccidentes');
                listadoAccidentes.innerHTML = ''; 
            
                const transaction = DB.transaction(['accidentes'], 'readonly');
                const objectStore = transaction.objectStore('accidentes');
            
                objectStore.openCursor().onsuccess = function(e) {
                    const cursor = e.target.result;
            
                    if (cursor) {
                        const {idConductor, fechaAccidente, lugarAccidente, dineroPerdido, descripcionAccidente } = cursor.value;
            
                        if (idConductor) { 
                            const transactionConductor = DB.transaction(['crm'], 'readonly');
                            const objectStoreConductor = transactionConductor.objectStore('crm');
                            const requestConductor = objectStoreConductor.get(idConductor);
            
                            requestConductor.onsuccess = function(event) {
                                const conductor = event.target.result;
            
                                if (conductor && typeof idConductor === 'number') {
                                    listadoAccidentes.innerHTML += `
                                    <div class="card bg-white shadow-lg rounded-lg p-6 mb-4">
                                        <h3 class="text-xl font-bold text-blue-500 mb-2">Conductor: ${conductor.nombre}</h3>
                                        <p class="text-gray-600"><strong>Fecha del Accidente:</strong> ${fechaAccidente}</p>
                                        <p class="text-gray-600"><strong>Lugar del Accidente:</strong> ${lugarAccidente}</p>
                                        <p class="text-gray-600"><strong>Gastos:</strong> ${dineroPerdido}</p>
                                        <p class="text-gray-600"><strong>Descripción:</strong> ${descripcionAccidente}</p>
                                    </div>
                                    `;
                                } else {
                                    console.log(`Conductor con ID ${idConductor} no encontrado. El accidente será eliminado.`);
                                    eliminarAccidente(idConductor); 
                                }
                            };
            
                            requestConductor.onerror = function() {
                                console.log(`Error al buscar el conductor con ID ${idConductor}`);
                            };
                        } else {
                            console.log('ID de conductor no válido para este accidente, omitiendo...');
                        }
            
                        cursor.continue();
                    }
                };
            }
            
        document.querySelector('#ordenarFechas').addEventListener('change', obtenerConductores);

       function eliminarAccidente(idConductor) {
            const transaction = DB.transaction(['accidentes'], 'readwrite');
            const objectStore = transaction.objectStore('accidentes');
            
            const index = objectStore.index('idConductor');
            const request = index.openCursor();
        
            request.onsuccess = function(e) {
                const cursor = e.target.result;
                
                if (cursor) {
                    const accidente = cursor.value;
        
                    if (accidente.idConductor === idConductor) {
                        cursor.delete(); 
                        console.log(`Accidente del conductor ${idConductor} eliminado.`);
                    }
        
                    cursor.continue();
                  } else {
                    
                    mostrarAccidentes();
                }
            };
        
            request.onerror = function() {
                console.log('Error al intentar eliminar el accidente.');
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
    
                    request.onsuccess = function () {
                        console.log('Conductor eliminado');
                        eliminarAccidente(idEliminar);
                        e.target.parentElement.parentElement.remove();
                        obtenerConductores(); 
                    };
    
                    request.onerror = function () {
                        console.log('Hubo un error al eliminar');
                    };
                }
            }
        }

        function imprimirAlerta(mensaje, tipo) {
            const alertaExistente = formulario.querySelector('.alerta');
            if (alertaExistente) {
            alertaExistente.remove();
           }
    
            const divMensaje = document.createElement('div');
            divMensaje.classList.add("px-3", "py-3", "rounded", "max-w-lg", "mx-auto", "mt-6", "text-center");
    
            if (tipo === 'error') {
                divMensaje.classList.add('bg-red-700', "border-red-700", "text-red-600");
            } else {
                divMensaje.classList.add('bg-green-700', "border-green-700", "text-green-100");
            }
    
            divMensaje.textContent = mensaje;
            formulario.appendChild(divMensaje);
    
            setTimeout(() => {
                divMensaje.remove();
            }, 3000);
        }
         
        document.getElementById("iconoNotificaciones").addEventListener("click", function() {
            const bandeja = document.getElementById('bandejaNotificaciones');
            const badge = document.getElementById('badgeNotificaciones');
        
            bandeja.classList.toggle('hidden');
        
            if (!bandeja.classList.contains('hidden')) {
                if (badge) {
                    badge.classList.add('hidden');
                }
        
                marcarNotificacionesComoLeidas();
            }
        });
        
        function marcarNotificacionesComoLeidas() {
            const abrirConexion = window.indexedDB.open('notificaciones', 1);
        
            abrirConexion.onsuccess = function() {
                const DBNotificaciones = abrirConexion.result;
                const transaction = DBNotificaciones.transaction(['notificaciones'], 'readwrite');
                const objectStore = transaction.objectStore('notificaciones');
        
                objectStore.openCursor().onsuccess = function(e) {
                    const cursor = e.target.result;
        
                    if (cursor) {
                        const notificacion = cursor.value;
        
                        if (!notificacion.leida) {
                            notificacion.leida = true;
                            objectStore.put(notificacion);
                        }
        
                        cursor.continue();
                    }
                };
            };
        }

        document.getElementById("iconoNotificaciones").addEventListener("click", function() {
            const bandeja = document.getElementById('bandejaNotificaciones');
           
            if (bandeja.classList.contains('visible')) {
                bandeja.classList.remove('visible'); 
                setTimeout(() => bandeja.style.display = 'none', 500); 
            } else {
                bandeja.style.display = 'block'; 
                setTimeout(() => bandeja.classList.add('visible'), 10); 
            }
            });
        
            document.addEventListener("DOMContentLoaded", function() {
                conectarDBNotificaciones(function() {
                    obtenerNotificaciones();
                });
            }); 

            let lastScrollPosition = 0;
            const header = document.querySelector('header');
            
            window.addEventListener('scroll', () => {
                let currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
            
                if (currentScrollPosition > lastScrollPosition) {
                    header.style.top = '-100px'; 
                } else {
                    header.style.top = '0';
                }
            
                lastScrollPosition = currentScrollPosition;
            });
        
})();