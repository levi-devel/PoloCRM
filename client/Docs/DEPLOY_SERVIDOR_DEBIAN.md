# Manual de Deploy - Servidor Debian (Produção)

Este manual descreve como configurar o sistema CRM para rodar automaticamente em um servidor Debian na nuvem, mantendo o sistema em execução em segundo plano e reiniciando automaticamente após reinicializações do servidor.

---

## 📋 Requisitos

- Servidor Debian (versão 10, 11 ou 12)
- Acesso SSH ao servidor
- Permissões de sudo
- Domínio apontado para o servidor (opcional, mas recomendado)

---

## 🔧 Etapa 1: Atualização do Sistema

Primeiro, atualize os pacotes do sistema:

```bash
# Atualizar lista de pacotes
sudo apt update

# Atualizar pacotes instalados
sudo apt upgrade -y

# Instalar ferramentas essenciais
sudo apt install -y curl wget git build-essential
```

---

## 📦 Etapa 2: Instalação do Node.js

Vamos instalar o Node.js versão 20 LTS usando o repositório oficial NodeSource:

```bash
# Baixar e executar script de instalação do NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Instalar Node.js
sudo apt install -y nodejs

# Verificar instalação
node --version
npm --version
```

> [!NOTE]
> A instalação do Node.js pelo NodeSource já inclui o npm automaticamente.

---

## 🗄️ Etapa 3: Configuração do MySQL Externo

O sistema utilizará um banco de dados MySQL externo (hospedado na nuvem). Você precisará das credenciais de acesso fornecidas pelo seu provedor de banco de dados.

### 3.1. Informações Necessárias

Antes de continuar, certifique-se de ter em mãos:

- **Host/Endpoint** do banco de dados (ex: `mysql.exemplo.com` ou IP)
- **Porta** (geralmente `3306`)
- **Nome do banco de dados**
- **Usuário** do banco de dados
- **Senha** do usuário
- **Certificado SSL** (se o provedor requer conexão segura)

### 3.2. Instalar Cliente MySQL (Opcional)

Para importar o schema ou fazer testes de conexão, instale apenas o cliente MySQL:

```bash
# Instalar apenas o cliente MySQL
sudo apt install -y mysql-client

# Verificar instalação
mysql --version
```

### 3.3. Testar Conexão com Banco Externo

```bash
# Testar conexão (substitua pelos seus dados)
mysql -h SEU_HOST -P 3306 -u SEU_USUARIO -p

# Exemplos de hosts comuns:
# AWS RDS: seu-banco.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com
# Google Cloud SQL: 34.XXX.XXX.XXX
# DigitalOcean: db-mysql-nyc1-xxxxx-do-user-xxxxxxx-0.xxx.db.ondigitalocean.com
```

Se a conexão for bem-sucedida, você verá o prompt do MySQL.

### 3.4. Importar Schema do Banco de Dados

```bash
# Fazer upload do arquivo SQL para o servidor (do seu computador local)
scp /caminho/local/criacao_banco_completo.sql usuario@servidor:/tmp/

# No servidor, importar o schema para o banco externo
mysql -h SEU_HOST -P 3306 -u SEU_USUARIO -p SEU_BANCO < /tmp/criacao_banco_completo.sql

# Verificar se as tabelas foram criadas
mysql -h SEU_HOST -P 3306 -u SEU_USUARIO -p -e "USE SEU_BANCO; SHOW TABLES;"
```

> [!TIP]
> Se seu provedor de MySQL requer conexão SSL, adicione o parâmetro `--ssl-mode=REQUIRED` aos comandos mysql.

---

## 📂 Etapa 4: Clonar e Configurar o Projeto

### 4.1. Criar Diretório para Aplicações

```bash
# Criar diretório
sudo mkdir -p /var/www
cd /var/www

# Clonar repositório
sudo git clone https://github.com/seu-usuario/seu-repositorio.git crm-polo

# Ajustar permissões
sudo chown -R $USER:$USER /var/www/crm-polo
cd /var/www/crm-polo
```

