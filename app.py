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
import json
import re
from flask import Flask, render_template, jsonify, request, send_from_directory

# --- Configurações Globais ---
NOME_PROCESSO_AGENTE = "Agente_comunicacao.exe"
NOME_PROCESSO_SERVICO_DOMINIO = "ServicoDominioAtendimento.exe"
PASTA_AGENTE_BASE_REL = r"Contabil\Agente de Comunicação com o Domínio Atendimento"
PASTA_DOWNLOAD_AGENTE_REL = os.path.join(PASTA_AGENTE_BASE_REL, "DownloadAgente")
NOME_INSTALADOR_AGENTE = "InstalaAgente.exe"
# CAMINHO_COMPLETO_INSTALADOR removido em favor de resolução dinâmica
# CAMINHO_AGENTE_POS_INSTALACAO removido em favor de resolução dinâmica
URL_BASE_DOWNLOAD = "http://download.dominiosistemas.com.br/hide/agente/Agente-Comunicacao"
URL_DOMINIO_CONTABIL = "https://download.dominiosistemas.com.br/instalacao/contabil/"
NOME_INSTALADOR_DOMINIO = "InstalaDominio.exe"
# Configurações específicas do Domínio Sistemas
PASTA_DOWNLOAD_DOMINIO = r"C:\Contabil\Atualiza"
NOME_INSTALADOR_DOMINIO_CUSTOM = "instala.exe"
# Configurações específicas do Busca NF-e
URL_BUSCANFE = "https://download.dominiosistemas.com.br/instalacao/BuscaNF-eCliente/"
PASTA_DOWNLOAD_BUSCANFE = r"C:\Contabil\Atualiza\BuscaNFe"
NOME_INSTALADOR_BUSCANFE = "Instala_Cliente.exe"

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
    "error_details": "",
    "update_available": False,
    "latest_version": "",
    "current_version": "",
    "download_url": ""
}

# --- Funções de Verificação de Atualização ---
def get_current_version():
    """Obtém a versão atual do arquivo version.json"""
    try:
        version_file = os.path.join(_base_path(), 'version.json')
        if os.path.exists(version_file):
            with open(version_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('version', '1.0.0')
        return '1.0.0'
    except Exception as e:
        logging.error(f"Erro ao ler versão atual: {e}")
        return '1.0.0'

def _is_version_newer(remote_version, local_version):
    """Compara versões semanticamente. Retorna True se remote_version > local_version"""
    try:
        # Converte strings de versão em tuplas de inteiros para comparação
        remote_parts = tuple(map(int, remote_version.split('.')))
        local_parts = tuple(map(int, local_version.split('.')))
        return remote_parts > local_parts
    except Exception as e:
        logging.warning(f"Erro ao comparar versões: {e}")
        # Fallback para comparação de string se houver erro
        return remote_version != local_version

def check_for_updates():
    """Verifica se há atualizações disponíveis no GitHub"""
    try:
        current_version = get_current_version()
        app_state["current_version"] = current_version
        
        # Buscar a última release do GitHub
        version_file = os.path.join(_base_path(), 'version.json')
        with open(version_file, 'r', encoding='utf-8') as f:
            config = json.load(f)
            repo = config.get('github_repo', 'PatrickSud/assistente-tecnico')
        
        api_url = f"https://api.github.com/repos/{repo}/releases/latest"
        req = urllib.request.Request(api_url, headers={'User-Agent': 'Mozilla/5.0'})
        
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode('utf-8'))
            latest_version = data.get('tag_name', '').replace('v', '')
            
            # Comparação semântica de versão
            if latest_version and _is_version_newer(latest_version, current_version):
                app_state["update_available"] = True
                app_state["latest_version"] = latest_version
                
                # Encontrar o link do executável
                for asset in data.get('assets', []):
                    if asset['name'].endswith('.exe'):
                        app_state["download_url"] = asset['browser_download_url']
                        break
                
                logging.info(f"Atualização disponível: v{latest_version}")
            else:
                app_state["update_available"] = False
                logging.info(f"Aplicação está atualizada (Local: {current_version}, Remota: {latest_version})")
                
    except Exception as e:
        logging.warning(f"Não foi possível verificar atualizações: {e}")
        app_state["update_available"] = False

