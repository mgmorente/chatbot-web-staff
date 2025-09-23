// chat.js
export function addMessageToChat(type, message, thinking = false) {
    const chatBox = document.getElementById('chat-box');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', type);
    if (thinking) messageDiv.classList.add('thinking');

    const textDiv = document.createElement('div');
    textDiv.classList.add('text');
    if (type === 'bot') textDiv.classList.add('w-100');
    textDiv.innerHTML = message;

    messageDiv.appendChild(textDiv);
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

export function addThinkingMessage() {
    const thinkingHTML = `
        <div id="loading" class="d-flex align-items-center">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
        </div>`;
    addMessageToChat('bot', thinkingHTML, true);
}

export function removeThinkingMessage() {
    document.querySelectorAll('.thinking').forEach(el => el.remove());
}

export function showApiError(msg) {
    const errorDiv = document.getElementById('api-errors');
    errorDiv.textContent = msg;
    errorDiv.classList.remove('d-none');
}

export function clearApiError() {
    const errorDiv = document.getElementById('api-errors');
    if (!errorDiv.classList.contains('d-none')) {
        errorDiv.classList.add('d-none');
    }
}