### 4.2. Configurar Variáveis de Ambiente

Crie o arquivo `.env` na raiz do projeto:

```bash
nano /var/www/crm-polo/.env
```

Adicione as seguintes variáveis (ajuste conforme necessário):

```env
NODE_ENV=production
PORT=3000

# Configurações do Banco de Dados MySQL EXTERNO
DB_HOST=seu-host-mysql-externo.com
DB_PORT=3306
DB_NAME=crm_polo
DB_USER=seu_usuario
DB_PASSWORD=sua_senha_forte

# Exemplos de hosts por provedor:
# AWS RDS: seu-banco.xxxxxxxxxxxx.us-east-1.rds.amazonaws.com
# Google Cloud SQL: 34.XXX.XXX.XXX ou seu-projeto:us-central1:seu-banco
# Azure Database: seu-servidor.mysql.database.azure.com
# DigitalOcean: db-mysql-nyc1-xxxxx-do-user-xxxxxxx-0.xxx.db.ondigitalocean.com

# SSL para conexão MySQL (se necessário)
DB_SSL=true
# DB_SSL_CA=/caminho/para/ca-certificate.crt

# Chave secreta para JWT (gere uma chave aleatória forte)
JWT_SECRET=sua_chave_secreta_muito_forte_e_aleatoria_aqui

# Outras configurações
SESSION_SECRET=outra_chave_secreta_para_sessoes
```

> [!IMPORTANT]
> **Segurança**: Nunca compartilhe o arquivo `.env` ou suas chaves secretas. Gere chaves fortes e aleatórias para produção.

> [!NOTE]
> **Conexão SSL**: Alguns provedores de banco de dados na nuvem requerem conexão SSL. Verifique a documentação do seu provedor e configure o certificado CA se necessário.

### 4.3. Instalar Dependências

```bash
# Instalar dependências do projeto
npm install

# Fazer build do projeto
npm run build
```

> [!WARNING]
> Se houver erros durante `npm install`, certifique-se de que o `build-essential` está instalado (feito na Etapa 1).

---

## 🚀 Etapa 5: Configurar Systemd para Inicialização Automática

### 5.1. Criar Arquivo de Serviço

Crie o arquivo de serviço do systemd:

```bash
sudo nano /etc/systemd/system/crm-polo.service
```

Adicione o seguinte conteúdo:

```ini
[Unit]
Description=CRM Polo Application
Documentation=https://github.com/seu-repositorio
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/crm-polo
Environment="NODE_ENV=production"
Environment="PORT=3000"
EnvironmentFile=/var/www/crm-polo/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=append:/var/log/crm-polo/output.log
StandardError=append:/var/log/crm-polo/error.log

# Limites de segurança
MemoryLimit=1G
CPUQuota=80%

# Segurança adicional
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/www/crm-polo

[Install]
WantedBy=multi-user.target
```

> [!NOTE]
> O serviço está configurado para executar como usuário `www-data` (padrão para serviços web no Linux) e reiniciar automaticamente em caso de falhas.

### 5.2. Criar Diretório de Logs

```bash
# Criar diretório de logs
sudo mkdir -p /var/log/crm-polo

# Ajustar permissões
sudo chown www-data:www-data /var/log/crm-polo
sudo chmod 755 /var/log/crm-polo
```

### 5.3. Ajustar Permissões do Projeto

```bash
# Mudar proprietário para www-data
sudo chown -R www-data:www-data /var/www/crm-polo

# Ajustar permissões
sudo chmod -R 755 /var/www/crm-polo
```

### 5.4. Ativar e Iniciar o Serviço

```bash
# Recarregar configurações do systemd
sudo systemctl daemon-reload

# Habilitar serviço para iniciar no boot
sudo systemctl enable crm-polo.service

# Iniciar o serviço
sudo systemctl start crm-polo.service

# Verificar status
sudo systemctl status crm-polo.service
```

Se tudo estiver correto, você verá status **active (running)** em verde.

### 5.5. Comandos Úteis do Systemd

