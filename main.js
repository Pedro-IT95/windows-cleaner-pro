// ==========================================
// MAIN.JS
// Cuban Technology Cleaner v2.0.2
// by Pedro IT Solutions
// ==========================================

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const axios = require('axios');

const BACKEND_URL = 'https://api.windowscleanerpro.com';

let mainWindow;
let currentUser = null;

console.log('=========================================');
console.log('  Cuban Technology Cleaner v2.0.2');
console.log('  Backend:', BACKEND_URL);
console.log('  by Pedro IT Solutions');
console.log('=========================================');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: true,
        backgroundColor: '#1a1a1a',
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'assets', 'icon.png')
    });
    mainWindow.loadFile('login.html');
    mainWindow.once('ready-to-show', () => mainWindow.show());
    mainWindow.on('closed', () => mainWindow = null);
}

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('minimize-window', () => mainWindow?.minimize());
ipcMain.on('maximize-window', () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
});
ipcMain.on('close-window', () => mainWindow?.close());

ipcMain.handle('register', async (event, userData) => {
    try {
        const response = await axios.post(BACKEND_URL + '/api/auth/register', userData);
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || 'Registration failed' };
    }
});

ipcMain.handle('login', async (event, credentials) => {
    try {
        const response = await axios.post(BACKEND_URL + '/api/auth/login', credentials);
        console.log('✅ Login successful');
        currentUser = response.data.user;
        currentUser.token = response.data.token;
        mainWindow.loadFile('index.html');
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: error.response?.data?.error || 'Login failed' };
    }
});

ipcMain.handle('verify-subscription', async (event, token) => {
    try {
        const response = await axios.get(BACKEND_URL + '/api/auth/verify-subscription', {
            headers: { Authorization: 'Bearer ' + token }
        });
        return { success: true, data: response.data };
    } catch (error) {
        return { success: false, error: 'Verification failed' };
    }
});

ipcMain.on('load-main-app', () => mainWindow?.loadFile('index.html'));
ipcMain.on('logout', () => { currentUser = null; mainWindow?.loadFile('login.html'); });

ipcMain.handle('open-plans', async () => {
    shell.openExternal('https://windowscleanerpro.com/pricing');
    return { success: true };
});

ipcMain.handle('open-chat', async () => ({ success: true }));

ipcMain.handle('run-tool', async (event, toolName) => {
    console.log('🔧 Running: ' + toolName);
    try {
        switch(toolName) {
            case 'dism': case 'dism-repair': return await runDISM();
            case 'sfc': case 'sfc-scan': return await runSFC();
            case 'diskcleanup': case 'disk-cleanup': return await runDiskCleanup();
            case 'tempfiles': case 'temp-files': return await runTempFiles();
            case 'dnsflush': case 'dns-flush': return await runDNSFlush();
            case 'systeminfo': case 'system-info': return await runSystemInfo();
            case 'windowsupdate': case 'windows-update': return await runWindowsUpdate();
            case 'displaysettings': case 'display-settings': return await runDisplaySettings();
            default: return { success: false, error: 'Unknown tool: ' + toolName };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
});

async function runDNSFlush() {
    return new Promise((resolve) => {
        exec('ipconfig /flushdns', (error, stdout) => {
            if (error) resolve({ success: false, error: error.message });
            else resolve({ success: true, message: 'DNS Cache limpiado', output: stdout });
        });
    });
}

async function runDISM() {
    return new Promise((resolve) => {
        const p = spawn('dism.exe', ['/Online', '/Cleanup-Image', '/RestoreHealth'], { shell: true, windowsHide: true });
        let output = '';
        p.stdout.on('data', (d) => { output += d.toString(); });
        p.on('close', (code) => {
            if (code === 0) resolve({ success: true, message: 'DISM completado', output });
            else if (code === 740) resolve({ success: false, error: 'Requiere Administrador', requiresAdmin: true });
            else resolve({ success: false, error: 'DISM fallo con codigo ' + code });
        });
        p.on('error', (err) => resolve({ success: false, error: err.message, requiresAdmin: true }));
    });
}

async function runSFC() {
    return new Promise((resolve) => {
        const p = spawn('sfc', ['/scannow'], { shell: true, windowsHide: true });
        let output = '';
        p.stdout.on('data', (d) => { output += d.toString(); });
        p.on('close', (code) => {
            if (code === 0) resolve({ success: true, message: 'SFC completado', output });
            else if (code === 740) resolve({ success: false, error: 'Requiere Administrador', requiresAdmin: true });
            else resolve({ success: false, error: 'SFC fallo con codigo ' + code });
        });
        p.on('error', (err) => resolve({ success: false, error: err.message, requiresAdmin: true }));
    });
}

async function runTempFiles() {
    const fs = require('fs').promises;
    const pathModule = require('path');
    const tempDirs = [process.env.TEMP, process.env.TMP, 'C:\\Windows\\Temp'].filter(Boolean);
    let totalDeleted = 0, totalSize = 0;
    for (const tempDir of tempDirs) {
        try {
            const files = await fs.readdir(tempDir);
            for (const file of files) {
                try {
                    const filePath = pathModule.join(tempDir, file);
                    const stats = await fs.stat(filePath);
                    if (stats.isFile() && (Date.now() - stats.mtime.getTime()) > 86400000) {
                        await fs.unlink(filePath);
                        totalDeleted++;
                        totalSize += stats.size;
                    }
                } catch (e) {}
            }
        } catch (e) {}
    }
    return { success: true, message: totalDeleted + ' archivos eliminados (' + (totalSize/1024/1024).toFixed(2) + ' MB)' };
}

async function runDiskCleanup() {
    return new Promise((resolve) => {
        exec('cleanmgr /sagerun:1', () => resolve({ success: true, message: 'Disk Cleanup iniciado' }));
    });
}

async function runSystemInfo() {
    const os = require('os');
    const output = 'Hostname: ' + os.hostname() + '\nCPU: ' + (os.cpus()[0]?.model || 'Unknown') + '\nMemoria: ' + (os.totalmem()/1024/1024/1024).toFixed(2) + ' GB';
    return { success: true, message: 'Info del Sistema', output };
}

async function runWindowsUpdate() {
    return new Promise((resolve) => {
        exec('start ms-settings:windowsupdate', (e) => resolve(e ? { success: false, error: e.message } : { success: true, message: 'Windows Update abierto' }));
    });
}

async function runDisplaySettings() {
    return new Promise((resolve) => {
        exec('start ms-settings:display', (e) => resolve(e ? { success: false, error: e.message } : { success: true, message: 'Display Settings abierto' }));
    });
}

ipcMain.handle('ai-chat', async (event, message) => {
    const responses = {
        'hola': 'Hola! Soy tu asistente de Cuban Technology Cleaner.',
        'hello': 'Hello! I am your Cuban Technology Cleaner assistant.',
        'help': 'Puedo ayudarte con: limpieza, reparacion, optimizacion.',
        'gracias': 'De nada!',
        'thanks': 'You are welcome!'
    };
    const lower = message.toLowerCase();
    let response = 'Soy tu asistente. Preguntame sobre limpieza u optimizacion.';
    for (const k in responses) { if (lower.includes(k)) { response = responses[k]; break; } }
    return { success: true, response };
});

console.log('✅ Main process initialized');
console.log('by Pedro IT Solutions - Odessa, Texas');