# 📖 Guia de Recompilação - Assistente_Tecnico

## 🎯 Objetivo
Este guia explica como recompilar manualmente o executável `Assistente_Tecnico.exe` usando PyInstaller.

---

## 🚀 Método Rápido (Recomendado)

### Usando o Script Automático

1. Navegue até a pasta do projeto
2. Execute o arquivo `recompilar.bat` (duplo clique ou via terminal)
3. Aguarde a conclusão
4. O executável estará em `dist\Assistente_Tecnico.exe`

---

## 🔧 Método Manual (Passo a Passo)

### Pré-requisitos

- **Python** instalado (versão 3.7 ou superior)
- **PyInstaller** instalado:
  ```powershell
  pip install pyinstaller
  ```

### Passos Detalhados

#### 1️⃣ Fechar Processos Ativos

Abra o PowerShell ou Prompt de Comando e execute:

```powershell
taskkill /F /IM Assistente_Tecnico.exe /T
taskkill /F /IM python.exe /T
```

> **Nota:** Mensagens de erro como "processo não encontrado" são normais se nada estiver rodando.

#### 2️⃣ Navegar até o Diretório

```powershell
cd "c:\DEV\Assitente de Atualização\Desenvolvimento"
```

#### 3️⃣ (Opcional) Limpar Arquivos Antigos

Para uma compilação mais limpa:

```powershell
rmdir /S /Q build
rmdir /S /Q dist
```

#### 4️⃣ Executar o PyInstaller

```powershell
pyinstaller --clean Assistente_Tecnico.spec
```

**Parâmetros explicados:**
- `--clean`: Remove cache e arquivos temporários antes de compilar
- `Assistente_Tecnico.spec`: Arquivo de configuração com todas as especificações

#### 5️⃣ Aguardar a Compilação

O processo levará alguns minutos. Você verá mensagens como:
- `INFO: PyInstaller: ...`
- `INFO: Building ...`
- `INFO: Building EXE from ...`

#### 6️⃣ Verificar o Resultado

Após a conclusão bem-sucedida:
- O executável estará em: `dist\Assistente_Tecnico.exe`
- Teste executando o arquivo

---

## 📁 Estrutura de Arquivos

```
Desenvolvimento/
├── app.py                      # Aplicação Flask principal
├── Assistente_Tecnico.spec      # Configuração do PyInstaller
├── recompilar.bat              # Script de compilação automática
├── templates/
│   └── index.html              # Interface web
├── static/
│   ├── style.css               # Estilos
│   ├── script.js               # Lógica frontend
│   └── ...                     # Outros recursos
├── build/                      # Arquivos temporários (gerado)
└── dist/                       # Executável final (gerado)
    └── Assistente_Tecnico.exe   
```

---

## ⚙️ Entendendo o Arquivo .spec

O arquivo `Assistente_Tecnico.spec` contém configurações como:
- Arquivos a incluir
- Dependências
- Ícone do executável
- Modo de compilação (arquivo único ou pasta)
- Configurações de console/janela

Para editar as configurações, modifique este arquivo antes de compilar.

---

## 🐛 Solução de Problemas

### Erro: "Permission denied" ou "Access denied"

**Causa:** Arquivos em uso  
**Solução:** 
1. Feche todas as instâncias do executável
2. Use o Task Manager (Ctrl+Shift+Esc) para finalizar processos Python
3. Tente novamente

### Erro: "PyInstaller not found"

**Causa:** PyInstaller não instalado  
**Solução:**
```powershell
pip install pyinstaller
```

### Erro: "Module not found" durante execução

**Causa:** Dependência não incluída no .spec  
**Solução:**
1. Identifique o módulo faltante
2. Adicione ao arquivo .spec na seção `hiddenimports`
3. Recompile

### Executável não abre ou fecha imediatamente

**Causa:** Erro na aplicação  
**Solução:**
1. Execute via terminal para ver erros:
   ```powershell
   .\dist\Assistente_Tecnico.exe
   ```
2. Verifique logs de erro
3. Teste a aplicação Python diretamente:
   ```powershell
   python app.py
   ```

---

## 📊 Checklist de Compilação

- [ ] Fechar processos antigos
- [ ] Navegar até o diretório correto
- [ ] Executar PyInstaller com --clean
- [ ] Aguardar conclusão sem erros
- [ ] Verificar que o .exe foi criado em dist/
- [ ] Testar o executável
- [ ] Verificar se todas as funcionalidades funcionam

---

## 💡 Dicas Adicionais

1. **Sempre use `--clean`** para evitar problemas com cache
2. **Teste o executável** em um ambiente limpo antes de distribuir
3. **Mantenha backups** do executável funcional anterior
4. **Documente mudanças** quando modificar o código antes de recompilar
5. **Verifique dependências** se adicionar novos módulos Python

---

## 📞 Quando Recompilar?

Você precisa recompilar quando:
- ✅ Modificar arquivos Python (app.py, etc.)
- ✅ Adicionar/remover dependências
- ✅ Atualizar templates HTML
- ✅ Modificar arquivos CSS/JS
- ✅ Adicionar novos recursos estáticos
- ✅ Alterar configurações do .spec

---

## 🔄 Workflow Recomendado

1. **Desenvolver** → Modificar código
2. **Testar** → Executar `python app.py` para testar
3. **Validar** → Garantir que tudo funciona
4. **Recompilar** → Usar `recompilar.bat` ou comando manual
5. **Testar Executável** → Verificar o .exe gerado
6. **Distribuir** → Copiar para destino final

---

**Última atualização:** 27/11/2025  
**Versão do Guia:** 1.0