```bash
# Parar o serviço
sudo systemctl stop crm-polo.service

# Reiniciar o serviço
sudo systemctl restart crm-polo.service

# Recarregar após alterações no arquivo de serviço
sudo systemctl daemon-reload
sudo systemctl restart crm-polo.service

# Ver logs em tempo real
sudo journalctl -u crm-polo.service -f

# Ver últimas 100 linhas dos logs
sudo journalctl -u crm-polo.service -n 100

# Ver logs com data/hora completa
sudo journalctl -u crm-polo.service -o cat

# Desabilitar inicialização automática
sudo systemctl disable crm-polo.service

# Ver logs de erro
sudo tail -f /var/log/crm-polo/error.log

# Ver logs de saída
sudo tail -f /var/log/crm-polo/output.log
```

---

## 🔐 Etapa 6: Configurar Firewall

Configure o firewall UFW para permitir apenas o tráfego necessário:

```bash
# Instalar UFW (se não estiver instalado)
sudo apt install -y ufw

# Permitir SSH (IMPORTANTE: faça isso primeiro!)
sudo ufw allow 22/tcp

# Permitir HTTP
sudo ufw allow 80/tcp

# Permitir HTTPS
sudo ufw allow 443/tcp

# Habilitar firewall
sudo ufw enable

# Verificar status
sudo ufw status verbose
```

> [!CAUTION]
> **Atenção**: Sempre permita a porta SSH (22) ANTES de habilitar o firewall, caso contrário você pode perder o acesso ao servidor!

---

## 🌐 Etapa 7: Configurar Nginx como Reverse Proxy

### 7.1. Instalar Nginx

```bash
# Instalar Nginx
sudo apt install -y nginx

# Iniciar e habilitar Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verificar status
sudo systemctl status nginx
```

### 7.2. Criar Configuração do Site

```bash
# Criar arquivo de configuração
sudo nano /etc/nginx/sites-available/crm-polo
```

Adicione o seguinte conteúdo:

```nginx
server {
    listen 80;
    server_name seu_dominio.com www.seu_dominio.com;

    # Logs
    access_log /var/log/nginx/crm-polo-access.log;
    error_log /var/log/nginx/crm-polo-error.log;

    # Proxy para aplicação Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        
        # Headers para WebSocket (se necessário)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Headers de proxy
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Segurança adicional
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

### 7.3. Ativar Site

```bash
# Criar link simbólico para habilitar o site
sudo ln -s /etc/nginx/sites-available/crm-polo /etc/nginx/sites-enabled/

# Remover site padrão (opcional)
sudo rm /etc/nginx/sites-enabled/default

# Testar configuração do Nginx
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

---

## 🔒 Etapa 8: Configurar HTTPS com Let's Encrypt

### 8.1. Instalar Certbot

```bash
# Instalar Certbot e plugin do Nginx
sudo apt install -y certbot python3-certbot-nginx
```

### 8.2. Obter Certificado SSL

```bash
# Obter certificado SSL gratuito
sudo certbot --nginx -d seu_dominio.com -d www.seu_dominio.com

# Durante o processo, forneça:
# - Email para notificações importantes
# - Aceite os termos de serviço
# - Escolha redirecionar HTTP para HTTPS (opção 2)
```

### 8.3. Renovação Automática

```bash
# Testar renovação automática
sudo certbot renew --dry-run

# Verificar timer de renovação
sudo systemctl status certbot.timer
```

> [!TIP]
> O Certbot configura automaticamente a renovação dos certificados. Eles são renovados automaticamente 30 dias antes do vencimento.

---

## 📊 Etapa 9: Configurar Rotação de Logs

### 9.1. Configurar Logrotate para Logs da Aplicação

```bash
sudo nano /etc/logrotate.d/crm-polo
```

Adicione:

```
/var/log/crm-polo/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload crm-polo.service > /dev/null 2>&1 || true
    endscript
}
```

### 9.2. Testar Rotação

