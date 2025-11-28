import os
import sys
import ctypes
import subprocess
import time
import logging
import urllib.request
import urllib.error
import shutil
import threading
from flask import Flask, render_template, jsonify, request, send_from_directory

# --- Configurações Globais ---
NOME_PROCESSO_AGENTE = "Agente_comunicacao.exe"
NOME_PROCESSO_SERVICO_DOMINIO = "ServicoDominioAtendimento.exe"
PASTA_AGENTE_BASE = r"C:\Contabil\Agente de Comunicação com o Domínio Atendimento"
PASTA_DOWNLOAD_AGENTE = os.path.join(PASTA_AGENTE_BASE, "DownloadAgente")
NOME_INSTALADOR_AGENTE = "InstalaAgente.exe"
CAMINHO_COMPLETO_INSTALADOR = os.path.join(PASTA_DOWNLOAD_AGENTE, NOME_INSTALADOR_AGENTE)
CAMINHO_AGENTE_POS_INSTALACAO = os.path.join(PASTA_AGENTE_BASE, NOME_PROCESSO_AGENTE)
URL_BASE_DOWNLOAD = "http://download.dominiosistemas.com.br/hide/agente/Agente-Comunicacao"

# Configuração de Log
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def _base_path():
    if hasattr(sys, '_MEIPASS'):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))

app = Flask(
    __name__,
    template_folder=os.path.join(_base_path(), 'templates'),
    static_folder=os.path.join(_base_path(), 'static')
)

# --- Estado Global ---
app_state = {
    "status": "idle", # idle, downloading, installing, success, error
    "message": "Aguardando início...",
    "progress": 0,
    "total_mb": 0,
    "downloaded_mb": 0,
    "error_details": ""
}

# --- Funções Auxiliares ---
def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False

def terminate_process(process_name):
    logging.info(f"Tentando finalizar processo: {process_name}")
    try:
        result = subprocess.run(["taskkill", "/F", "/IM", process_name, "/T"],
                                capture_output=True, text=True, check=False,
                                encoding='cp850', errors='ignore')
        if result.returncode == 0:
            logging.info(f"Processo '{process_name}' finalizado.")
            return True
        elif result.returncode == 128:
            logging.info(f"Processo '{process_name}' não encontrado.")
            return True
        else:
            logging.warning(f"Falha ao finalizar '{process_name}': {result.stderr}")
            return False
    except Exception as e:
        logging.error(f"Erro ao finalizar '{process_name}': {e}")
        return False

def download_worker(version):
    global app_state
    url = f"{URL_BASE_DOWNLOAD}/{version}/{NOME_INSTALADOR_AGENTE}"
    destination_path = CAMINHO_COMPLETO_INSTALADOR
    
    app_state["status"] = "downloading"
    app_state["progress"] = 0
    app_state["message"] = "Iniciando download..."
    
    # Tentar remover arquivo existente. Se falhar por permissão, matar o processo do instalador.
    if os.path.exists(destination_path):
        try:
            os.remove(destination_path)
        except PermissionError:
            logging.warning("Permissão negada ao remover instalador. Tentando finalizar processo InstalaAgente.exe...")
            terminate_process(NOME_INSTALADOR_AGENTE)
            time.sleep(1) # Esperar o processo morrer
            try:
                os.remove(destination_path)
            except Exception as e_retry:
                app_state["status"] = "error"
                app_state["message"] = f"Erro ao substituir instalador existente. Feche o instalador manualmente e tente novamente. ({e_retry})"
                return
        except Exception as e:
            logging.warning(f"Erro ao remover instalador antigo: {e}")

    try:
        os.makedirs(os.path.dirname(destination_path), exist_ok=True)
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        
        with urllib.request.urlopen(req, timeout=600) as response, open(destination_path, 'wb') as f:
            meta = response.info()
            total_length_str = meta.get('Content-Length')
            
            if total_length_str:
                total_length = int(total_length_str)
                app_state["total_mb"] = total_length / (1024 * 1024)
                dl = 0
                block_size = 8192
                
                while True:
                    chunk = response.read(block_size)
                    if not chunk:
                        break
                    dl += len(chunk)
                    f.write(chunk)
                    
                    done_ratio = dl / total_length
                    app_state["progress"] = int(done_ratio * 100)
                    app_state["downloaded_mb"] = dl / (1024 * 1024)
                    app_state["message"] = f"Baixando... {app_state['progress']}%"
            else:
                app_state["message"] = "Baixando (tamanho desconhecido)..."
                shutil.copyfileobj(response, f)
                
        app_state["status"] = "download_complete"
        app_state["message"] = "Download concluído!"
        app_state["progress"] = 100
        
    except urllib.error.HTTPError as e:
        app_state["status"] = "error"
        if e.code == 404 or e.code == 403:
            app_state["message"] = "Versão informada incorretamente ou não disponível.\nVerifique o formato (Ex: 14.80)."
        else:
            app_state["message"] = f"Erro de download: {e.code} {e.reason}"
    except Exception as e:
        app_state["status"] = "error"
        app_state["message"] = f"Erro inesperado: {str(e)}"

