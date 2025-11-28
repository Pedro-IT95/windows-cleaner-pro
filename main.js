// ==========================================
// MAIN.JS
// Windows Cleaner Pro v2.0.1
// by Pedro IT Expert in CyberSeguridad
// ==========================================

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const axios = require('axios');

// Backend URL
const BACKEND_URL = 'https://windows-cleaner-pro-backend.onrender.com';

let mainWindow;
let currentUser = null;

console.log('=========================================');
console.log('  Windows Cleaner Pro v2.0.1');
console.log('  Backend:', BACKEND_URL);
console.log('  Designed by Pedro IT Expert in CyberSeguridad');
console.log('=========================================');

// ==========================================
// CREATE WINDOW
// ==========================================

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

    // Show when ready (no flicker)
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

// ==========================================
// APP EVENTS
// ==========================================

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// ==========================================
// WINDOW CONTROLS
// ==========================================

ipcMain.on('minimize-window', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.on('close-window', () => {
    if (mainWindow) mainWindow.close();
});

// ==========================================
// AUTHENTICATION
// ==========================================

ipcMain.handle('register', async (event, userData) => {
    try {
        console.log('📝 Registering user:', userData.email);
        const response = await axios.post(`${BACKEND_URL}/api/auth/register`, userData);
        console.log('✅ Registration successful');
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ Registration error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.error || 'Registration failed'
        };
    }
});

ipcMain.handle('login', async (event, credentials) => {
    try {
        console.log('🔐 Logging in user:', credentials.email);
        const response = await axios.post(`${BACKEND_URL}/api/auth/login`, credentials);
        console.log('✅ Login successful');
        
        currentUser = response.data.user;
        currentUser.token = response.data.token;
        
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ Login error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.error || 'Login failed'
        };
    }
});

ipcMain.handle('verify-subscription', async (event, token) => {
    try {
        console.log('🔍 Verifying subscription...');
        const response = await axios.get(`${BACKEND_URL}/api/auth/verify-subscription`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('✅ Subscription verified');
        return { success: true, data: response.data };
    } catch (error) {
        console.error('❌ Subscription verification error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data?.error || 'Verification failed'
        };
    }
});

// ==========================================
// NAVIGATION
// ==========================================

ipcMain.on('load-main-app', () => {
    if (mainWindow) {
        mainWindow.loadFile('index.html');
    }
});

ipcMain.on('logout', () => {
    currentUser = null;
    if (mainWindow) {
        mainWindow.loadFile('login.html');
    }
});

// ==========================================
// OPEN EXTERNAL LINKS
// ==========================================

ipcMain.handle('open-plans', async () => {
    shell.openExternal('https://pedro-it95.github.io/windows-cleaner-pro-website/pricing.html');
    return { success: true };
});

ipcMain.handle('open-chat', async () => {
    // Return success to let renderer handle the chat UI
    return { success: true };
});

// ==========================================
// UNIVERSAL TOOL RUNNER
// ==========================================

ipcMain.handle('run-tool', async (event, toolName) => {
    console.log(`🔧 Running tool: ${toolName}`);
    
    try {
        switch(toolName) {
            // Short names (from index.html)
            case 'dism':
                return await runDISM();
            case 'sfc':
                return await runSFC();
            case 'diskcleanup':
                return await runDiskCleanup();
            case 'tempfiles':
                return await runTempFiles();
            case 'dnsflush':
                return await runDNSFlush();
            case 'systeminfo':
                return await runSystemInfo();
            case 'windowsupdate':
                return await runWindowsUpdate();
            case 'displaysettings':
                return await runDisplaySettings();
            
            // Long names (alternative)
            case 'dism-repair':
                return await runDISM();
            case 'sfc-scan':
                return await runSFC();
            case 'disk-cleanup':
                return await runDiskCleanup();
            case 'temp-files':
                return await runTempFiles();
            case 'dns-flush':
                return await runDNSFlush();
            case 'system-info':
                return await runSystemInfo();
            case 'windows-update':
                return await runWindowsUpdate();
            case 'display-settings':
                return await runDisplaySettings();
                
            default:
                console.error(`❌ Unknown tool: ${toolName}`);
                return { success: false, error: `Unknown tool: ${toolName}` };
        }
    } catch (error) {
        console.error(`❌ Error running ${toolName}:`, error);
        return { success: false, error: error.message };
    }
});

// ==========================================
// TOOL: DNS FLUSH
// ==========================================

async function runDNSFlush() {
    console.log('🌐 Running DNS Flush...');
    
    return new Promise((resolve) => {
        exec('ipconfig /flushdns', (error, stdout, stderr) => {
            if (error) {
                console.error('❌ DNS Flush error:', error);
                resolve({ success: false, error: error.message });
                return;
            }
            
            console.log('✅ DNS Flush completed');
            resolve({
                success: true,
                message: 'DNS Cache limpiado exitosamente',
                output: stdout
            });
        });
    });
}

// ==========================================
// TOOL: DISM REPAIR
// ==========================================

async function runDISM() {
    console.log('🔧 Running DISM Repair...');
    
    return new Promise((resolve) => {
        const dismProcess = spawn('dism.exe', ['/Online', '/Cleanup-Image', '/RestoreHealth'], {
            shell: true,
            windowsHide: true
        });

        let output = '';
        let errorOutput = '';

        dismProcess.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            console.log('DISM:', text);
            
            if (mainWindow) {
                mainWindow.webContents.send('console-output', text);
            }
        });

        dismProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        dismProcess.on('close', (code) => {
            console.log(`DISM exited with code: ${code}`);
            
            if (code === 0) {
                resolve({
                    success: true,
                    message: 'DISM Repair completado exitosamente',
                    output: output
                });
            } else if (code === 740) {
                resolve({
                    success: false,
                    error: 'Se requieren permisos de Administrador',
                    requiresAdmin: true
                });
            } else {
                resolve({
                    success: false,
                    error: `DISM falló con código ${code}. Ejecuta como Administrador.`,
                    output: errorOutput
                });
            }
        });

        dismProcess.on('error', (err) => {
            resolve({
                success: false,
                error: err.message,
                requiresAdmin: true
            });
        });
    });
}

