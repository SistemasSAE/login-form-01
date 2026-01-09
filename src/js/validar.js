// validar.js - Sistema de simulación de inicio de sesión para SAE

// Función para obtener parámetros de la URL
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Función para mostrar notificaciones
function mostrarNotificacion(mensaje, tipo = 'info') {
    // Remover notificaciones anteriores
    const notificacionesAnteriores = document.querySelectorAll('.sae-notificacion');
    notificacionesAnteriores.forEach(notif => notif.remove());

    // Crear elemento de notificación
    const notificacion = document.createElement('div');
    notificacion.className = `sae-notificacion alert alert-${tipo} alert-dismissible fade show`;
    notificacion.setAttribute('role', 'alert');
    
    notificacion.innerHTML = `
        <strong>${tipo === 'success' ? 'Éxito!' : tipo === 'error' ? 'Error!' : 'Información:'}</strong> ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Estilos para la notificación
    notificacion.style.cssText = `
        background-color: #ffffff;
        color: #000000;
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        cursor: pointer;
    `;
    
    // Añadir evento click para cerrar al hacer clic en cualquier parte
    notificacion.addEventListener('click', function(e) {
        // Solo cerrar si no se hace clic en el botón de cierre (el botón maneja su propio cierre)
        if (!e.target.closest('.btn-close')) {
            this.remove();
        }
    });
    
    document.body.appendChild(notificacion);
    
    // Auto-eliminar después de 15 segundos
    const timeoutId = setTimeout(() => {
        if (notificacion.parentNode) {
            notificacion.remove();
        }
    }, 15000);
    
    // Agregar funcionalidad al botón de cerrar
    const closeBtn = notificacion.querySelector('.btn-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevenir que el clic se propague al div de notificación
            notificacion.remove();
            clearTimeout(timeoutId); // Limpiar el timeout si se cierra manualmente
        });
    }
}

// Función para simular una petición al servidor
async function simularPeticionServidor(datos) {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Simular respuesta del servidor
            const respuesta = {
                success: true,
                usuario: {
                    nombre: datos.nombreUsuario,
                    tipo: determinarTipoUsuario(),
                    periodo: datos.periodo || null
                }
            };
            resolve(respuesta);
        }, 800); // Simular retardo de red
    });
}

// Función para determinar el tipo de usuario basado en la página actual
function determinarTipoUsuario() {
    const path = window.location.pathname;
    if (path.includes('estudiante')) return 'estudiante';
    if (path.includes('personal')) return 'personal';
    if (path.includes('plantel')) return 'plantel';
    if (path.includes('representante')) return 'representante';
    return 'usuario';
}

// Función para cargar usuarios desde el JSON
async function cargarUsuarios() {
    try {
        const response = await fetch('../data/usuario.json');
        if (!response.ok) {
            throw new Error('No se pudo cargar el archivo de usuarios');
        }
        const data = await response.json();
        return data.usuarios;
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        // Usar usuarios por defecto si no se puede cargar el archivo
        return [
            { usuario: "juanperez", nombre: "Juan Perez", email: "juan.perez@example.com", password: "123456" },
            { usuario: "marialopez", nombre: "Maria Lopez", email: "maria.lopez@example.com", password: "123456" },
            { usuario:"admin", nombre: "Admin", email: "admin@ejemplo.com", password: "123456" }
        ];
    }
}

// Función para validar credenciales
async function validarCredenciales(usuario, contrasena) {
    const usuarios = await cargarUsuarios();
    
    // Buscar usuario por email o nombre de usuario
    const usuarioEncontrado = usuarios.find(u => 
        u.nombre === usuario || u.usuario.toLowerCase().includes(usuario.toLowerCase())
    );
    
    if (!usuarioEncontrado) {
        return { 
            success: false, 
            mensaje: 'Usuario no encontrado.' 
        };
    }
    
    if (usuarioEncontrado.password !== contrasena) {
        return { 
            success: false, 
            mensaje: 'Contraseña incorrecta.' 
        };
    }
    
    return { 
        success: true, 
        usuario: usuarioEncontrado 
    };
}

// Función para validar formulario de plantel (tiene período adicional)
function validarFormularioPlantel(formData) {
    const periodo = document.getElementById('periodo')?.value;
    
    if (!periodo || periodo === '0') {
        return { 
            success: false, 
            mensaje: 'Por favor, seleccione un período válido' 
        };
    }
    
    formData.periodo = periodo;
    return { success: true, formData };
}

// Función para manejar el inicio de sesión
async function manejarInicioSesion(event) {
    event.preventDefault();
    
    // Obtener elementos del formulario
    const formulario = event.target.closest('form');
    const usuarioInput = formulario.querySelector('input[type="text"]');
    const contrasenaInput = formulario.querySelector('input[type="password"]');
    
    if (!usuarioInput || !contrasenaInput) {
        mostrarNotificacion('Formulario no válido', 'error');
        return;
    }
    
    const usuario = usuarioInput.value.trim();
    const contrasena = contrasenaInput.value;
    
    // Validaciones básicas
    if (!usuario || !contrasena) {
        mostrarNotificacion('Por favor, complete todos los campos', 'error');
        return;
    }
    
    // Deshabilitar botón mientras se procesa
    const botonInicio = formulario.querySelector('button[type="button"]');
    const textoOriginal = botonInicio.textContent;
    botonInicio.textContent = 'Validando...';
    botonInicio.disabled = true;
    
    try {
        // Validar credenciales
        const validacion = await validarCredenciales(usuario, contrasena);
        
        if (!validacion.success) {
            mostrarNotificacion(validacion.mensaje, 'error');
            botonInicio.textContent = textoOriginal;
            botonInicio.disabled = false;
            return;
        }
        
        // Si es página de plantel, validar período
        const esPlantel = window.location.pathname.includes('plantel');
        let periodo = null;
        
        if (esPlantel) {
            const periodoSelect = document.getElementById('periodo');
            periodo = periodoSelect ? periodoSelect.value : null;
            
            if (!periodo || periodo === '0') {
                mostrarNotificacion('Por favor, seleccione un período válido', 'error');
                botonInicio.textContent = textoOriginal;
                botonInicio.disabled = false;
                return;
            }
        }
        
        // Simular petición al servidor
        const datosPeticion = {
            nombreUsuario: usuario,
            tipoUsuario: determinarTipoUsuario(),
            periodo: periodo
        };
        
        const respuestaServidor = await simularPeticionServidor(datosPeticion);
        
        if (respuestaServidor.success) {
            // Mostrar éxito
            mostrarNotificacion(`¡Bienvenido ${validacion.usuario.nombre}! Inicio de sesión exitoso.`, 'success');
            
            // Simular redirección después de 1.5 segundos
            setTimeout(() => {
                // En un sistema real, aquí se redirigiría al dashboard correspondiente
                const tipoUsuario = determinarTipoUsuario();
                const mensajeRedireccion = `Redirigiendo al dashboard de ${tipoUsuario}...`;
                mostrarNotificacion(mensajeRedireccion, 'info');
                
                // Simulación: limpiar formulario después de "éxito"
                formulario.reset();
                if (esPlantel && document.getElementById('periodo')) {
                    document.getElementById('periodo').value = '0';
                }
            }, 1500);
        }
        
    } catch (error) {
        console.error('Error en inicio de sesión:', error);
        mostrarNotificacion('Error en el servidor. Intente nuevamente.', 'error');
    } finally {
        // Restaurar botón
        setTimeout(() => {
            botonInicio.textContent = textoOriginal;
            botonInicio.disabled = false;
        }, 1000);
    }
}

// Función para manejar el registro de representante
function manejarRegistroRepresentante(event) {
    event.preventDefault();
    
    const codigoInput = document.getElementById('txtCodigo_inscripcion');
    const codigo = codigoInput ? codigoInput.value.trim() : '';
    
    if (!codigo) {
        mostrarNotificacion('Por favor, ingrese un código de inscripción válido', 'error');
        return;
    }
    
    // Validar formato de código (simulación)
    if (codigo.length < 6) {
        mostrarNotificacion('El código debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    mostrarNotificacion(`Registro exitoso con código: ${codigo}. Procediendo a completar datos...`, 'success');
    
    // Simulación: limpiar campo después de registro
    if (codigoInput) {
        codigoInput.value = '';
    }
}

// Función para manejar la solicitud de cupo
function manejarSolicitudCupo(event) {
    event.preventDefault();
    
    mostrarNotificacion('Solicitud de cupo enviada. Será contactado próximamente.', 'success');
    
    // Simular redirección
    setTimeout(() => {
        mostrarNotificacion('Redirigiendo al formulario de solicitud de cupo...', 'info');
    }, 1000);
}

// Función para inicializar los eventos
function inicializarEventos() {
    // Asignar evento a botones de inicio de sesión
    const botonesInicioSesion = document.querySelectorAll('form button[type="button"]');
    
    botonesInicioSesion.forEach(boton => {
        if (boton.textContent.includes('Iniciar Sesión')) {
            boton.addEventListener('click', manejarInicioSesion);
        }
    });
    
    // Asignar evento al botón de registro de representante
    const botonRegistroRepresentante = document.querySelector('button:not([form]):contains("Registrate AQUÍ")');
    if (botonRegistroRepresentante) {
        botonRegistroRepresentante.addEventListener('click', manejarRegistroRepresentante);
    }
    
    // Asignar evento al enlace de solicitud de cupo (representante)
    const enlaceSolicitudCupo = document.querySelector('a.btn[href*="cursosc"]');
    if (enlaceSolicitudCupo) {
        enlaceSolicitudCupo.addEventListener('click', manejarSolicitudCupo);
    }
    
    // Asignar evento al enlace de recuperación de contraseña
    const enlacesRecuperacion = document.querySelectorAll('a[href*="recuperar.php"]');
    enlacesRecuperacion.forEach(enlace => {
        enlace.addEventListener('click', function(event) {
            event.preventDefault();
            mostrarNotificacion('Redirigiendo al formulario de recuperación de contraseña...', 'info');
            
            // Simular redirección
            setTimeout(() => {
                window.location.href = 'recuperar.html'; // Página simulada
            }, 1500);
        });
    });
    
    // Permitir inicio de sesión con Enter en los campos
    const camposTexto = document.querySelectorAll('input[type="text"], input[type="password"]');
    camposTexto.forEach(campo => {
        campo.addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                const formulario = this.closest('form');
                const botonInicio = formulario.querySelector('button[type="button"]');
                if (botonInicio) {
                    botonInicio.click();
                }
            }
        });
    });
    
    // Cargar datos de ejemplo en los campos para facilitar pruebas
    function cargarDatosEjemplo() {
        const usuarioInputs = document.querySelectorAll('input[type="text"]');
        const contrasenaInputs = document.querySelectorAll('input[type="password"]');
        
        if (usuarioInputs.length > 0) {
            usuarioInputs[0].value = 'juan.perez@example.com';
        }
        
        if (contrasenaInputs.length > 0) {
            contrasenaInputs[0].value = '123456';
        }
        
        // Si es plantel, seleccionar un período por defecto
        const periodoSelect = document.getElementById('periodo');
        if (periodoSelect) {
            periodoSelect.value = '2425'; // 2024-2025
        }
    }
    
    // Solo cargar datos de ejemplo si no hay datos previos
    setTimeout(() => {
        const usuarioInputs = document.querySelectorAll('input[type="text"]');
        if (usuarioInputs.length > 0 && !usuarioInputs[0].value) {
            cargarDatosEjemplo();
        }
    }, 500);
}

// Función para añadir estilos CSS dinámicamente
function agregarEstilos() {
    const estilos = document.createElement('style');
    estilos.textContent = `
        .sae-notificacion {
            font-family: 'Poppins', sans-serif;
            animation: slideIn 0.3s ease-out;
            cursor: pointer;
        }
        
        .sae-notificacion .btn-close {
            padding: 0.75rem 1rem;
        }
        
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        .btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }
        
        .form-control:focus {
            border-color: #0d6efd;
            box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.25);
        }
        
        .login-loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s ease-in-out infinite;
            margin-right: 8px;
            vertical-align: middle;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(estilos);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    agregarEstilos();
    inicializarEventos();
    
    // Mostrar información de usuario de prueba
    setTimeout(() => {
        mostrarNotificacion('Para probar el sistema use: Usuario: juan.perez@example.com / Contraseña: 123456', 'info');
    }, 1000);
});

// Polyfill para :contains() selector
if (!document.querySelectorAll(':contains').length) {
    document.querySelectorAll = (function() {
        const originalQuerySelectorAll = Document.prototype.querySelectorAll;
        return function(selectors) {
            if (selectors.includes(':contains')) {
                const text = selectors.match(/:contains\("([^"]+)"\)/)[1];
                const allElements = originalQuerySelectorAll.call(document, '*');
                const matches = [];
                
                for (let i = 0; i < allElements.length; i++) {
                    if (allElements[i].textContent.includes(text)) {
                        matches.push(allElements[i]);
                    }
                }
                return matches;
            }
            return originalQuerySelectorAll.call(document, selectors);
        };
    })();
}