// ==========================================
// MAIN.JS
// Cuban Technology Cleaner v2.0.2
// by Pedro IT Solutions
// ==========================================

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const axios = require('axios');

// Backend URL
const BACKEND_URL = 'https://api.windowscleanerpro.com';

let mainWindow;
let currentUser = null;

console.log('=========================================');
console.log('  Cuban Technology Cleaner v2.0.2');
console.log('  Backend:', BACKEND_URL);
console.log('  by Pedro IT Solutions');
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
        
        // Cargar la pantalla principal después del login exitoso
        mainWindow.loadFile('index.html');
        
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
    shell.openExternal('https://windowscleanerpro.com/pricing');
    return { success: true };
});

ipcMain.handle('open-chat', async () => {
    return { success: true };
});

// ==========================================
// UNIVERSAL TOOL RUNNER
// ==========================================

ipcMain.handle('run-tool', async (event, toolName) => {
    console.log(`🔧 Running tool: ${toolName}`);
    
    try {
        switch(toolName) {
            case 'dism':
            case 'dism-repair':
                return await runDISM();
            case 'sfc':
            case 'sfc-scan':
                return await runSFC();
            case 'diskcleanup':
            case 'disk-cleanup':
                return await runDiskCleanup();
            case 'tempfiles':
            case 'temp-files':
                return await runTempFiles();
            case 'dnsflush':
            case 'dns-flush':
                return await runDNSFlush();
            case 'systeminfo':
            case 'system-info':
                return await runSystemInfo();
            case 'windowsupdate':
            case 'windows-update':
                return await runWindowsUpdate();
            case 'displaysettings':
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

    for (const tempDir of tempDirs) {
        try {
            try {
                await fs.access(tempDir);
            } catch {
                continue;
            }

            const files = await fs.readdir(tempDir);
            
            for (const file of files) {
                try {
                    const filePath = pathModule.join(tempDir, file);
                    const stats = await fs.stat(filePath);
                    
                    if (stats.isFile()) {
                        const now = Date.now();
                        const fileAge = now - stats.mtime.getTime();
                        const daysOld = fileAge / (1000 * 60 * 60 * 24);
                        
                        if (daysOld > 1) {
                            await fs.unlink(filePath);
                            totalDeleted++;
                            totalSize += stats.size;
                            
                            if (mainWindow) {
                                mainWindow.webContents.send('console-output', `Deleted: ${file}\n`);
                            }
                        }
                    }
                } catch (err) {
                    // Skip files in use
                }
            }
        } catch (err) {
            // Skip inaccessible directories
        }
    }

    const sizeInMB = (totalSize / 1024 / 1024).toFixed(2);
    
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
        uptime: (os.uptime() / 3600).toFixed(2) + ' hours'
    };
    
    const output = `
Hostname: ${info.hostname}
Plataforma: ${info.platform}
Arquitectura: ${info.arch}
Version OS: ${info.osVersion}
CPU: ${info.cpus}
Nucleos: ${info.cpuCores}
Memoria Total: ${info.totalMemory}
Memoria Libre: ${info.freeMemory}
Tiempo Encendido: ${info.uptime}
    `.trim();
    
    return {
        success: true,
        message: 'Informacion del Sistema',
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
                output: 'Se ha abierto la configuracion de Windows Update.'
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
                output: 'Se ha abierto la configuracion de pantalla.'
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
        'hola': '¡Hola! Soy tu asistente de Cuban Technology Cleaner. ¿En qué puedo ayudarte?',
        'hello': 'Hello! I am your Cuban Technology Cleaner assistant. How can I help you?',
        'help': 'Puedo ayudarte con: limpieza del sistema, reparacion de Windows, optimizacion de disco, y mas.',
        'ayuda': 'Puedo ayudarte con: limpieza del sistema, reparacion de Windows, optimizacion de disco, y mas.',
        'clean': 'Para limpiar tu PC: 1) Usa Archivos Temporales, 2) Ejecuta Disk Cleanup, 3) Reinicia tu PC.',
        'limpiar': 'Para limpiar tu PC: 1) Usa Archivos Temporales, 2) Ejecuta Disk Cleanup, 3) Reinicia tu PC.',
        'slow': 'PC lento? Prueba: 1) Limpiar archivos temporales, 2) Ejecutar DISM, 3) Verificar Windows Update.',
        'lento': 'PC lento? Prueba: 1) Limpiar archivos temporales, 2) Ejecutar DISM, 3) Verificar Windows Update.',
        'gracias': '¡De nada! Estoy aqui para ayudarte.',
        'thanks': 'You are welcome! Let me know if you need anything else.'
    };
    
    const lowerMessage = message.toLowerCase();
    let response = 'Soy tu asistente de Cuban Technology Cleaner. Preguntame sobre limpieza, optimizacion o errores del sistema.';
    
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
console.log('by Pedro IT Solutions - Odessa, Texas');// ==========================================
// MAIN.JS
// Cuban Technology Cleaner v2.0.2
// by Pedro IT Solutions
// ==========================================

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const axios = require('axios');

// Backend URL
const BACKEND_URL = 'https://api.windowscleanerpro.com';

let mainWindow;
let currentUser = null;

console.log('=========================================');
console.log('  Cuban Technology Cleaner v2.0.2');
console.log('  Backend:', BACKEND_URL);
console.log('  by Pedro IT Solutions');
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
        
        // *** CARGAR PANTALLA PRINCIPAL DESPUÉS DEL LOGIN ***
        mainWindow.loadFile('index.html');
        
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
    shell.openExternal('https://windowscleanerpro.com/pricing');
    return { success: true };
});

ipcMain.handle('open-chat', async () => {
    return { success: true };
});

// ==========================================
// UNIVERSAL TOOL RUNNER
// ==========================================

ipcMain.handle('run-tool', async (event, toolName) => {
    console.log(`🔧 Running tool: ${toolName}`);
    
    try {
        switch(toolName) {
            case 'dism':
            case 'dism-repair':
                return await runDISM();
            case 'sfc':
            case 'sfc-scan':
                return await runSFC();
            case 'diskcleanup':
            case 'disk-cleanup':
                return await runDiskCleanup();
            case 'tempfiles':
            case 'temp-files':
                return await runTempFiles();
            case 'dnsflush':
            case 'dns-flush':
                return await runDNSFlush();
            case 'systeminfo':
            case 'system-info':
                return await runSystemInfo();
            case 'windowsupdate':
            case 'windows-update':
                return await runWindowsUpdate();
            case 'displaysettings':
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
            if (mainWindow) {
                mainWindow.webContents.send('console-output', text);
            }
        });

        dismProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        dismProcess.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true, message: 'DISM Repair completado', output: output });
            } else if (code === 740) {
                resolve({ success: false, error: 'Se requieren permisos de Administrador', requiresAdmin: true });
            } else {
                resolve({ success: false, error: `DISM fallo con codigo ${code}`, output: errorOutput });
            }
        });

        dismProcess.on('error', (err) => {
            resolve({ success: false, error: err.message, requiresAdmin: true });
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
            if (mainWindow) {
                mainWindow.webContents.send('console-output', text);
            }
        });

        sfcProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        sfcProcess.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true, message: 'SFC Scan completado', output: output });
            } else if (code === 740) {
                resolve({ success: false, error: 'Se requieren permisos de Administrador', requiresAdmin: true });
            } else {
                resolve({ success: false, error: `SFC fallo con codigo ${code}`, output: errorOutput });
            }
        });

        sfcProcess.on('error', (err) => {
            resolve({ success: false, error: err.message, requiresAdmin: true });
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

    for (const tempDir of tempDirs) {
        try {
            await fs.access(tempDir);
            const files = await fs.readdir(tempDir);
            
            for (const file of files) {
                try {
                    const filePath = pathModule.join(tempDir, file);
                    const stats = await fs.stat(filePath);
                    
                    if (stats.isFile()) {
                        const daysOld = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
                        if (daysOld > 1) {
                            await fs.unlink(filePath);
                            totalDeleted++;
                            totalSize += stats.size;
                        }
                    }
                } catch (err) {}
            }
        } catch (err) {}
    }

    const sizeInMB = (totalSize / 1024 / 1024).toFixed(2);
    
    return {
        success: true,
        message: `Limpieza completada: ${totalDeleted} archivos eliminados (${sizeInMB} MB)`,
        output: `Archivos: ${totalDeleted}\nEspacio: ${sizeInMB} MB`
    };
}

// ==========================================
// TOOL: DISK CLEANUP
// ==========================================

async function runDiskCleanup() {
    return new Promise((resolve) => {
        exec('cleanmgr /sagerun:1', () => {
            resolve({
                success: true,
                message: 'Disk Cleanup iniciado',
                output: 'La ventana de limpieza se ha abierto.'
            });
        });
    });
}

// ==========================================
// TOOL: SYSTEM INFO
// ==========================================

async function runSystemInfo() {
    const os = require('os');
    
    const output = `
Hostname: ${os.hostname()}
Plataforma: ${os.platform()}
Arquitectura: ${os.arch()}
Version OS: ${os.release()}
CPU: ${os.cpus()[0]?.model || 'Unknown'}
Nucleos: ${os.cpus().length}
Memoria Total: ${(os.totalmem() / (1024 ** 3)).toFixed(2)} GB
Memoria Libre: ${(os.freemem() / (1024 ** 3)).toFixed(2)} GB
Tiempo Encendido: ${(os.uptime() / 3600).toFixed(2)} horas
    `.trim();
    
    return { success: true, message: 'Info del Sistema', output: output };
}

// ==========================================
// TOOL: WINDOWS UPDATE
// ==========================================

async function runWindowsUpdate() {
    return new Promise((resolve) => {
        exec('start ms-settings:windowsupdate', (error) => {
            if (error) {
                resolve({ success: false, error: error.message });
            } else {
                resolve({ success: true, message: 'Windows Update abierto' });
            }
        });
    });
}

// ==========================================
// TOOL: DISPLAY SETTINGS
// ==========================================

async function runDisplaySettings() {
    return new Promise((resolve) => {
        exec('start ms-settings:display', (error) => {
            if (error) {
                resolve({ success: false, error: error.message });
            } else {
                resolve({ success: true, message: 'Display Settings abierto' });
            }
        });
    });
}

// ==========================================
// AI CHAT
// ==========================================

ipcMain.handle('ai-chat', async (event, message) => {
    const responses = {
        'hola': 'Hola! Soy tu asistente de Cuban Technology Cleaner. En que puedo ayudarte?',
        'hello': 'Hello! I am your Cuban Technology Cleaner assistant. How can I help?',
        'help': 'Puedo ayudarte con: limpieza del sistema, reparacion de Windows, optimizacion de disco.',
        'ayuda': 'Puedo ayudarte con: limpieza del sistema, reparacion de Windows, optimizacion de disco.',
        'clean': 'Para limpiar: 1) Archivos Temporales, 2) Disk Cleanup, 3) Reinicia.',
        'limpiar': 'Para limpiar: 1) Archivos Temporales, 2) Disk Cleanup, 3) Reinicia.',
        'gracias': 'De nada! Estoy aqui para ayudarte.',
        'thanks': 'You are welcome!'
    };
    
    const lowerMessage = message.toLowerCase();
    let response = 'Soy tu asistente de Cuban Technology Cleaner. Preguntame sobre limpieza u optimizacion.';
    
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
console.log('by Pedro IT Solutions - Odessa, Texas');