// ==========================================
// TOOL: SFC SCAN
// ==========================================

async function runSFC() {
    console.log('🛡️ Running SFC Scan...');
    
    return new Promise((resolve) => {
        const sfcProcess = spawn('sfc', ['/scannow'], {
            shell: true,
            windowsHide: true
        });

        let output = '';
        let errorOutput = '';

        sfcProcess.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            console.log('SFC:', text);
            
            if (mainWindow) {
                mainWindow.webContents.send('console-output', text);
            }
        });

        sfcProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        sfcProcess.on('close', (code) => {
            console.log(`SFC exited with code: ${code}`);
            
            if (code === 0) {
                resolve({
                    success: true,
                    message: 'SFC Scan completado exitosamente',
                    output: output
                });
            } else if (code === 740) {
                resolve({
                    success: false,
                    error: 'Se requieren permisos de Administrador',
                    requiresAdmin: true
                });
            } else {
                resolve({
                    success: false,
                    error: `SFC falló con código ${code}. Ejecuta como Administrador.`,
                    output: errorOutput
                });
            }
        });

        sfcProcess.on('error', (err) => {
            resolve({
                success: false,
                error: err.message,
                requiresAdmin: true
            });
        });
    });
}

// ==========================================
// TOOL: TEMP FILES CLEANUP
// ==========================================

async function runTempFiles() {
    console.log('🗑️ Running Temp Files Cleanup...');
    
    const fs = require('fs').promises;
    const pathModule = require('path');
    
    const tempDirs = [
        process.env.TEMP,
        process.env.TMP,
        pathModule.join(process.env.LOCALAPPDATA || '', 'Temp'),
        'C:\\Windows\\Temp'
    ].filter(Boolean);

    let totalDeleted = 0;
    let totalSize = 0;
    let errors = [];

    for (const tempDir of tempDirs) {
        try {
            console.log(`📁 Cleaning: ${tempDir}`);
            
            try {
                await fs.access(tempDir);
            } catch {
                console.log(`⚠️ Directory not accessible: ${tempDir}`);
                continue;
            }

            const files = await fs.readdir(tempDir);
            
            for (const file of files) {
                try {
                    const filePath = pathModule.join(tempDir, file);
                    const stats = await fs.stat(filePath);
                    
                    // Only delete files (not directories) older than 1 day
                    if (stats.isFile()) {
                        const now = Date.now();
                        const fileAge = now - stats.mtime.getTime();
                        const daysOld = fileAge / (1000 * 60 * 60 * 24);
                        
                        if (daysOld > 1) {
                            await fs.unlink(filePath);
                            totalDeleted++;
                            totalSize += stats.size;
                            
                            if (mainWindow) {
                                mainWindow.webContents.send('console-output', 
                                    `Deleted: ${file}\n`);
                            }
                        }
                    }
                } catch (err) {
                    // Skip files in use or protected
                    if (err.code !== 'EBUSY' && err.code !== 'EPERM' && err.code !== 'ENOENT') {
                        errors.push(`${file}: ${err.code}`);
                    }
                }
            }
        } catch (err) {
            errors.push(`${tempDir}: ${err.message}`);
        }
    }

    const sizeInMB = (totalSize / 1024 / 1024).toFixed(2);
    
    console.log(`✅ Temp Files: Deleted ${totalDeleted} files (${sizeInMB} MB)`);
    
    return {
        success: true,
        message: `Limpieza completada: ${totalDeleted} archivos eliminados (${sizeInMB} MB liberados)`,
        output: `Archivos eliminados: ${totalDeleted}\nEspacio liberado: ${sizeInMB} MB`,
        deleted: totalDeleted,
        size: sizeInMB
    };
}

// ==========================================
// TOOL: DISK CLEANUP
// ==========================================

