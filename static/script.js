let currentVersion = "";
let pollInterval = null;

// Check for updates on page load
window.addEventListener('DOMContentLoaded', async () => {
    // Hide subtitle on selection screen
    const subtitle = document.getElementById('app-subtitle');
    if (subtitle) subtitle.style.display = 'none';
    
    setTimeout(checkForUpdates, 2000); // Wait 2s for backend to check
});

async function checkForUpdates() {
    try {
        const response = await fetch('/api/status');
        const state = await response.json();
        
        if (state.update_available) {
            showUpdateNotification(state.current_version, state.latest_version, state.download_url);
        }
    } catch (e) {
        console.warn("Could not check for updates:", e);
    }
}

function showUpdateNotification(currentVer, latestVer, downloadUrl) {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
        <div class="update-content">
            <div class="update-icon">🔔</div>
            <div class="update-text">
                <strong>Nova versão disponível!</strong>
                <p>Versão atual: v${currentVer} → Nova versão: v${latestVer}</p>
            </div>
            <div class="update-actions">
                <a href="${downloadUrl}" target="_blank" class="btn-update">Baixar Atualização</a>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" class="btn-dismiss">Dispensar</button>
            </div>
        </div>
    `;
    document.body.appendChild(notification);
}

let selectedApp = '';
let navigationHistory = ['step-selection'];

function selectApp(appType) {
    selectedApp = appType;
    
    // Update header based on selection
    const subtitle = document.getElementById('app-subtitle');
    if (subtitle) {
        subtitle.style.display = 'block';
        switch(appType) {
            case 'agente':
                subtitle.textContent = 'Agente de Comunicação';
                break;
            case 'dominio':
                subtitle.textContent = 'Domínio Sistemas';
                break;
            case 'buscanfe':
                subtitle.textContent = 'Busca NF-e';
                break;
        }
    }

    // Update title and description for Domínio Sistemas
    const prepTitle = document.getElementById('prep-title');
    const prepDescription = document.getElementById('prep-description');
    
    if (appType === 'dominio') {
        if (prepTitle) prepTitle.textContent = 'O que você quer fazer?';
        if (prepDescription) prepDescription.style.display = 'none';
    } else {
        if (prepTitle) prepTitle.textContent = 'Preparação';
        if (prepDescription) {
            prepDescription.style.display = 'block';
            prepDescription.innerHTML = 'Vamos preparar o ambiente para a atualização. Isso <b>finalizará</b> os processos do Agente de Comunicação.';
        }
    }

    // Show/Hide Operation Type for Domínio Sistemas
    const opContainer = document.getElementById('operation-type-container');
    if (appType === 'dominio') {
        opContainer.style.display = 'block';
        // Reset to Update mode
        document.querySelector('input[name="operationType"][value="update"]').checked = true;
        toggleOperationMode();
        
        // Fetch and display the latest version
        fetchDominioVersion();
    } else {
        opContainer.style.display = 'none';
        // Ensure default buttons are visible for other apps
        document.getElementById('btn-start-process').style.display = 'inline-flex';
        document.getElementById('dominio-install-area').style.display = 'none';
    }
    
    // Navigate to preparation screen
    navigationHistory.push('step-welcome');
    goToStep('step-welcome');
}

function toggleOperationMode() {
    const operation = document.querySelector('input[name="operationType"]:checked').value;
    const btnStart = document.getElementById('btn-start-process');
    const dominioArea = document.getElementById('dominio-install-area');

    if (operation === 'update') {
        btnStart.style.display = 'inline-flex';
        dominioArea.style.display = 'none';
    } else {
        btnStart.style.display = 'none';
        dominioArea.style.display = 'block';
    }
}

async function fetchDominioVersion() {
    const displaySpan = document.getElementById('dominio-version-display');
    if (!displaySpan) return;
    
    // Clear previous value
    displaySpan.textContent = '';
    
    try {
        const response = await fetch('/api/dominio_version');
        const data = await response.json();
        
        if (data.success && data.version) {
            displaySpan.textContent = ` (${data.version})`;
        }
    } catch (e) {
        console.warn("Erro ao buscar versão do Domínio:", e);
    }
}

async function startDominioDownload() {
    try {
        const response = await fetch('/api/download_dominio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        const data = await response.json();
        
        if (data.success) {
            goToStep('step-download');
            startPollingStatus();
        } else {
            showError(data.message);
        }
    } catch (e) {
        showError("Erro ao iniciar download do Domínio Sistemas.");
    }
}

async function startDominioCustomDownload() {
    const versionInput = document.getElementById('dominioVersionInput');
    const version = versionInput.value.trim();
    
    if (!version) {
        alert("Por favor, informe a versão (ex: 105a10).");
        return;
    }
    
    try {
        const response = await fetch('/api/download_dominio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: version })
        });
        const data = await response.json();
        
        if (data.success) {
            goToStep('step-download');
            startPollingStatus();
        } else {
            showError(data.message);
        }
    } catch (e) {
        showError("Erro ao iniciar download da versão específica.");
    }
}

function goBack() {
    // Remove current step from history
    if (navigationHistory.length > 1) {
        navigationHistory.pop();
        const previousStep = navigationHistory[navigationHistory.length - 1];
        
        // Hide subtitle if going back to selection
        if (previousStep === 'step-selection') {
            const subtitle = document.getElementById('app-subtitle');
            if (subtitle) subtitle.style.display = 'none';
        }
        
        goToStep(previousStep);
    }
}


function goToStep(stepId) {
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    document.getElementById(stepId).classList.add('active');
}

function showError(message) {
    document.getElementById('error-message').innerText = message;
    goToStep('step-error');
}

async function startProcess() {
    try {
        const response = await fetch('/api/init', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            goToStep('step-version');
        } else {
            showError(data.message);
        }
    } catch (e) {
        showError("Erro de conexão com o servidor local.");
    }
}

async function confirmVersion() {
    const version = document.getElementById('versionInput').value.trim();
    if (!version || !version.includes('.')) {
        alert("Por favor, insira uma versão válida (ex: 14.80).");
        return;
    }
    currentVersion = version;
    
    try {
        const response = await fetch('/api/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version: currentVersion })
        });
        const data = await response.json();
        
        if (data.success) {
            goToStep('step-download');
            startPollingStatus();
        } else {
            showError(data.message);
        }
    } catch (e) {
        showError("Erro ao iniciar download.");
    }
}

function startPollingStatus() {
    if (pollInterval) clearInterval(pollInterval);
    
    pollInterval = setInterval(async () => {
        try {
            const response = await fetch('/api/status');
            const state = await response.json();
            
            // Update UI
            document.getElementById('download-status-text').innerText = state.message;
            document.getElementById('progressBar').style.width = state.progress + '%';
            document.getElementById('dl-size').innerText = state.downloaded_mb.toFixed(2);
            
            if (state.status === 'download_complete') {
                clearInterval(pollInterval);
                
                // Automatically run the installer and transition to install step
                setTimeout(async () => {
                    // Pre-configure UI to avoid flicker
                    const manualUi = document.getElementById('manual-install-ui');
                    if (manualUi) manualUi.style.display = 'none';
                    
                    // Only show install-check-area for Agente, not Domínio
                    if (selectedApp !== 'dominio') {
                        document.getElementById('install-check-area').style.display = 'block';
                        document.getElementById('dominio-finish-area').style.display = 'none';
                    } else {
                        document.getElementById('install-check-area').style.display = 'none';
                        document.getElementById('dominio-finish-area').style.display = 'block';
                    }
                    
                    goToStep('step-install');
                    await runInstaller();
                }, 500);
            } else if (state.status === 'error') {
                clearInterval(pollInterval);
                showError(state.message);
            }
        } catch (e) {
            console.error("Polling error", e);
        }
    }, 1000);
}

async function runInstaller() {
    try {
        const response = await fetch('/api/install', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            // Hide the manual install UI to match "Executar" behavior
            const manualUi = document.getElementById('manual-install-ui');
            if (manualUi) manualUi.style.display = 'none';

            // Only show the "Verify" button for Agente, not for Domínio
            if (selectedApp !== 'dominio') {
                document.getElementById('install-check-area').style.display = 'block';
                document.getElementById('dominio-finish-area').style.display = 'none';
            } else {
                document.getElementById('install-check-area').style.display = 'none';
                document.getElementById('dominio-finish-area').style.display = 'block';
            }
        } else {
            showError(data.message);
        }
    } catch (e) {
        showError("Erro ao abrir instalador.");
    }
}

async function runExistingInstaller() {
    try {
        const response = await fetch('/api/install', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            // Setup UI for direct execution
            const manualUi = document.getElementById('manual-install-ui');
            if (manualUi) manualUi.style.display = 'none';
            
            if (selectedApp !== 'dominio') {
                document.getElementById('install-check-area').style.display = 'block';
                document.getElementById('dominio-finish-area').style.display = 'none';
            } else {
                document.getElementById('install-check-area').style.display = 'none';
                document.getElementById('dominio-finish-area').style.display = 'block';
            }
            
            goToStep('step-install');
        } else {
            alert(data.message || "Instalador não encontrado na pasta.");
        }
    } catch (e) {
        alert("Erro ao executar instalador: " + e.message);
    }
}

async function verifyInstallation() {
    try {
        const response = await fetch('/api/verify', { method: 'POST' });
        const data = await response.json();
        
        if (data.success) {
            goToStep('step-success');
        } else {
            alert("O Agente ainda não foi encontrado. Certifique-se de concluir a instalação e tente novamente.");
        }
    } catch (e) {
        showError("Erro na verificação.");
    }
}

async function exitApp() {
    try {
        // Envia requisição para encerrar o servidor primeiro
        try {
            await fetch('/api/exit', { method: 'POST' });
        } catch (err) {
            console.warn("Erro ao contatar servidor para sair (pode já estar fechado):", err);
        }
        
        // Tenta fechar a janela
        window.close();
        
        // Se a janela não fechou, exibe mensagem
        document.body.innerHTML = "<div style='display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column;font-family:sans-serif;text-align:center;'><h1>Aplicação Encerrada</h1><p>Você pode fechar esta guia agora.</p></div>";
        
    } catch (e) {
        console.error("Erro ao sair:", e);
        alert("Erro ao encerrar aplicação.");
    }
}
