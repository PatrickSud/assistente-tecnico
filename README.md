# Assistente Técnico - Atualizador do Agente de Comunicação

Aplicação web local desenvolvida em Flask para facilitar a atualização do **Agente de Comunicação com o Domínio Atendimento**.

## 🚀 Funcionalidades

- ✅ **Interface Web Moderna**: Interface intuitiva e responsiva para gerenciar atualizações
- ✅ **Auto-elevação de Privilégios**: Solicita automaticamente permissões de administrador
- ✅ **Download Automático**: Baixa a versão especificada do agente diretamente do servidor
- ✅ **Gerenciamento de Processos**: Finaliza processos necessários automaticamente
- ✅ **Instalação Assistida**: Executa o instalador e verifica a instalação
- ✅ **Barra de Progresso**: Acompanhamento visual do download em tempo real

## 📋 Pré-requisitos

- Windows (testado em Windows 10/11)
- Python 3.8 ou superior
- Permissões de administrador

## 🔧 Instalação

### Opção 1: Executável (.exe)

1. Baixe o arquivo `Assistente_Tecnico.exe` da pasta `dist/`
2. Execute o arquivo (será solicitada elevação de privilégios)
3. O navegador abrirá automaticamente com a interface

### Opção 2: Executar via Python

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/assistente-tecnico.git
cd assistente-tecnico
```

2. Instale as dependências:
```bash
pip install -r requirements.txt
```

3. Execute a aplicação:
```bash
python app.py
```

## 📦 Compilação do Executável

Para gerar o executável `.exe`:

1. Certifique-se de que o PyInstaller está instalado:
```bash
pip install pyinstaller
```

2. Execute o script de recompilação:
```bash
recompilar.bat
```

Ou manualmente:
```bash
pyinstaller --clean Assistente_Tecnico.spec
```

## 🛠️ Estrutura do Projeto

```
.
├── app.py                      # Aplicação Flask principal
├── Assistente_Tecnico.spec     # Configuração do PyInstaller
├── recompilar.bat             # Script de recompilação
├── cleanup_dist.py            # Script auxiliar de limpeza
├── GUIA_RECOMPILACAO.md       # Guia detalhado de recompilação
├── templates/
│   └── index.html             # Interface web
├── static/
│   ├── style.css              # Estilos
│   ├── script.js              # Lógica do frontend
│   ├── app_icon.ico           # Ícone da aplicação
│   └── favicon.svg            # Favicon
└── dist/
    └── Assistente_Tecnico.exe # Executável compilado
```

## 💻 Uso

1. **Iniciar**: Execute o aplicativo (será solicitada elevação de privilégios)
2. **Informar Versão**: Digite a versão desejada (ex: 14.80)
3. **Download**: Clique em "Iniciar Processo" para baixar
4. **Instalação**: Após o download, execute o instalador
5. **Verificação**: Verifique se a instalação foi bem-sucedida

## 🔒 Segurança

- A aplicação requer privilégios de administrador para:
  - Finalizar processos do sistema
  - Instalar atualizações na pasta do sistema
  - Gerenciar serviços do Windows

## 📝 Notas Importantes

- O agente será baixado de: `http://download.dominiosistemas.com.br/hide/agente/Agente-Comunicacao`
- Pasta de instalação padrão: `C:\Contabil\Agente de Comunicação com o Domínio Atendimento`
- Processos finalizados automaticamente:
  - `Agente_comunicacao.exe`
  - `ServicoDominioAtendimento.exe`

## 🐛 Solução de Problemas

### Erro: "Icon input file not found"
Execute o seguinte comando para gerar o ícone:
```bash
python -c "from PIL import Image; img = Image.open('static/app_icon.png'); img.save('static/app_icon.ico')"
```

### Erro: "Permission denied" ao recompilar
1. Feche todas as instâncias do executável
2. Execute: `taskkill /F /IM Assistente_Tecnico.exe`
3. Tente recompilar novamente

## 📄 Licença

Este projeto é de uso interno.

## 👤 Autor

Patrick Godoy

---

**Versão**: 1.0  
**Última atualização**: Novembro 2025