def get_latest_dominio_url():
    """Faz scraping da página para encontrar a versão mais recente do Domínio Sistemas"""
    try:
        req = urllib.request.Request(URL_DOMINIO_CONTABIL, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')
            
            # Procura por links de diretórios que parecem versões (ex: 105a11/)
            # O padrão parece ser algo como [0-9]+[a-z]+[0-9]+
            # Mas vamos pegar todos os links que terminam com / e não são parent directory
            
            # Regex simples para pegar href="xxxx/"
            dirs = re.findall(r'href="([^"/]+)/"', html)
            
            # Filtrar diretórios irrelevantes (Parent Directory, etc) se houver
            valid_dirs = [d for d in dirs if d[0].isdigit()]
            
            if not valid_dirs:
                raise Exception("Nenhuma versão encontrada.")
            
            # Ordenar para pegar o mais recente. 
            # Assumindo que a ordem alfabética/numérica resolve ou que a lista já vem ordenada.
            # O servidor Apache geralmente permite ordenar por data, mas aqui estamos parseando o HTML padrão.
            # Vamos confiar na ordenação alfabética por enquanto, ou tentar pegar a data se necessário.
            # No exemplo: 105a02 ... 105a11. A ordem alfabética funciona.
            latest_version_dir = sorted(valid_dirs)[-1]
            
            full_url = f"{URL_DOMINIO_CONTABIL}{latest_version_dir}/Instala.exe"
            logging.info(f"URL Domínio Sistemas detectada: {full_url}")
            return full_url, latest_version_dir
            
    except Exception as e:
        logging.error(f"Erro ao buscar URL do Domínio Sistemas: {e}")
        return None, None

def get_latest_buscanfe_url():
    """Faz scraping da página para encontrar a versão mais recente do Busca NF-e"""
    try:
        req = urllib.request.Request(URL_BUSCANFE, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')
            
            # Regex simples para pegar href="xxxx/"
            dirs = re.findall(r'href="([^"/]+)/"', html)
            
            # Filtrar diretórios irrelevantes (Parent Directory, etc) se houver
            valid_dirs = [d for d in dirs if d[0].isdigit()]
            
            if not valid_dirs:
                raise Exception("Nenhuma versão encontrada.")
            
            # Pegar a versão mais recente
            latest_version_dir = sorted(valid_dirs)[-1]
            
            full_url = f"{URL_BUSCANFE}{latest_version_dir}/{NOME_INSTALADOR_BUSCANFE}"
            logging.info(f"URL Busca NF-e detectada: {full_url}")
            return full_url, latest_version_dir
            
    except Exception as e:
        logging.error(f"Erro ao buscar URL do Busca NF-e: {e}")
        return None, None

def get_latest_update_url():
    """Busca a versão mais recente de atualização do Domínio Sistemas"""
    URL_UPDATE = "https://download.dominiosistemas.com.br/atualizacao/contabil/"
    try:
        req = urllib.request.Request(URL_UPDATE, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')
            
            # Regex para pegar href="xxxx/"
            dirs = re.findall(r'href="([^"/]+)/"', html)
            
            # Filtrar diretórios válidos
            valid_dirs = [d for d in dirs if d[0].isdigit()]
            
            if not valid_dirs:
                raise Exception("Nenhuma versão de atualização encontrada.")
            
            # Pegar a versão mais recente
            latest_version_dir = sorted(valid_dirs)[-1]
            
            full_url = f"{URL_UPDATE}{latest_version_dir}/Atualiza.exe"
            logging.info(f"URL de Atualização Domínio Sistemas detectada: {full_url}")
            return full_url, latest_version_dir
            
    except Exception as e:
        logging.error(f"Erro ao buscar URL de atualização: {e}")
        return None, None

def get_latest_adjustment_info(version):
    """
    Verifica se existe pasta 'atualizacoes' para uma versão específica
    e retorna o ajuste mais recente se existir
    """
    URL_UPDATE = "https://download.dominiosistemas.com.br/atualizacao/contabil/"
    adjustments_url = f"{URL_UPDATE}{version}/atualizacoes/"
    
    try:
        req = urllib.request.Request(adjustments_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')
            
            # Regex para pegar href="xxxx/"
            dirs = re.findall(r'href="([^"/]+)/"', html)
            
            # Filtrar diretórios válidos (ajustes geralmente seguem padrão XXXaXXa, XXXaXXb, etc)
            valid_dirs = [d for d in dirs if d[0].isdigit()]
            
            if not valid_dirs:
                logging.info(f"Nenhum ajuste encontrado para versão {version}")
                return None, None
            
            # Pegar o ajuste mais recente
            latest_adjustment = sorted(valid_dirs)[-1]
            
            adjustment_url = f"{adjustments_url}{latest_adjustment}/Atualiza.exe"
            logging.info(f"Ajuste detectado: {latest_adjustment} - URL: {adjustment_url}")
            return adjustment_url, latest_adjustment
            
    except urllib.error.HTTPError as e:
        if e.code == 404:
            logging.info(f"Pasta de ajustes não existe para versão {version}")
        else:
            logging.error(f"Erro HTTP ao buscar ajustes: {e.code}")
        return None, None
    except Exception as e:
        logging.error(f"Erro ao buscar ajustes: {e}")
        return None, None


# --- Funções Auxiliares ---
def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False

def find_existing_drive():
    """Retorna a letra da unidade onde o agente está instalado (ex: 'C:\\') ou None."""
    drives = [f"{d}:\\" for d in "ABCDEFGHIJKLMNOPQRSTUVWXYZ"]
    for drive in drives:
        if os.path.exists(drive):
            candidate = os.path.join(drive, PASTA_AGENTE_BASE_REL, NOME_PROCESSO_AGENTE)
            if os.path.exists(candidate):
                return drive
    return None

def get_resolved_paths():
    """Retorna (base_dir, download_dir, installer_path) resolvidos dinamicamente."""
    drive = find_existing_drive() or "C:\\"
    base_dir = os.path.join(drive, PASTA_AGENTE_BASE_REL)
    download_dir = os.path.join(drive, PASTA_DOWNLOAD_AGENTE_REL)
    installer_path = os.path.join(download_dir, NOME_INSTALADOR_AGENTE)
    return base_dir, download_dir, installer_path

def find_agent_executable():
    """Procura o executável do agente usando a lógica de drives."""
    drive = find_existing_drive()
    if drive:
        full_path = os.path.join(drive, PASTA_AGENTE_BASE_REL, NOME_PROCESSO_AGENTE)
        logging.info(f"Agente encontrado em: {full_path}")
        return full_path
    return None

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
    url = f"{URL_BASE_DOWNLOAD}/{version}/{NOME_INSTALADOR_AGENTE}"
    
    _, _, destination_path = get_resolved_paths()
    logging.info(f"Definindo caminho de download para: {destination_path}")
    
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

def download_dominio_worker(version=None, download_type='install'):
    global app_state
    
    # Definir URLs e nomes de arquivo baseado no tipo de download
    if download_type == 'update':
        url_base = "https://download.dominiosistemas.com.br/atualizacao/contabil/"
        file_name = "Atualiza.exe"
        type_label = "Atualização"
    else:  # install
        url_base = URL_DOMINIO_CONTABIL
        file_name = "Instala.exe"
        type_label = "Instalação"
    
    if version:
        # Se versão for especificada, monta a URL diretamente
        url = f"{url_base}{version}/{file_name}"
        logging.info(f"Usando versão específica do Domínio Sistemas ({type_label}): {version}")
    else:
        # Caso contrário, busca a mais recente
        if download_type == 'update':
            url, _ = get_latest_update_url()
        else:
            url, _ = get_latest_dominio_url()
    
    if not url:
        app_state["status"] = "error"
        app_state["message"] = "Não foi possível encontrar a versão no servidor."
        return

    # Usar caminho específico para Domínio Sistemas
    download_dir = PASTA_DOWNLOAD_DOMINIO
    destination_path = os.path.join(download_dir, file_name)
    
    logging.info(f"Iniciando download Domínio Sistemas ({type_label}) de {url} para {destination_path}")
    
    app_state["status"] = "downloading"
    app_state["progress"] = 0
    app_state["message"] = f"Iniciando download do Domínio Sistemas ({version if version else 'Mais Recente'})..."
    
    # Remover arquivo antigo se existir
    if os.path.exists(destination_path):
        try:
            os.remove(destination_path)
        except PermissionError:
            logging.warning(f"Permissão negada ao remover {file_name}. Tentando finalizar processo...")
            terminate_process(file_name)
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
                    app_state["message"] = f"Baixando Domínio Sistemas... {app_state['progress']}%"
            else:
                app_state["message"] = "Baixando (tamanho desconhecido)..."
                shutil.copyfileobj(response, f)
                
        app_state["status"] = "download_complete"
        app_state["message"] = "Download do Domínio Sistemas concluído!"
        app_state["progress"] = 100
        
        # Atualiza o caminho do instalador para o endpoint de instalação saber qual executar
        # (Isso é um hack rápido, idealmente o estado teria 'installer_type')
        app_state["installer_path"] = destination_path
        
    except Exception as e:
        app_state["status"] = "error"
        app_state["message"] = f"Erro no download: {str(e)}"

def download_buscanfe_worker(version=None):
    global app_state
    
    if version:
        # Se versão for especificada, monta a URL diretamente
        url = f"{URL_BUSCANFE}{version}/{NOME_INSTALADOR_BUSCANFE}"
        logging.info(f"Usando versão específica do Busca NF-e: {version}")
    else:
        # Caso contrário, busca a mais recente
        url, _ = get_latest_buscanfe_url()
    
    if not url:
        app_state["status"] = "error"
        app_state["message"] = "Não foi possível encontrar a versão no servidor."
        return

    # Usar caminho específico para Busca NF-e
    download_dir = PASTA_DOWNLOAD_BUSCANFE
    destination_path = os.path.join(download_dir, NOME_INSTALADOR_BUSCANFE)
    
    logging.info(f"Iniciando download Busca NF-e de {url} para {destination_path}")
    
    app_state["status"] = "downloading"
    app_state["progress"] = 0
    app_state["message"] = f"Iniciando download do Busca NF-e ({version if version else 'Mais Recente'})..."
    
    # Remover arquivo antigo se existir
    if os.path.exists(destination_path):
        try:
            os.remove(destination_path)
        except PermissionError:
            logging.warning(f"Permissão negada ao remover instalador Busca NF-e. Tentando finalizar processo {NOME_INSTALADOR_BUSCANFE}...")
            terminate_process(NOME_INSTALADOR_BUSCANFE)
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
                    app_state["message"] = f"Baixando Busca NF-e... {app_state['progress']}%"
            else:
                app_state["message"] = "Baixando (tamanho desconhecido)..."
                shutil.copyfileobj(response, f)
                
        app_state["status"] = "download_complete"
        app_state["message"] = "Download do Busca NF-e concluído!"
        app_state["progress"] = 100
        
        # Atualiza o caminho do instalador para o endpoint de instalação saber qual executar
        app_state["installer_path"] = destination_path
        
    except Exception as e:
        app_state["status"] = "error"
        app_state["message"] = f"Erro no download: {str(e)}"


# --- Rotas ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(_base_path(), 'static', 'Icone'), 'app_icon.ico', mimetype='image/vnd.microsoft.icon')

@app.route('/api/status')
def get_status():
    return jsonify(app_state)

@app.route('/api/init', methods=['POST'])
def init_process():
    if not is_admin():
        return jsonify({"success": False, "message": "O script precisa ser executado como Administrador."}), 403
    
    terminate_process(NOME_PROCESSO_AGENTE)
    terminate_process(NOME_PROCESSO_SERVICO_DOMINIO)
    
    # Limpar caminho de instalador customizado (ex: Domínio Sistemas)
    app_state.pop("installer_path", None)
    
    return jsonify({"success": True, "message": "Processos finalizados. Pronto para download."})

@app.route('/api/download', methods=['POST'])
def start_download():
    data = request.json
    version = data.get('version')
    if not version:
        return jsonify({"success": False, "message": "Versão não informada."}), 400
    
    # Limpar caminho de instalador customizado
    app_state.pop("installer_path", None)
    
    # Iniciar download em thread separada
    thread = threading.Thread(target=download_worker, args=(version,))
    thread.start()
    
    return jsonify({"success": True, "message": "Download iniciado."})

@app.route('/api/download_dominio', methods=['POST'])
def start_download_dominio():
    data = request.json or {}
    version = data.get('version')
    download_type = data.get('download_type', 'install')  # 'install' ou 'update'
    
    # Iniciar download em thread separada
    thread = threading.Thread(target=download_dominio_worker, args=(version, download_type))
    thread.start()
    
    return jsonify({"success": True, "message": "Download do Domínio iniciado."})

@app.route('/api/dominio_version')
def get_dominio_version():
    _, version = get_latest_dominio_url()
    if version:
        return jsonify({"success": True, "version": version})
    return jsonify({"success": False, "message": "Não foi possível obter a versão."}), 404

@app.route('/api/download_buscanfe', methods=['POST'])
def start_download_buscanfe():
    data = request.json or {}
    version = data.get('version')
    
    # Iniciar download em thread separada
    thread = threading.Thread(target=download_buscanfe_worker, args=(version,))
    thread.start()
    
    return jsonify({"success": True, "message": "Download do Busca NF-e iniciado."})

@app.route('/api/buscanfe_version')
def get_buscanfe_version():
    _, version = get_latest_buscanfe_url()
    if version:
        return jsonify({"success": True, "version": version})
    return jsonify({"success": False, "message": "Não foi possível obter a versão."}), 404

@app.route('/api/dominio_update_info')
def get_dominio_update_info():
    """Retorna informações sobre atualizações e ajustes disponíveis do Domínio Sistemas"""
    try:
        # Buscar versão mais recente de atualização
        update_url, version = get_latest_update_url()
        
        if not version:
            return jsonify({"success": False, "message": "Não foi possível obter informações de atualização."}), 404
        
        # Verificar se existe ajuste para essa versão
        adjustment_url, adjustment = get_latest_adjustment_info(version)
        
        response_data = {
            "success": True,
            "version": version,
            "version_url": update_url,
            "has_adjustment": adjustment is not None,
            "adjustment": adjustment,
            "adjustment_url": adjustment_url
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        logging.error(f"Erro ao obter informações de atualização: {e}")
        return jsonify({"success": False, "message": f"Erro: {str(e)}"}), 500


@app.route('/api/install', methods=['POST'])
def start_install():
    # Verifica se temos um caminho customizado definido pelo download do domínio
    if "installer_path" in app_state and os.path.exists(app_state["installer_path"]):
        installer_path = app_state["installer_path"]
        # Limpa para não interferir em futuras execuções do agente
        # app_state.pop("installer_path", None) # Melhor não limpar agora para permitir retry
    else:
        _, _, installer_path = get_resolved_paths()
    
    if not os.path.exists(installer_path):
        return jsonify({"success": False, "message": "Instalador não encontrado."}), 404
    
    try:
        # Executar instalador e forçar janela
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        startupinfo.wShowWindow = 9 # SW_RESTORE (Tenta restaurar se estiver minimizado)
        
        # Inicia o processo
        subprocess.Popen([installer_path], startupinfo=startupinfo)
        
        return jsonify({"success": True, "message": "Instalador iniciado."})
    except Exception as e:
        return jsonify({"success": False, "message": f"Erro ao iniciar instalador: {e}"}), 500

@app.route('/api/verify', methods=['POST'])
def verify_install():
    agent_path = find_agent_executable()
    
    if agent_path:
        try:
            startupinfo = subprocess.STARTUPINFO()
            startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            startupinfo.wShowWindow = 9 # SW_RESTORE
            
            subprocess.Popen([agent_path], startupinfo=startupinfo)
            return jsonify({"success": True, "message": "Agente encontrado e iniciado."})
        except Exception as e:
             return jsonify({"success": True, "message": f"Agente encontrado em {agent_path}, mas erro ao iniciar: {e}"}) # Consideramos sucesso pois o arquivo existe
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

    # Verificar atualizações em background
    threading.Thread(target=check_for_updates, daemon=True).start()

    # Abrir navegador automaticamente
    import webbrowser
    # Timer para garantir que o servidor iniciou antes de abrir
    threading.Timer(1.5, lambda: webbrowser.open("http://127.0.0.1:5000")).start()
    
    app.run(debug=False, use_reloader=False) # debug=False para evitar duplo reload com elevação
