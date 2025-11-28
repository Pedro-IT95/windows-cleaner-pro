// ==========================================
// RENDERER.JS
// Windows Cleaner Pro v2.0.1
// by Pedro IT Expert in CyberSeguridad
// ==========================================

const { ipcRenderer } = require('electron');

// API Configuration
const API_URL = 'https://windows-cleaner-pro-backend.onrender.com';

console.log('=========================================');
console.log('  Windows Cleaner Pro v2.0.1');
console.log('  Backend:', API_URL);
console.log('  Designed by Pedro IT Expert in CyberSeguridad');
console.log('=========================================');

// ==========================================
// INITIALIZATION
// ==========================================

window.addEventListener('DOMContentLoaded', () => {
    console.log('✅ App initialized');
    loadUserData();
});

// ==========================================
// LOAD USER DATA
// ==========================================

function loadUserData() {
    const userData = localStorage.getItem('userData');
    
    if (!userData) {
        console.log('⚠️ No user data found');
        return;
    }

    try {
        const user = JSON.parse(userData);
        console.log('👤 User loaded:', user.email);

        // Update UI
        const userName = document.getElementById('userName');
        const userPlan = document.getElementById('userPlan');

        if (userName) {
            userName.textContent = user.name || 'Usuario';
        }

        if (userPlan) {
            const plan = user.currentPlan || user.plan || 'FREE';
            userPlan.textContent = plan;
            userPlan.className = 'plan-badge ' + plan;
        }

        // Check subscription in background
        checkSubscription(user.email);

    } catch (error) {
        console.error('❌ Error loading user data:', error);
    }
}

// ==========================================
// CHECK SUBSCRIPTION
// ==========================================

