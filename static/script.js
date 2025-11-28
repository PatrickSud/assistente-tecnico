let currentVersion = "";
let pollInterval = null;

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
                
                // Reset UI for standard flow
                const manualUi = document.getElementById('manual-install-ui');
                if (manualUi) manualUi.style.display = 'block';
                document.getElementById('install-check-area').style.display = 'none';

                setTimeout(() => goToStep('step-install'), 1000);
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

            // Show the "Verify" button
            document.getElementById('install-check-area').style.display = 'block';
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
            
            document.getElementById('install-check-area').style.display = 'block';
            
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
