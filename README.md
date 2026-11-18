# FormLeads — formulários editáveis e captação de leads

Aplicação React + Vite + Supabase. Permite criar vários formulários, editar textos e perguntas, publicar links individuais, salvar respostas e consultar/exportar leads.

## 1. O que está incluído

- Cadastro e login de administrador por e-mail e senha.
- Vários formulários por conta.
- Editor de título, descrição, perguntas, opções, obrigatoriedade e textos finais.
- Tipos de pergunta: texto curto, texto longo, telefone, e-mail e múltipla escolha.
- Link público individual `/f/slug-do-formulario`.
- Salvamento das respostas no Supabase.
- Redirecionamento ao WhatsApp com mensagem preenchida depois do envio.
- Painel de leads e exportação CSV.
- Políticas RLS no SQL para separar os dados por proprietário.

## 2. Criar o banco no Supabase

1. Acesse https://supabase.com e crie um projeto.
2. No projeto, abra **SQL Editor** → **New query**.
3. Abra `supabase/schema.sql` deste projeto, copie tudo e execute no SQL Editor.
4. Vá em **Project Settings → API** (ou **Connect**) e copie:
   - Project URL
   - anon/public key (chave pública)
5. Não use a `service_role` key no site. Ela é secreta e nunca deve ir para o GitHub ou para o navegador.

## 3. Rodar no computador

Instale Node.js LTS: https://nodejs.org

Na pasta do projeto:
```bash
npm install
```

Copie `.env.example` para `.env` e preencha:
```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
VITE_PUBLIC_BASE_URL=http://localhost:5173
```

Depois:
```bash
npm run dev
```
Abra o endereço local que o Vite mostrar.

## 4. Criar o primeiro administrador

1. Abra o site local e escolha **Criar conta**.
2. Cadastre seu e-mail e uma senha.
3. Se a confirmação de e-mail estiver habilitada no Supabase, confirme o e-mail.
4. Entre e crie seu primeiro formulário.

Para um projeto privado de uso próprio, mantenha o cadastro controlado: depois de criar sua conta, você pode desabilitar novos cadastros em **Authentication → Settings → Allow new users to sign up**. Se fizer isso, crie outros usuários pelo painel do Supabase quando necessário.

## 5. Publicar no GitHub e Vercel

1. Crie um repositório no GitHub.
2. Envie os arquivos deste projeto. Não envie `.env`.
3. Entre em https://vercel.com e importe o repositório.
4. Framework: Vite. Build command: `npm run build`. Output directory: `dist`.
5. Em **Environment Variables**, cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
6. Faça Deploy.
7. No Supabase, abra **Authentication → URL Configuration**:
   - Site URL: seu endereço Vercel (ex.: `https://seu-projeto.vercel.app`)
   - Redirect URLs: adicione `https://seu-projeto.vercel.app/**`
   - Para desenvolvimento, adicione também `http://localhost:5173/**`

O `BrowserRouter` precisa de fallback para SPA. A Vercel normalmente detecta Vite; se links internos retornarem 404, adicione `vercel.json` com:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

## 6. Como usar

- `/` — painel administrativo (após login)
- `/editor/ID` — editor de um formulário
- `/leads/ID` — respostas daquele formulário
- `/f/SLUG` — página pública do formulário

No editor:
1. Edite o título e a descrição.
2. Edite, remova ou adicione perguntas.
3. Em Configurações, informe o WhatsApp com DDI + DDD + número, somente dígitos. Exemplo: `5521999999999`.
4. Ajuste a mensagem final.
5. Salve e clique em Publicar.
6. Copie o link público e coloque no anúncio.

## 7. Importante sobre dados e privacidade

- As respostas são armazenadas no Supabase. O visitante só pode inserir respostas em formulários publicados; não pode listar leads.
- O dono só consegue consultar formulários e respostas vinculados à própria conta.
- O formulário inclui um aviso simples de privacidade. Antes de usar comercialmente, ajuste o aviso/consentimento para a finalidade real e publique uma política de privacidade adequada à LGPD.
- Não colete dados pessoais sensíveis ou informações jurídicas confidenciais desnecessárias neste formulário inicial.
- Para advocacia, revise o conteúdo e a publicidade com a profissional responsável e as regras aplicáveis da OAB. O formulário deve ser informativo, sem prometer resultado ou oferecer diagnóstico jurídico conclusivo automático.
- O WhatsApp só abre depois do registro no banco. Se o usuário não clicar no botão do WhatsApp, as respostas continuam salvas.
- O número de WhatsApp é configurado por formulário.

## 8. Limitações do MVP

- Editor simples: não há lógica condicional entre perguntas ainda.
- Um formulário pertence a uma conta administradora.
- Não há cobrança/assinaturas, equipes ou permissões avançadas.
- A aplicação não envia mensagens sozinha; apenas abre o WhatsApp do visitante com uma mensagem pré-preenchida.
- O uso do Supabase/Vercel está sujeito aos limites e às políticas dos planos gratuitos, que podem mudar.

## 9. Segurança antes de escalar

- Nunca publique `service_role`.
- Use senha forte e ative confirmação de e-mail.
- Revise as políticas RLS se alterar tabelas.
- Faça exportações/backup periódicos de leads.
- Considere CAPTCHA/rate limiting se receber spam.
