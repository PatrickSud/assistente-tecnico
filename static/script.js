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

    // Update title and description based on app type
    const prepTitle = document.getElementById('prep-title');
    const prepDescription = document.getElementById('prep-description');
    
    if (appType === 'buscanfe') {
        // Busca NF-e goes directly to installation
        if (prepTitle) prepTitle.textContent = 'Baixar Instalador';
        if (prepDescription) prepDescription.style.display = 'none';
    } else if (appType === 'dominio') {
        if (prepTitle) prepTitle.textContent = 'O que você quer fazer?';
        if (prepDescription) prepDescription.style.display = 'none';
    } else {
        if (prepTitle) prepTitle.textContent = 'Preparação';
        if (prepDescription) {
            prepDescription.style.display = 'block';
            prepDescription.innerHTML = 'Vamos preparar o ambiente para a atualização. Isso <b>finalizará</b> os processos do Agente de Comunicação.';
        }
    }

    // Show/Hide Operation Type - only for Domínio Sistemas
    const opContainer = document.getElementById('operation-type-container');
    if (appType === 'dominio') {
        opContainer.style.display = 'block';
        // Reset to Update mode
        document.querySelector('input[name="operationType"][value="update"]').checked = true;
        toggleOperationMode();
        
        // Fetch and display the latest version
        fetchDominioVersion();
    } else if (appType === 'buscanfe') {
        // Busca NF-e: hide options, show install area directly
        opContainer.style.display = 'none';
        document.getElementById('btn-start-process').style.display = 'none';
        document.getElementById('dominio-install-area').style.display = 'none';
        document.getElementById('buscanfe-install-area').style.display = 'block';
        
        // Fetch and display the latest version
        fetchBuscaNFeVersion();
    } else {
        opContainer.style.display = 'none';
        // Ensure default buttons are visible for other apps
        document.getElementById('btn-start-process').style.display = 'inline-flex';
        document.getElementById('dominio-install-area').style.display = 'none';
        document.getElementById('buscanfe-install-area').style.display = 'none';
    }
    
    // Navigate to preparation screen
    navigationHistory.push('step-welcome');
    goToStep('step-welcome');
}

function toggleOperationMode() {
    const operation = document.querySelector('input[name="operationType"]:checked').value;
    const btnStart = document.getElementById('btn-start-process');
    const dominioInstallArea = document.getElementById('dominio-install-area');
    const dominioUpdateArea = document.getElementById('dominio-update-area');
    const buscanfeArea = document.getElementById('buscanfe-install-area');

    if (operation === 'update') {
        btnStart.style.display = 'none';
        dominioInstallArea.style.display = 'none';
        buscanfeArea.style.display = 'none';
        
        // Show update area and fetch update info for Dominio
        if (selectedApp === 'dominio') {
            dominioUpdateArea.style.display = 'block';
            fetchDominioUpdateInfo();
            fetchDominioUpdateVersions();
        } else {
            dominioUpdateArea.style.display = 'none';
            btnStart.style.display = 'inline-flex';
        }
    } else {
        btnStart.style.display = 'none';
        dominioUpdateArea.style.display = 'none';
        
        // Show the appropriate install area based on selected app
        if (selectedApp === 'dominio') {
            dominioInstallArea.style.display = 'block';
            buscanfeArea.style.display = 'none';
            fetchDominioVersions();
        } else if (selectedApp === 'buscanfe') {
            dominioInstallArea.style.display = 'none';
            buscanfeArea.style.display = 'block';
        }
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

// ===== Funções de Atualização do Domínio Sistemas =====

async function fetchDominioUpdateInfo() {
    try {
        const response = await fetch('/api/dominio_update_info');
        const data = await response.json();
        
        if (data.success) {
            // Preencher versão completa
            const versionSpan = document.getElementById('dominio-update-version');
            if (versionSpan) {
                versionSpan.textContent = ` (${data.version})`;
            }
            
            // Mostrar/ocultar botão de ajuste
            const adjustmentBtn = document.getElementById('btn-update-adjustment');
            const adjustmentSpan = document.getElementById('dominio-adjustment-version');
            
            if (data.has_adjustment && data.adjustment) {
                adjustmentBtn.style.display = 'block';
                if (adjustmentSpan) {
                    adjustmentSpan.textContent = ` (${data.adjustment})`;
                }
            } else {
                adjustmentBtn.style.display = 'none';
            }
        }
    } catch (e) {
        console.warn("Erro ao buscar informações de atualização:", e);
    }
}

async function startDominioFullUpdate() {
    try {
        const response = await fetch('/api/download_dominio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ download_type: 'update' })
        });
        const data = await response.json();
        
        if (data.success) {
            goToStep('step-download');
            startPollingStatus();
        } else {
            showError(data.message);
        }
    } catch (e) {
        showError("Erro ao iniciar download da atualização.");
    }
}

async function startDominioAdjustmentUpdate() {
    try {
        // Buscar informação do ajuste
        const infoResponse = await fetch('/api/dominio_update_info');
        const infoData = await infoResponse.json();
        
        if (infoData.success && infoData.adjustment) {
            const response = await fetch('/api/download_dominio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    version: infoData.adjustment,
                    download_type: 'update'
                })
            });
            const data = await response.json();
            
            if (data.success) {
                goToStep('step-download');
                startPollingStatus();
            } else {
                showError(data.message);
            }
        }
    } catch (e) {
        showError("Erro ao iniciar download do ajuste.");
    }
}

