// onboarding.js
// Tour guiado interactivo de 5 pasos para nuevos empleados.
// Usa Driver.js (cargado vía CDN en index.html como window.driver.js.driver).
//
// Flag de finalización: localStorage 'onboardingCompleted' = '1'
// Disparadores:
//   - Automático en primer login (si la flag no existe)
//   - Manual: window.startOnboardingTour() o botón "Tour guiado" en sidebar
//
// Importa: nada — todo via window globals (Driver) y querySelector.

const FLAG_KEY = 'onboardingCompleted';
const VERSION = 1; // Subir si se cambian los pasos para forzar re-tour

function isFirstTime() {
    const v = localStorage.getItem(FLAG_KEY);
    if (!v) return true;
    // Permite versionado: si la versión guardada es < VERSION, re-mostrar
    const n = parseInt(v, 10);
    return Number.isNaN(n) || n < VERSION;
}

function markCompleted() {
    localStorage.setItem(FLAG_KEY, String(VERSION));
}

function ensureDriverLoaded() {
    return !!(window.driver && window.driver.js && window.driver.js.driver);
}

// Asegura que el dock está visible y plegado al iniciar el tour
function prepareUI() {
    // Cerrar cualquier sublayer abierto del dock para no tapar pasos
    const sub = document.getElementById('action-dock-sublayer');
    if (sub) sub.setAttribute('aria-hidden', 'true');
    // Cerrar menú attach si estuviera abierto
    const attach = document.getElementById('attach-menu');
    if (attach) attach.classList.add('hidden');
}

// Recordamos si tuvimos que abrir manualmente el dock para restaurarlo al final
let _dockWasOpenedByTour = false;
function showActionDock() {
    const dock = document.getElementById('action-dock');
    const btn = document.getElementById('btn-dock-toggle');
    if (!dock) return;
    if (!dock.classList.contains('is-visible')) {
        dock.classList.add('is-visible');
        if (btn) btn.classList.add('is-open');
        _dockWasOpenedByTour = true;
    }
}
function restoreActionDock() {
    if (!_dockWasOpenedByTour) return;
    const dock = document.getElementById('action-dock');
    const btn = document.getElementById('btn-dock-toggle');
    if (dock) dock.classList.remove('is-visible');
    if (btn) btn.classList.remove('is-open');
    _dockWasOpenedByTour = false;
}

// Auto-expandir la ficha lateral antes del paso correspondiente
let _fichaWasCollapsedByUser = false;
function expandFichaSidebar() {
    const el = document.getElementById('fichaClienteSidebar');
    if (!el) return;
    if (el.classList.contains('is-collapsed')) {
        _fichaWasCollapsedByUser = true;
        el.classList.remove('is-collapsed');
    }
    if (window.innerWidth <= 992) {
        el.classList.add('is-open');
    }
}
function restoreFichaSidebar() {
    const el = document.getElementById('fichaClienteSidebar');
    if (!el) return;
    if (_fichaWasCollapsedByUser) {
        el.classList.add('is-collapsed');
        _fichaWasCollapsedByUser = false;
    }
    if (window.innerWidth <= 992) {
        el.classList.remove('is-open');
    }
}

