# 🔐 Configuração de Variáveis de Ambiente

## 📝 Como configurar:

### 1. **Desenvolvimento Local**

1. Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edite o arquivo `.env` e preencha com suas credenciais do Firebase:
   ```env
   REACT_APP_FIREBASE_API_KEY=sua-api-key-aqui
   REACT_APP_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=seu-projeto-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
   REACT_APP_FIREBASE_APP_ID=1:123456789:web:abcdef123456
   ```

### 2. **Produção (Vercel)**

Na Vercel, adicione as variáveis de ambiente:

1. Acesse o dashboard do seu projeto na Vercel
2. Vá em **Settings** → **Environment Variables**
3. Adicione cada variável:
   - `REACT_APP_FIREBASE_API_KEY`
   - `REACT_APP_FIREBASE_AUTH_DOMAIN`
   - `REACT_APP_FIREBASE_PROJECT_ID`
   - `REACT_APP_FIREBASE_STORAGE_BUCKET`
   - `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
   - `REACT_APP_FIREBASE_APP_ID`

### 3. **Como obter as credenciais do Firebase**

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Selecione seu projeto
3. Vá em **Configurações do projeto** (ícone de engrenagem)
4. Role até **Seus apps** e clique no app web
5. Copie os valores da configuração

## ⚠️ **Importante**

- **NUNCA** faça commit do arquivo `.env` 
- Use sempre o prefixo `REACT_APP_` para variáveis do React
- O arquivo `.env` já está no `.gitignore`
- Use `.env.example` como template para outros desenvolvedores

## 🚀 **Deploy**

Antes do deploy, certifique-se de que:
- ✅ Todas as variáveis estão configuradas na Vercel
- ✅ O arquivo `.env` não está sendo enviado para o repositório
- ✅ O projeto funciona localmente com as variáveis de ambiente

## 🧪 **Testando**

Para verificar se as variáveis estão carregadas corretamente:
```javascript
console.log('Environment:', process.env.REACT_APP_ENVIRONMENT);
console.log('Firebase Project:', process.env.REACT_APP_FIREBASE_PROJECT_ID);
```
