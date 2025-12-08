# Assistente Técnico - Gerenciador de Instalações Domínio Sistemas

Aplicação web local desenvolvida em Flask para facilitar a instalação e atualização de aplicações da **Domínio Sistemas**: **Agente de Comunicação**, **Domínio Sistemas** e **Busca NF-e**.

## 🚀 Funcionalidades

- ✅ **Interface Web Moderna**: Interface intuitiva e responsiva para gerenciar instalações
- ✅ **Múltiplas Aplicações**: Suporte para Agente de Comunicação, Domínio Sistemas e Busca NF-e
- ✅ **Auto-elevação de Privilégios**: Solicita automaticamente permissões de administrador
- ✅ **Download Automático**: Baixa versões diretamente dos servidores oficiais
- ✅ **Versões Personalizadas**: Opção de informar versão específica para download
- ✅ **Detecção Automática**: Identifica a versão mais recente disponível
- ✅ **Gerenciamento de Processos**: Finaliza processos necessários automaticamente
- ✅ **Instalação Assistida**: Executa o instalador e verifica a instalação
- ✅ **Barra de Progresso**: Acompanhamento visual do download em tempo real
- ✅ **Auto-atualização**: Verifica e notifica sobre novas versões do assistente

## � Aplicações Suportadas

### 1. Agente de Comunicação
- **Tipo**: Atualização/Download manual
- **Formato de versão**: `XX.XX` (ex: 15.71)
- **Pasta de download**: `C:\Contabil\Agente de Comunicação\DownloadAgente`
- **Servidor**: `http://download.dominiosistemas.com.br/hide/agente/Agente-Comunicacao`

### 2. Domínio Sistemas
- **Tipo**: Atualização ou Instalação
- **Formato de versão**: `XXXaXX` (ex: 105a10)
- **Pasta de download**: `C:\Contabil\Atualiza`
- **Nome do instalador**: `instala.exe`
- **Servidor**: `https://download.dominiosistemas.com.br/instalacao/contabil/`

### 3. Busca NF-e
- **Tipo**: Instalação direta
- **Formato de versão**: `X.XX` (ex: 6.10)
- **Pasta de download**: `C:\Contabil\Atualiza\BuscaNFe`
- **Nome do instalador**: `Instala_Cliente.exe`
- **Servidor**: `https://download.dominiosistemas.com.br/instalacao/BuscaNF-eCliente/`

## 📋 Pré-requisitos

- Windows 7 ou superior (testado em Windows 10/11)
- Permissões de administrador
- Conexão com a Internet

## 🔧 Instalação

### Opção 1: Executável (.exe) - Recomendado

