# Deploy do FinanceApp

## 1) Criar o projeto no Firebase

1. Abra o console do Firebase e crie um projeto novo.
2. Ative `Authentication` e habilite `Email/Password`.
3. Ative `Firestore Database` e crie o banco em modo de produção.
4. Ative `Storage`.
5. Em `Project settings > Your apps`, crie um app Web e copie os valores de configuração.

## 2) Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com os valores do Firebase e, se usar clima, a chave da OpenWeather.

Exemplo:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_WEATHER_API_KEY=...
```

## 3) Criar usuários e perfis

1. Em `Authentication`, crie os usuários que vão entrar no app.
2. Para cada usuário, crie o documento `users/{uid}` no Firestore com:
   - `id`
   - `email`
   - `name`
   - `role` (`admin` ou `user`)

O usuário `admin@demo.com` é tratado como administrador por padrão no app.

## 4) Publicar no Vercel

1. Suba o repositório para GitHub/GitLab.
2. Importe o projeto no Vercel.
3. Em `Build Command`, use `npm run build:web`.
4. Em `Output Directory`, use `dist`.
5. Adicione as mesmas variáveis de ambiente do `.env` no painel do Vercel.

## 5) Regras do Firebase

Use os arquivos `firestore.rules` e `storage.rules` deste projeto para proteger os dados por usuário.

Se quiser publicar as regras pela CLI:

```bash
firebase login
firebase init firestore storage
firebase deploy --only firestore:rules,storage
```

## 6) Teste local

```bash
npm install
npm run web
```

Se o `.env` estiver preenchido, o app usa Firebase. Se não estiver, ele continua funcionando em modo local com os dados mockados.