# --- Rotas ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(_base_path(), 'static'), 'favicon.svg', mimetype='image/svg+xml')

@app.route('/api/status')
def get_status():
    return jsonify(app_state)

@app.route('/api/init', methods=['POST'])
def init_process():
    if not is_admin():
        return jsonify({"success": False, "message": "O script precisa ser executado como Administrador."}), 403
    
    terminate_process(NOME_PROCESSO_AGENTE)
    terminate_process(NOME_PROCESSO_SERVICO_DOMINIO)
    
    return jsonify({"success": True, "message": "Processos finalizados. Pronto para download."})

@app.route('/api/download', methods=['POST'])
def start_download():
    data = request.json
    version = data.get('version')
    if not version:
        return jsonify({"success": False, "message": "Versão não informada."}), 400
    
    # Iniciar download em thread separada
    thread = threading.Thread(target=download_worker, args=(version,))
    thread.start()
    
    return jsonify({"success": True, "message": "Download iniciado."})

@app.route('/api/install', methods=['POST'])
def start_install():
    if not os.path.exists(CAMINHO_COMPLETO_INSTALADOR):
        return jsonify({"success": False, "message": "Instalador não encontrado."}), 404
    
    try:
        # Executar instalador e forçar janela
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        startupinfo.wShowWindow = 9 # SW_RESTORE (Tenta restaurar se estiver minimizado)
        
        # Inicia o processo
        subprocess.Popen([CAMINHO_COMPLETO_INSTALADOR], startupinfo=startupinfo)
        
        return jsonify({"success": True, "message": "Instalador iniciado."})
    except Exception as e:
        return jsonify({"success": False, "message": f"Erro ao iniciar instalador: {e}"}), 500

@app.route('/api/verify', methods=['POST'])
def verify_install():
    if os.path.exists(CAMINHO_AGENTE_POS_INSTALACAO):
        try:
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startupinfo.wShowWindow = 9 # SW_RESTORE
            
            subprocess.Popen([CAMINHO_AGENTE_POS_INSTALACAO], startupinfo=startupinfo)
            return jsonify({"success": True, "message": "Agente encontrado e iniciado."})
        except Exception as e:
             return jsonify({"success": True, "message": f"Agente encontrado, mas erro ao iniciar: {e}"}) # Consideramos sucesso pois o arquivo existe
    else:
        return jsonify({"success": False, "message": "Agente não encontrado após instalação."})

@app.route('/api/exit', methods=['POST'])
def exit_app():
    # Agenda o encerramento do processo para garantir que a resposta HTTP seja enviada
    def kill_me():
        time.sleep(0.5)
        logging.info("Encerrando aplicação a pedido do usuário...")
        os._exit(0) # Força o encerramento imediato
        
    threading.Thread(target=kill_me).start()
    return jsonify({"success": True, "message": "Encerrando aplicação..."})

if __name__ == '__main__':
    # Auto-elevação para Administrador
    if not is_admin():
        # Re-executa o script com privilégios de administrador
        logging.info("Reiniciando como administrador...")
        try:
            ctypes.windll.shell32.ShellExecuteW(
                None, "runas", sys.executable, " ".join(sys.argv), None, 1
            )
        except Exception as e:
            logging.error(f"Falha ao solicitar elevação: {e}")
        sys.exit() # Encerra a instância sem privilégios

    # Abrir navegador automaticamente
    import webbrowser
    # Timer para garantir que o servidor iniciou antes de abrir
    threading.Timer(1.5, lambda: webbrowser.open("http://127.0.0.1:5000")).start()
    
    app.run(debug=False, use_reloader=False) # debug=False para evitar duplo reload com elevação