async function startDominioCustomUpdate() {
    const versionInput = document.getElementById('dominioUpdateVersionInput');
    const version = versionInput.value.trim();
    
    if (!version) {
        alert("Por favor, informe a versão ou ajuste (ex: 105a11 ou 105a11b).");
        return;
    }
    
    try {
        const response = await fetch('/api/download_dominio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                version: version,
                download_type: 'update'
            })
        });
        const data = await response.json();
        
        if (data.success) {
            goToStep('step-download');
            startPollingStatus();
        } else {
            showError(data.message);
        }
    } catch (e) {
        showError("Erro ao iniciar download da versão/ajuste específico.");
    }
}



// ===== Seletor de Versões (Instalação Domínio) =====

let dominioVersionsLoaded = false;

async function fetchDominioVersions() {
    if (dominioVersionsLoaded) return; // Evitar recarregar se já carregou

    const grid = document.getElementById('dominio-versions-grid');
    const moreContainer = document.getElementById('dominio-all-versions-container');
    const moreBtn = document.getElementById('btn-dominio-more-versions');

    try {
        const response = await fetch('/api/dominio_versions');
        const data = await response.json();

        if (data.success && data.versions.length > 0) {
            grid.innerHTML = ''; // Limpar loading
            moreContainer.innerHTML = '';
            
            // Renderizar top 4
            const top4 = data.versions.slice(0, 4);
            top4.forEach(version => {
                const btn = createVersionButton(version);
                grid.appendChild(btn);
            });

            // Renderizar restantes
            if (data.versions.length > 4) {
                const remaining = data.versions.slice(4);
                remaining.forEach(version => {
                    const btn = createVersionButton(version);
                    moreContainer.appendChild(btn);
                });
                moreBtn.style.display = 'inline-block';
            } else {
                moreBtn.style.display = 'none';
            }
            
            dominioVersionsLoaded = true;
        } else {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); font-size: 0.9rem;">Nenhuma versão encontrada.</div>';
        }
    } catch (e) {
        console.error("Erro fetching versions:", e);
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--error-color); font-size: 0.9rem;">Erro ao carregar versões.</div>';
    }
}

function createVersionButton(version) {
    const btn = document.createElement('button');
    btn.className = 'btn-secondary'; // Reutilizando estilo
    btn.textContent = version;
    btn.style.width = '100%';
    // Adicionar um pouco de destaque no hover se possível, mas btn-secondary já deve ter
    btn.onclick = () => startDominioVersionDownload(version);
    return btn;
}

function toggleDominioMoreVersions() {
    const container = document.getElementById('dominio-all-versions-container');
    const btn = document.getElementById('btn-dominio-more-versions');
    
    if (container.style.display === 'none') {
        container.style.display = 'grid';
        btn.textContent = 'Menos...';
    } else {
        container.style.display = 'none';
        btn.textContent = 'Mais...';
    }
}

async function startDominioVersionDownload(version) {
    if (!confirm(`Deseja baixar e instalar a versão ${version} do Domínio Sistemas?`)) return;

    try {
        const response = await fetch('/api/download_dominio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                version: version,
                download_type: 'install' 
            })
        });
        const data = await response.json();
        
        if (data.success) {
            goToStep('step-download');
            startPollingStatus();
        } else {
            showError(data.message);
        }
    } catch (e) {
        showError("Erro ao iniciar download da versão " + version);
    }
}

// ===== Seletor de Versões (Atualização Domínio) =====

let dominioUpdateVersionsLoaded = false;

async function fetchDominioUpdateVersions() {
    if (dominioUpdateVersionsLoaded) return;

    const grid = document.getElementById('dominio-update-versions-grid');
    const moreContainer = document.getElementById('dominio-update-all-versions-container');
    const moreBtn = document.getElementById('btn-dominio-update-more-versions');
    
    // Adicionar listener para toggle
    moreBtn.onclick = toggleDominioUpdateMoreVersions;

    try {
        const response = await fetch('/api/dominio_versions?type=update');
        const data = await response.json();

        if (data.success && data.versions.length > 0) {
            grid.innerHTML = '';
            moreContainer.innerHTML = '';
            
            // Top 4
            const top4 = data.versions.slice(0, 4);
            top4.forEach(version => {
                const btn = createUpdateVersionButton(version);
                grid.appendChild(btn);
            });

            // Resto
            if (data.versions.length > 4) {
                const remaining = data.versions.slice(4);
                remaining.forEach(version => {
                    const btn = createUpdateVersionButton(version);
                    moreContainer.appendChild(btn);
                });
                moreBtn.style.display = 'inline-block';
            } else {
                moreBtn.style.display = 'none';
            }
            
            dominioUpdateVersionsLoaded = true;
        } else {
             grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); font-size: 0.9rem;">Nenhuma versão de atualização encontrada.</div>';
        }
    } catch (e) {
        console.error("Erro fetching update versions:", e);
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--error-color); font-size: 0.9rem;">Erro ao carregar versões.</div>';
    }
}