async function runDiskCleanup() {
    console.log('💾 Running Disk Cleanup...');
    
    return new Promise((resolve) => {
        exec('cleanmgr /sagerun:1', (error, stdout, stderr) => {
            if (error && error.code !== 0) {
                // cleanmgr often returns non-zero even on success
                console.log('⚠️ Disk Cleanup may have opened separately');
            }
            
            resolve({
                success: true,
                message: 'Disk Cleanup iniciado. Puede tardar varios minutos.',
                output: 'La ventana de limpieza de disco se ha abierto.'
            });
        });
    });
}

// ==========================================
// TOOL: SYSTEM INFO
// ==========================================

async function runSystemInfo() {
    console.log('📊 Getting System Info...');
    
    const os = require('os');
    
    const info = {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        osVersion: os.release(),
        cpus: os.cpus()[0]?.model || 'Unknown',
        cpuCores: os.cpus().length,
        totalMemory: (os.totalmem() / (1024 ** 3)).toFixed(2) + ' GB',
        freeMemory: (os.freemem() / (1024 ** 3)).toFixed(2) + ' GB',
        uptime: (os.uptime() / 3600).toFixed(2) + ' hours',
        nodeVersion: process.version
    };
    
    const output = `
Hostname: ${info.hostname}
Plataforma: ${info.platform}
Arquitectura: ${info.arch}
Versión OS: ${info.osVersion}
CPU: ${info.cpus}
Núcleos: ${info.cpuCores}
Memoria Total: ${info.totalMemory}
Memoria Libre: ${info.freeMemory}
Tiempo Encendido: ${info.uptime}
Node.js: ${info.nodeVersion}
    `.trim();
    
    return {
        success: true,
        message: 'Información del Sistema',
        output: output
    };
}

// ==========================================
// TOOL: WINDOWS UPDATE
// ==========================================

async function runWindowsUpdate() {
    console.log('🔄 Opening Windows Update...');
    
    return new Promise((resolve) => {
        exec('start ms-settings:windowsupdate', (error) => {
            if (error) {
                resolve({ success: false, error: error.message });
                return;
            }
            
            resolve({
                success: true,
                message: 'Windows Update abierto',
                output: 'Se ha abierto la configuración de Windows Update.'
            });
        });
    });
}

// ==========================================
// TOOL: DISPLAY SETTINGS
// ==========================================

async function runDisplaySettings() {
    console.log('🖥️ Opening Display Settings...');
    
    return new Promise((resolve) => {
        exec('start ms-settings:display', (error) => {
            if (error) {
                resolve({ success: false, error: error.message });
                return;
            }
            
            resolve({
                success: true,
                message: 'Display Settings abierto',
                output: 'Se ha abierto la configuración de pantalla.'
            });
        });
    });
}

// ==========================================
// AI CHAT
// ==========================================

ipcMain.handle('ai-chat', async (event, message) => {
    console.log('💬 AI Chat:', message);
    
    const responses = {
        'hola': '¡Hola! Soy tu asistente de Windows Cleaner Pro. ¿En qué puedo ayudarte?',
        'hello': 'Hello! I\'m your Windows Cleaner Pro assistant. How can I help you?',
        'hi': 'Hi there! What can I help you with?',
        'help': 'Puedo ayudarte con: limpieza del sistema, reparación de Windows, optimización de disco, y más.',
        'ayuda': 'Puedo ayudarte con: limpieza del sistema, reparación de Windows, optimización de disco, y más.',
        'clean': 'Para limpiar tu PC: 1) Usa Archivos Temporales, 2) Ejecuta Disk Cleanup, 3) Reinicia tu PC.',
        'limpiar': 'Para limpiar tu PC: 1) Usa Archivos Temporales, 2) Ejecuta Disk Cleanup, 3) Reinicia tu PC.',
        'slow': 'PC lento? Prueba: 1) Limpiar archivos temporales, 2) Ejecutar DISM, 3) Verificar Windows Update.',
        'lento': 'PC lento? Prueba: 1) Limpiar archivos temporales, 2) Ejecutar DISM, 3) Verificar Windows Update.',
        'error': 'Para errores del sistema: 1) Ejecuta SFC Scan, 2) Luego DISM Repair, 3) Reinicia como Administrador.',
        'gracias': '¡De nada! Estoy aquí para ayudarte.',
        'thanks': 'You\'re welcome! Let me know if you need anything else.'
    };
    
    const lowerMessage = message.toLowerCase();
    let response = 'Soy tu asistente de Windows Cleaner Pro. Pregúntame sobre limpieza, optimización o errores del sistema.';
    
    for (const [key, value] of Object.entries(responses)) {
        if (lowerMessage.includes(key)) {
            response = value;
            break;
        }
    }
    
    return { success: true, response };
});

// ==========================================
// END OF FILE
// ==========================================

console.log('✅ Main process initialized');
console.log('Designed by Pedro IT Expert in CyberSeguridad');