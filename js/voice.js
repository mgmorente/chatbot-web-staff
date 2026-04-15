// voice.js — Grabación de audio y envío a /transcribe (staff)
import { addMessageToChat, addThinkingMessage, removeThinkingMessage } from './chat.js';

function escapeHtml(t) {
    return String(t).replace(/[&<>"']/g, s => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[s]));
}

function getSupportedMime() {
    const mimes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
    for (const m of mimes) {
        if (window.MediaRecorder && MediaRecorder.isTypeSupported(m)) return m;
    }
    return 'audio/webm';
}

/**
 * Inicializa el módulo de voz.
 * @param {Object} opts
 * @param {() => string} opts.getToken    - Devuelve el token JWT actual
 * @param {() => string} opts.getClient   - Devuelve el cliente seleccionado (o null)
 * @param {(data) => void} opts.onResponse - Callback con la respuesta del backend (handleCommand)
 */
export function initVoice({ getToken, getClient, onResponse }) {
    const btnMic = document.getElementById('btn-mic');
    const indicator = document.getElementById('recording-indicator');
    const timerEl = document.getElementById('recording-timer');
    if (!btnMic) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
        btnMic.style.display = 'none';
        return;
    }

    let mediaRecorder = null;
    let stream = null;
    let chunks = [];
    let isRecording = false;
    let isBusy = false;
    let timerInterval = null;
    let startTime = 0;

    // Pre-calentar permisos al pasar el ratón
    btnMic.addEventListener('mouseenter', warmUp, { once: true });

    btnMic.addEventListener('click', (e) => {
        e.preventDefault();
        if (isBusy) return;
        if (isRecording) stop(); else start();
    });

    async function warmUp() {
        if (stream) return;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            console.log('[Voice] Warm-up: permisos pendientes');
        }
    }

    async function ensureStream() {
        if (stream) {
            const tracks = stream.getAudioTracks();
            if (tracks.length > 0 && tracks[0].readyState === 'live') return;
            stream = null;
        }
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }

    async function start() {
        isBusy = true;
        try {
            await ensureStream();
            chunks = [];
            mediaRecorder = new MediaRecorder(stream, { mimeType: getSupportedMime() });

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                if (chunks.length === 0) {
                    updateUI(false);
                    return;
                }
                const blob = new Blob(chunks, { type: mediaRecorder.mimeType });
                sendAudio(blob);
            };

            mediaRecorder.start(1000);
            isRecording = true;
            startTime = Date.now();
            updateUI(true);
            startTimer();
        } catch (err) {
            console.error('[Voice] Mic error:', err);
            alert('No se pudo acceder al micrófono. Revisa los permisos.');
        } finally {
            isBusy = false;
        }
    }

    function stop() {
        if (!isRecording || !mediaRecorder) return;
        const duration = Date.now() - startTime;
        if (duration < 1500) {
            isRecording = false;
            mediaRecorder.stop();
            chunks = [];
            stopTimer();
            updateUI(false);
            addMessageToChat('bot', '<i class="bi bi-mic-mute"></i> Grabación muy corta. Mantén pulsado al menos 2 segundos.');
            return;
        }
        isRecording = false;
        mediaRecorder.stop();
        stopTimer();
        updateUI(false);
    }

    async function sendAudio(blob) {
        if (!blob || blob.size < 1000) {
            addMessageToChat('bot', '<i class="bi bi-mic-mute"></i> No se captó audio. Comprueba que el micrófono está activo y habla más cerca.');
            return;
        }

        const audioUrl = URL.createObjectURL(blob);
        addMessageToChat('user', `<div class="message-audio"><i class="bi bi-mic-fill"></i><audio controls src="${audioUrl}"></audio></div>`);
        addThinkingMessage();

        try {
            const formData = new FormData();
            const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('mp4') ? 'mp4' : 'ogg';
            formData.append('audio', blob, `audio.${ext}`);

            const cliente = getClient();
            if (cliente) formData.append('cliente', cliente);

            const res = await fetch(`${ENV.API_URL}/transcribe`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`,
                    'Empresa': ENV.EMPRESA,
                    'Device': ENV.DEVICE
                },
                body: formData
            });

            removeThinkingMessage();

            if (res.status === 401) {
                window.location.href = 'login.html';
                return;
            }

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                if (data.transcription) {
                    addMessageToChat('user', `<em style="font-size:12px;opacity:.75;">${escapeHtml(data.transcription)}</em>`);
                }
                if (typeof onResponse === 'function') {
                    onResponse(data);
                } else if (data.message) {
                    addMessageToChat('bot', data.message);
                }
            } else {
                const errorMsg = data.error || 'No pude procesar el audio.';
                addMessageToChat('bot', `<i class="bi bi-exclamation-circle"></i> ${errorMsg}`);
                console.error('[Voice] Server error:', errorMsg);
            }
        } catch (err) {
            removeThinkingMessage();
            addMessageToChat('bot', '<i class="bi bi-wifi-off"></i> No se pudo conectar con el servidor. Puedes escribir tu consulta directamente.');
            console.error('[Voice Error]', err);
        }
    }

    function updateUI(recording) {
        btnMic.classList.toggle('recording', recording);
        if (indicator) indicator.classList.toggle('hidden', !recording);
        btnMic.title = recording ? 'Pulsa para parar' : 'Pulsa para grabar';
    }

    function startTimer() {
        updateTimerDisplay(0);
        timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            updateTimerDisplay(elapsed);
        }, 1000);
    }
    function stopTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    function updateTimerDisplay(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        if (timerEl) timerEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
    }

    // API pública (por si se necesita liberar en logout)
    return {
        release() {
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
                stream = null;
            }
        }
    };
}