```bash
# Forçar rotação de logs (teste)
sudo logrotate -f /etc/logrotate.d/crm-polo

# Verificar se funcionou
ls -lh /var/log/crm-polo/
```

---

## 🔄 Etapa 10: Processo de Atualização

### 10.1. Script de Atualização

Crie um script para facilitar atualizações futuras:

```bash
nano ~/atualizar-crm.sh
```

Adicione:

```bash
#!/bin/bash

echo "=== Iniciando atualização do CRM Polo ==="

# Navegar para diretório do projeto
cd /var/www/crm-polo

# Fazer backup antes de atualizar
echo "Criando backup..."
sudo tar -czf ~/backups/crm-polo-$(date +%Y%m%d-%H%M%S).tar.gz /var/www/crm-polo

# Parar serviço
echo "Parando serviço..."
sudo systemctl stop crm-polo.service

# Fazer pull das atualizações
echo "Baixando atualizações..."
sudo -u www-data git pull origin main

# Instalar/atualizar dependências
echo "Instalando dependências..."
sudo -u www-data npm install

# Fazer build
echo "Compilando projeto..."
sudo -u www-data npm run build

# Reiniciar serviço
echo "Reiniciando serviço..."
sudo systemctl start crm-polo.service

# Verificar status
echo "Verificando status..."
sudo systemctl status crm-polo.service

echo "=== Atualização concluída ==="
```

Tornar executável:

```bash
chmod +x ~/atualizar-crm.sh
```

### 10.2. Criar Diretório de Backups

```bash
mkdir -p ~/backups
```

### 10.3. Executar Atualização

```bash
# Executar script de atualização
~/atualizar-crm.sh
```

---

## � Etapa 11: Monitoramento

### 11.1. Verificar Status do Sistema

```bash
# Status do serviço
sudo systemctl status crm-polo.service

# Ver logs em tempo real
sudo journalctl -u crm-polo.service -f

# Uso de recursos
htop

# Uso de memória
free -h

# Uso de disco
df -h

# Processos Node.js
ps aux | grep node
```

### 11.2. Testar Aplicação

```bash
# Testar se a aplicação está respondendo
curl http://localhost:3000

# Testar através do Nginx
curl http://seu_dominio.com

# Verificar certificado SSL
curl https://seu_dominio.com -I

# Testar conexão com MySQL externo
mysql -h SEU_HOST -P 3306 -u SEU_USUARIO -p -e "SELECT 1;"
```

---

## ⚠️ Troubleshooting

### Problema: Serviço não inicia

```bash
# Ver logs detalhados
sudo journalctl -u crm-polo.service -n 100 --no-pager

# Verificar arquivo de erro
sudo tail -50 /var/log/crm-polo/error.log

# Testar manualmente
cd /var/www/crm-polo
npm start
```

### Problema: Porta 3000 já em uso

```bash
# Verificar qual processo está usando a porta
sudo lsof -i :3000
sudo netstat -tlnp | grep 3000

# Matar processo se necessário
sudo kill -9 PID_DO_PROCESSO
```

### Problema: Permissões negadas

```bash
# Corrigir permissões do projeto
sudo chown -R www-data:www-data /var/www/crm-polo
sudo chmod -R 755 /var/www/crm-polo

# Corrigir permissões dos logs
sudo chown -R www-data:www-data /var/log/crm-polo
sudo chmod -R 755 /var/log/crm-polo
```

### Problema: MySQL externo não conecta

```bash
# Testar conexão com o MySQL externo
mysql -h SEU_HOST -P 3306 -u SEU_USUARIO -p

# Verificar se o firewall do provedor permite sua conexão
# Verifique as regras de segurança/whitelist do seu provedor de banco de dados

# Testar conexão com SSL (se necessário)
mysql -h SEU_HOST -P 3306 -u SEU_USUARIO -p --ssl-mode=REQUIRED

# Verificar variáveis de ambiente
cat /var/www/crm-polo/.env | grep DB_

# Ver logs da aplicação para erros de conexão
sudo tail -50 /var/log/crm-polo/error.log
```