1. Baixe o arquivo `Assistente_Atualizador.exe` da [última release](https://github.com/PatrickSud/assistente-tecnico/releases/latest)
2. Execute o arquivo (será solicitada elevação de privilégios)
3. O navegador abrirá automaticamente com a interface

### Opção 2: Executar via Python (Desenvolvimento)

1. Clone o repositório:
```bash
git clone https://github.com/PatrickSud/assistente-tecnico.git
cd assistente-tecnico
```

2. Instale as dependências:
```bash
pip install flask
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
pyinstaller --clean Assistente_Atualizador.spec
```

## 🛠️ Estrutura do Projeto

```
.
├── app.py                          # Aplicação Flask principal
├── Assistente_Atualizador.spec     # Configuração do PyInstaller
├── recompilar.bat                  # Script de recompilação
├── version.json                    # Informações de versão
├── templates/
│   └── index.html                  # Interface web
├── static/
│   ├── style.css                   # Estilos
│   ├── script.js                   # Lógica do frontend
│   └── Icone/
│       └── app_icon.ico            # Ícone da aplicação
└── dist/
    └── Assistente_Atualizador.exe  # Executável compilado
```

## 💻 Uso

### Agente de Comunicação (Modo Atualização)

1. **Selecionar**: Escolha "Agente de Comunicação"
2. **Preparação**: Clique em "Iniciar Processo" (finaliza processos automaticamente)
3. **Informar Versão**: Digite a versão desejada (ex: 15.71)
4. **Download**: Clique em "Baixar" para iniciar o download
5. **Instalação**: Execute o instalador quando o download concluir
6. **Verificação**: Clique em "Sim, iniciar Agente de Comunicação" para verificar

### Domínio Sistemas (Modo Instalação/Atualização)

1. **Selecionar**: Escolha "Domínio Sistemas"
2. **Escolher Modo**: Selecione "Atualização" ou "Instalação"
3. **Download**:
   - **Automático**: Clique em "Baixar mais recente" (detecta última versão)
   - **Manual**: Informe a versão específica (ex: 105a10) e clique em "Baixar essa versão"
4. **Instalação**: O instalador será executado automaticamente
5. **Finalizar**: Clique em "Finalizar" após concluir a instalação

### Busca NF-e (Modo Instalação)

1. **Selecionar**: Escolha "Busca NF-e"
2. **Download**:
   - **Automático**: Clique em "Baixar mais recente" (detecta última versão)
   - **Manual**: Informe a versão específica (ex: 6.10) e clique em "Baixar essa versão"
3. **Instalação**: O instalador será executado automaticamente
4. **Finalizar**: Clique em "Finalizar" após concluir a instalação

## 🔒 Segurança

A aplicação requer privilégios de administrador para:
- Finalizar processos do sistema
- Criar diretórios de instalação
- Instalar/atualizar aplicações em pastas do sistema
- Gerenciar serviços do Windows (Agente de Comunicação)

## 📝 Processos Gerenciados

Os seguintes processos são finalizados automaticamente quando necessário:
- `Agente_comunicacao.exe` (Agente de Comunicação)
- `ServicoDominioAtendimento.exe` (Domínio Sistemas)

## 🔄 Auto-atualização

O assistente verifica automaticamente se há uma nova versão disponível no GitHub:
- **Notificação Visual**: Banner na interface quando há atualização
- **Link Direto**: Botão para baixar a nova versão
- **Repositório**: [PatrickSud/assistente-tecnico](https://github.com/PatrickSud/assistente-tecnico)

## 🐛 Solução de Problemas

### Erro: "Icon input file not found"
O ícone deve estar em `static/Icone/app_icon.ico`. Verifique se o arquivo existe.

### Erro: "Permission denied" ao recompilar
1. Feche todas as instâncias do executável
2. Execute: `taskkill /F /IM Assistente_Atualizador.exe /T`
3. Limpe as pastas: `rmdir /s /q build dist`
4. Tente recompilar novamente

### Aplicação não abre o navegador
1. Abra manualmente: `http://127.0.0.1:5000`
2. Verifique se a porta 5000 não está em uso

### Download não inicia
1. Verifique sua conexão com a Internet
2. Confirme se os servidores de download estão acessíveis
3. Tente com privilé

gios de administrador

## 📊 Histórico de Versões

### v1.4.0 (08/12/2025)
- ✨ Adicionado suporte completo ao Busca NF-e
- ✨ Renomeado "Domínio Contábil" para "Domínio Sistemas"
- ✨ Botão "Finalizar" para Domínio Sistemas e Busca NF-e
- 🔄 Novo caminho de instalação do Domínio Sistemas
- 🔄 Fluxo simplificado do Busca NF-e

### v1.3.5 (28/11/2025)
- � Melhorias na interface do Domínio Contábil
- 🐛 Correções gerais

## �📄 Licença

Este projeto é de uso interno da Domínio Sistemas.

## 👤 Autor

**Patrick Godoy**  
Desenvolvedor - Domínio Sistemas

---

**Versão Atual**: 1.4.0  
**Última Atualização**: 08 de Dezembro de 2025  
**Repositório**: [github.com/PatrickSud/assistente-tecnico](https://github.com/PatrickSud/assistente-tecnico)
