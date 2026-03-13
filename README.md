# Body Balance Web

Este repositorio queda como el proyecto web que despliega en Vercel.

## Estructura

- `/Users/jreynoso/I Got You`: web
- `/Users/jreynoso/I Got You Android`: app Android
- `/Users/jreynoso/I Got You iOS`: app iOS

## Desarrollo web

```bash
npm install
npm run web
```

Variables locales mínimas:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAACp99RfEGJMIh-X3
```

## Build para Vercel

```bash
npm run build:web
```

## API interna

La web ahora consulta datos autenticados de la app mediante endpoints en `api/`, en lugar de depender del código compartido con los proyectos móviles.

## Contacto público y Turnstile

Los flujos públicos del sitio usan Supabase Edge Functions:

- `public-contact`
- `public-auth`

Secrets requeridos para la función:

```bash
TURNSTILE_SECRET_KEY=...
PUBLIC_CONTACT_ALLOWED_ORIGINS=https://buddybalance.net,https://www.buddybalance.net
PUBLIC_AUTH_ALLOWED_ORIGINS=https://buddybalance.net,https://www.buddybalance.net
PUBLIC_AUTH_ALLOWED_RESET_REDIRECTS=https://buddybalance.net/reset-password,https://www.buddybalance.net/reset-password
TURNSTILE_ALLOWED_HOSTNAMES=buddybalance.net,www.buddybalance.net
RESEND_API_KEY=...
SUPPORT_TO_EMAIL=...
SUPPORT_FROM_EMAIL=no-reply@buddybalance.net
SUPPORT_FROM_NAME=Buddy Balance
```

Ejemplo de configuración y despliegue:

```bash
npx supabase secrets set --project-ref skxasszsdwtlsqlkukri \
  TURNSTILE_SECRET_KEY=your_secret \
  PUBLIC_CONTACT_ALLOWED_ORIGINS=https://buddybalance.net,https://www.buddybalance.net \
  PUBLIC_AUTH_ALLOWED_ORIGINS=https://buddybalance.net,https://www.buddybalance.net \
  PUBLIC_AUTH_ALLOWED_RESET_REDIRECTS=https://buddybalance.net/reset-password,https://www.buddybalance.net/reset-password \
  TURNSTILE_ALLOWED_HOSTNAMES=buddybalance.net,www.buddybalance.net

npx supabase functions deploy public-contact --project-ref skxasszsdwtlsqlkukri
npx supabase functions deploy public-auth --project-ref skxasszsdwtlsqlkukri --no-verify-jwt
```