// Definición de los 5 pasos del tour
function buildSteps() {
    return [
        {
            element: '#headerClientPill',
            popover: {
                title: '<i class="bi bi-person-fill"></i> 1. Selecciona un cliente',
                description: `
                    <p>Empieza siempre eligiendo un cliente desde aquí.
                    Puedes buscar por <strong>nombre</strong> o <strong>NIF/CIF</strong>.</p>
                    <p class="ob-tip"><i class="bi bi-lightbulb"></i>
                    Atajo: en el chat puedes escribir directamente un NIF y se buscará al instante.</p>
                `,
                side: 'bottom',
                align: 'end'
            }
        },
        {
            element: '#chat-message',
            popover: {
                title: '<i class="bi bi-chat-dots-fill"></i> 2. Habla con el asistente',
                description: `
                    <p>Escribe en lenguaje natural lo que necesites:
                    <em>"pólizas activas"</em>, <em>"último siniestro"</em>,
                    <em>"recibos pendientes"</em>...</p>
                    <p>El asistente entiende intenciones y trae los datos del cliente
                    seleccionado automáticamente.</p>
                `,
                side: 'top',
                align: 'start'
            }
        },
        {
            element: '#action-dock',
            // Abrir el dock al entrar, cerrarlo al salir del paso
            onHighlightStarted: () => showActionDock(),
            onDeselected: () => restoreActionDock(),
            popover: {
                title: '<i class="bi bi-grid-3x3-gap-fill"></i> 3. Acciones rápidas',
                description: `
                    <p>Si prefieres clicar en lugar de escribir, usa este menú flotante.</p>
                    <p>Cada botón abre un grupo: <strong>Cliente</strong>, <strong>Pólizas</strong>,
                    <strong>Siniestros</strong>, <strong>Documentos</strong>, <strong>Agenda</strong>,
                    <strong>Herramientas</strong>...</p>
                    <p class="ob-tip"><i class="bi bi-lightbulb"></i>
                    Puedes abrirlo en cualquier momento con el botón
                    <i class="bi bi-grid-3x3-gap-fill"></i> de la barra inferior.</p>
                `,
                side: 'top',
                align: 'center'
            }
        },
        {
            element: '#fichaClienteSidebar',
            onHighlightStarted: () => expandFichaSidebar(),
            onDeselected: () => restoreFichaSidebar(),
            popover: {
                title: '<i class="bi bi-person-vcard-fill"></i> 4. Ficha del cliente',
                description: `
                    <p>Cuando seleccionas un cliente, aquí verás siempre a la vista:</p>
                    <ul class="ob-list">
                        <li><i class="bi bi-person"></i> Datos personales y contacto</li>
                        <li><i class="bi bi-shield-check"></i> Pólizas activas</li>
                        <li><i class="bi bi-receipt"></i> Recibos pendientes / devueltos</li>
                        <li><i class="bi bi-exclamation-triangle"></i> Siniestros abiertos</li>
                    </ul>
                    <p class="ob-tip"><i class="bi bi-lightbulb"></i>
                    Puedes plegar este panel con el botón superior.</p>
                `,
                side: 'left',
                align: 'start'
            }
        },
        {
            element: '#btn-mic',
            popover: {
                title: '<i class="bi bi-mic-fill"></i> 5. Voz, agenda y mucho más',
                description: `
                    <p>Pulsa el micrófono y dícta tu consulta o un nuevo presiniestro:
                    se transcribe con IA y se procesa automáticamente.</p>
                    <p>Otras funciones que descubrirás con el uso:
                    agenda Outlook integrada, envío de emails con plantilla,
                    duplicados de pólizas, wallet Apple/Google, exportar el chat a PDF...</p>
                    <p class="ob-tip"><i class="bi bi-info-circle"></i>
                    Puedes volver a ver este tour en cualquier momento desde el botón
                    "Tour guiado" en el menú lateral.</p>
                `,
                side: 'top',
                align: 'end'
            }
        }
    ];
}

// Filtra pasos cuyo elemento no esté en el DOM (resiliente a cambios de UI)
function filterAvailableSteps(steps) {
    return steps.filter(s => {
        if (!s.element) return true;
        return !!document.querySelector(s.element);
    });
}

export function startOnboardingTour({ force = false } = {}) {
    if (!ensureDriverLoaded()) {
        console.warn('[Onboarding] Driver.js no cargado.');
        return false;
    }
    if (!force && !isFirstTime()) return false;

    prepareUI();

    const driverFactory = window.driver.js.driver;
    const steps = filterAvailableSteps(buildSteps());

    if (steps.length === 0) {
        console.warn('[Onboarding] No hay pasos disponibles para mostrar.');
        return false;
    }

    const drv = driverFactory({
        showProgress: true,
        animate: true,
        smoothScroll: true,
        allowClose: true,
        overlayOpacity: 0.55,
        stagePadding: 6,
        stageRadius: 12,
        progressText: '{{current}} de {{total}}',
        nextBtnText: 'Siguiente <i class="bi bi-arrow-right"></i>',
        prevBtnText: '<i class="bi bi-arrow-left"></i> Anterior',
        doneBtnText: '<i class="bi bi-check-lg"></i> Empezar',
        popoverClass: 'pacc-onboarding-popover',
        steps,
        onDestroyed: () => {
            // Marca como completado cuando el usuario termina o cierra
            markCompleted();
            // Restaurar UI por si el usuario cerró antes de pasar de los pasos 3 / 4
            restoreActionDock();
            restoreFichaSidebar();
        }
    });

    drv.drive();
    return true;
}

// Exponer globalmente para invocación manual desde la consola o un botón inline
window.startOnboardingTour = startOnboardingTour;

// Auto-arranque en primer login. Se ejecuta tras un delay para que
// el DOM, el header y el dock estén plenamente renderizados.
export function initOnboarding() {
    if (!isFirstTime()) return;
    // Pequeño retardo para no competir con SweetAlerts u otras inicializaciones
    setTimeout(() => {
        // Doble check: si Driver no está aún, reintentar una vez
        if (ensureDriverLoaded()) {
            startOnboardingTour();
        } else {
            setTimeout(() => startOnboardingTour(), 800);
        }
    }, 600);
}

// Helper público para resetear (útil para QA)
export function resetOnboarding() {
    localStorage.removeItem(FLAG_KEY);
}
window.resetOnboardingTour = resetOnboarding;