function createUpdateVersionButton(version) {
    const btn = document.createElement('button');
    btn.className = 'btn-secondary';
    btn.textContent = version;
    btn.style.width = '100%';
    btn.onclick = () => startDominioUpdateVersionSelection(version);
    return btn;
}

function toggleDominioUpdateMoreVersions() {
    const container = document.getElementById('dominio-update-all-versions-container');
    const btn = document.getElementById('btn-dominio-update-more-versions');
    
    if (container.style.display === 'none') {
        container.style.display = 'grid';
        btn.textContent = 'Menos...';
    } else {
        container.style.display = 'none';
        btn.textContent = 'Mais...';
    }
}

async function startDominioUpdateVersionSelection(version) {
    // 1. Verificar se tem ajustes
    try {
        const response = await fetch(`/api/dominio_adjustments?version=${version}`);
        const data = await response.json();
        
        if (data.success && data.adjustments && data.adjustments.length > 0) {
            // TEM AJUSTES -> Mostrar tela de ajustes (Nível 2)
            showAdjustmentsSelection(version, data.adjustments);
        } else {
            // SEM AJUSTES -> Confirmar e baixar direto
            if (confirm(`Deseja baixar a atualização versão ${version}?`)) {
                startDominioDownloadDirect(version, 'update');
            }
        }
    } catch (e) {
        console.error("Erro ao verificar ajustes:", e);
        // Fallback: Tenta baixar direto
        if (confirm(`Erro ao verificar ajustes. Tentar baixar versão ${version} assim mesmo?`)) {
            startDominioDownloadDirect(version, 'update');
        }
    }
}

function showAdjustmentsSelection(version, adjustments) {
    // Ocultar grids de versão
    document.getElementById('dominio-update-versions-container').style.display = 'none';
    
    // Configurar container de ajustes
    const container = document.getElementById('dominio-update-adjustments-container');
    const versionSpan = document.getElementById('selected-update-version');
    const list = document.getElementById('adjustments-list');
    const btnBase = document.getElementById('btn-download-base-version');
    
    versionSpan.textContent = version;
    list.innerHTML = ''; // Limpar anteriores
    
    // Configurar botão da base
    btnBase.onclick = () => {
        if(confirm(`Baixar versão base ${version}?`)) {
             startDominioDownloadDirect(version, 'update');
        }
    };
    
    // Criar botões para cada ajuste
    adjustments.forEach(adj => {
        const btn = document.createElement('button');
        btn.className = 'btn-secondary';
        btn.textContent = `Ajuste ${adj}`;
        btn.style.width = '100%';
        btn.onclick = () => {
            if(confirm(`Baixar ajuste ${adj}?`)) {
                // Ajuste baixa usando versão="105a11/atualizacoes/105a11a"
                // Mas minha função backend download espera apenas a versão e monta o path...
                // O backend download_dominio_worker usa: url_base + version + /Atualiza.exe
                // Se eu passar version="105a11/atualizacoes/105a11a", a url fica:
                // .../atualizacao/contabil/105a11/atualizacoes/105a11a/Atualiza.exe
                // Isso funciona perfeitamente com a lógica atual!
                startDominioDownloadDirect(`${version}/atualizacoes/${adj}`, 'update');
            }
        };
        list.appendChild(btn);
    });
    
    container.style.display = 'block';
}

function backToUpdateVersions() {
    document.getElementById('dominio-update-adjustments-container').style.display = 'none';
    document.getElementById('dominio-update-versions-container').style.display = 'block';
}

async function startDominioDownloadDirect(version, type) {
    try {
        const response = await fetch('/api/download_dominio', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                version: version,
                download_type: type 
            })
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



async function fetchBuscaNFeVersion() {
    const displaySpan = document.getElementById('buscanfe-version-display');
    if (!displaySpan) return;
    
    // Clear previous value
    displaySpan.textContent = '';
    
    try {
        const response = await fetch('/api/buscanfe_version');
        const data = await response.json();
        
        if (data.success && data.version) {
            displaySpan.textContent = ` (${data.version})`;
        }
    } catch (e) {
        console.warn("Erro ao buscar versão do Busca NF-e:", e);
    }
}

async function startBuscaNFeDownload() {
    try {
        const response = await fetch('/api/download_buscanfe', {
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
        showError("Erro ao iniciar download do Busca NF-e.");
    }
}

async function startBuscaNFeCustomDownload() {
    const versionInput = document.getElementById('buscanfeVersionInput');
    const version = versionInput.value.trim();
    
    if (!version) {
        alert("Por favor, informe a versão (ex: 6.10).");
        return;
    }
    
    try {
        const response = await fetch('/api/download_buscanfe', {
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
                    
                    // Only show install-check-area for Agente, show finish button for Dominio/BuscaNFe
                    if (selectedApp === 'agente') {
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

            // Show the appropriate button based on selected app
            if (selectedApp === 'agente') {
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
            
            if (selectedApp === 'agente') {
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