async function checkSubscription(email) {
    try {
        console.log('🔍 Checking subscription for:', email);

        const response = await fetch(`${API_URL}/api/stripe/check-subscription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userEmail: email })
        });

        if (!response.ok) {
            console.warn('⚠️ Subscription check failed');
            return;
        }

        const data = await response.json();
        console.log('✅ Subscription:', data.plan);

        // Update user data
        const userData = JSON.parse(localStorage.getItem('userData'));
        userData.currentPlan = data.plan;
        localStorage.setItem('userData', JSON.stringify(userData));

        // Update UI
        const userPlan = document.getElementById('userPlan');
        if (userPlan) {
            userPlan.textContent = data.plan;
            userPlan.className = 'plan-badge ' + data.plan;
        }

    } catch (error) {
        console.error('❌ Error checking subscription:', error);
    }
}

// ==========================================
// LOGOUT
// ==========================================

function logout() {
    console.log('👋 Logging out...');
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    
    window.location.href = 'login.html';
}

// ==========================================
// OPEN PLANS
// ==========================================

async function openPlans() {
    console.log('💳 Opening plans...');
    
    try {
        await ipcRenderer.invoke('open-plans');
    } catch (error) {
        console.error('❌ Error opening plans:', error);
        // Fallback: open in default browser
        window.open('https://pedro-it95.github.io/windows-cleaner-pro-website/pricing.html', '_blank');
    }
}

// ==========================================
// OPEN CHAT IA
// ==========================================

async function openChatIA() {
    console.log('💬 Opening Chat IA...');
    
    // Create chat modal directly in renderer
    const existingModal = document.querySelector('.chat-modal');
    if (existingModal) {
        existingModal.remove();
        return;
    }
    
    const modal = document.createElement('div');
    modal.className = 'chat-modal';
    modal.innerHTML = `
        <div class="chat-container">
            <div class="chat-header">
                <h3>💬 Chat IA - Asistente</h3>
                <button onclick="closeChatIA()" class="close-btn">✕</button>
            </div>
            <div id="chatMessages" class="chat-messages">
                <div class="message bot">¡Hola! Soy tu asistente de Windows Cleaner Pro. ¿En qué puedo ayudarte?</div>
            </div>
            <div class="chat-input">
                <input type="text" id="chatInput" placeholder="Escribe tu mensaje..." onkeypress="handleChatKeypress(event)">
                <button onclick="sendChatMessage()">Enviar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Focus input
    setTimeout(() => {
        document.getElementById('chatInput')?.focus();
    }, 100);
}

// Close Chat
function closeChatIA() {
    const modal = document.querySelector('.chat-modal');
    if (modal) modal.remove();
}

// Handle chat keypress
function handleChatKeypress(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

// Send chat message
async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    const messagesContainer = document.getElementById('chatMessages');
    
    // Add user message
    messagesContainer.innerHTML += `<div class="message user">${message}</div>`;
    input.value = '';
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Get AI response
    try {
        const result = await ipcRenderer.invoke('ai-chat', message);
        if (result.success) {
            messagesContainer.innerHTML += `<div class="message bot">${result.response}</div>`;
        } else {
            messagesContainer.innerHTML += `<div class="message bot">Lo siento, hubo un error. Intenta de nuevo.</div>`;
        }
    } catch (error) {
        console.error('Chat error:', error);
        messagesContainer.innerHTML += `<div class="message bot">Error de conexión. Intenta de nuevo.</div>`;
    }
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ==========================================
// RUN TOOL - MAIN FUNCTION
// ==========================================

async function runTool(toolName) {
    console.log(`🔧 Running tool: ${toolName}`);
    
    const consoleOutput = document.getElementById('consoleOutput');
    
    if (!consoleOutput) {
        console.error('❌ Console output element not found');
        return;
    }

    // Show loading
    consoleOutput.innerHTML = `<p>⏳ Ejecutando ${getToolDisplayName(toolName)}...</p>`;
    consoleOutput.classList.add('active');

    try {
        // Call main process with tool name
        const result = await ipcRenderer.invoke('run-tool', toolName);

        console.log('Tool result:', result);

        if (result.success) {
            consoleOutput.innerHTML = `
                <p>✅ ${result.message}</p>
                <pre>${result.output || 'Comando ejecutado exitosamente'}</pre>
            `;
        } else {
            if (result.requiresAdmin) {
                consoleOutput.innerHTML = `
                    <p>⚠️ Se requieren permisos de administrador</p>
                    <p>Por favor, cierra la aplicación y ejecútala como Administrador.</p>
                    <p>Click derecho en el icono → "Ejecutar como administrador"</p>
                `;
            } else {
                consoleOutput.innerHTML = `
                    <p>❌ Error: ${result.error}</p>
                `;
            }
        }
    } catch (error) {
        console.error('❌ Error running tool:', error);
        consoleOutput.innerHTML = `<p>❌ Error: ${error.message}</p>`;
    }

    // Remove active class after delay
    setTimeout(() => {
        consoleOutput.classList.remove('active');
    }, 5000);
}

// ==========================================
// GET TOOL DISPLAY NAME
// ==========================================

function getToolDisplayName(toolName) {
    const names = {
        'dism': 'DISM Repair',
        'sfc': 'SFC Scan',
        'diskcleanup': 'Disk Cleanup',
        'tempfiles': 'Archivos Temporales',
        'dnsflush': 'DNS Flush',
        'systeminfo': 'System Info',
        'windowsupdate': 'Windows Update',
        'displaysettings': 'Display Settings'
    };
    return names[toolName] || toolName;
}

// ==========================================
// LISTEN FOR CONSOLE OUTPUT
// ==========================================

ipcRenderer.on('console-output', (event, text) => {
    const consoleOutput = document.getElementById('consoleOutput');
    if (consoleOutput) {
        consoleOutput.innerHTML += `<p>${text}</p>`;
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
});

// ==========================================
// LISTEN FOR PLAN UPDATES
// ==========================================

ipcRenderer.on('plan-updated', (event, newPlan) => {
    console.log('📢 Plan updated to:', newPlan);
    
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    userData.currentPlan = newPlan;
    localStorage.setItem('userData', JSON.stringify(userData));
    
    const userPlan = document.getElementById('userPlan');
    if (userPlan) {
        userPlan.textContent = newPlan;
        userPlan.className = 'plan-badge ' + newPlan;
    }
});

// ==========================================
// END OF FILE
// ==========================================

console.log('✅ Renderer loaded');
console.log('Designed by Pedro IT Expert in CyberSeguridad');