> [!IMPORTANT]
> **Whitelist de IP**: Certifique-se de que o IP do seu servidor está na lista de IPs permitidos (whitelist) do seu provedor de banco de dados na nuvem.

### Problema: Nginx não carrega

```bash
# Verificar configuração
sudo nginx -t

# Ver logs de erro
sudo tail -50 /var/log/nginx/error.log

# Reiniciar Nginx
sudo systemctl restart nginx
```

### Problema: Aplicação consumindo muita memória

```bash
# Ver uso de recursos
htop

# Reiniciar serviço
sudo systemctl restart crm-polo.service

# Aumentar limite de memória no arquivo de serviço
sudo nano /etc/systemd/system/crm-polo.service
# Altere: MemoryLimit=2G
sudo systemctl daemon-reload
sudo systemctl restart crm-polo.service
```

---

## ✅ Checklist de Deploy Completo

- [ ] Servidor Debian atualizado
- [ ] Node.js instalado e verificado
- [ ] MySQL externo configurado e acessível
- [ ] Credenciais do MySQL externo em mãos
- [ ] Cliente MySQL instalado no servidor (opcional)
- [ ] Conexão com MySQL externo testada com sucesso
- [ ] Schema importado no banco de dados externo
- [ ] Projeto clonado em `/var/www/crm-polo`
- [ ] Arquivo `.env` configurado com credenciais do MySQL externo
- [ ] Dependências instaladas (`npm install`)
- [ ] Build realizado (`npm run build`)
- [ ] Arquivo de serviço systemd criado
- [ ] Diretório de logs criado com permissões corretas
- [ ] Permissões do projeto ajustadas para `www-data`
- [ ] Serviço iniciado e habilitado para boot
- [ ] Serviço testado e funcionando
- [ ] Firewall UFW configurado
- [ ] Nginx instalado e configurado
- [ ] Site habilitado no Nginx
- [ ] Nginx recarregado sem erros
- [ ] Certbot instalado
- [ ] Certificado SSL configurado (HTTPS)
- [ ] Renovação automática de SSL testada
- [ ] Logrotate configurado
- [ ] Script de atualização criado
- [ ] Aplicação acessível via domínio
- [ ] HTTPS funcionando corretamente

---

## 🎯 Verificação Final

Execute estes comandos para verificar se tudo está funcionando:

```bash
# 1. Verificar serviço
sudo systemctl status crm-polo.service

# 2. Verificar logs (não deve ter erros)
sudo tail -20 /var/log/crm-polo/error.log

# 3. Verificar Nginx
sudo systemctl status nginx
sudo nginx -t

# 4. Testar conexão MySQL externo
mysql -h SEU_HOST -P 3306 -u SEU_USUARIO -p -e "SELECT 1;"

# 5. Testar aplicação
curl -I http://localhost:3000
curl -I https://seu_dominio.com

# 6. Verificar se inicia no boot
sudo systemctl is-enabled crm-polo.service
# Deve retornar: enabled
```

---

## 📞 Comandos Rápidos de Referência

```bash
# Reiniciar aplicação
sudo systemctl restart crm-polo.service

# Ver logs em tempo real
sudo journalctl -u crm-polo.service -f

# Atualizar aplicação
~/atualizar-crm.sh

# Verificar status geral
sudo systemctl status crm-polo nginx

# Reiniciar tudo
sudo systemctl restart crm-polo nginx
```

---

> [!IMPORTANT]
> **Lembre-se**: Após qualquer reinicialização do servidor, o serviço `crm-polo` será iniciado automaticamente graças à configuração do systemd. Você não precisa executar nenhum comando manualmente!

> [!TIP]
> **Dica de Segurança**: Sempre mantenha backups regulares do banco de dados e do código. Configure alertas de monitoramento para ser notificado em caso de problemas.

---

## 📚 Recursos Adicionais

- [Documentação do Systemd](https://systemd.io/)
- [Documentação do Nginx](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/)
- [MySQL Debian Guide](https://dev.mysql.com/doc/mysql-apt-repo-quick-guide/en/)
