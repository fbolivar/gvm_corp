# Guía: Configurar dominio personalizado por cliente

## Opción 1 — Subdominio bajo bc-security.com (RÁPIDO, sin acción del cliente)

Para darle al cliente una URL tipo `gvm.bc-security.com`:

### Pasos (sólo BC Fabric)

1. Ve a **admin.bc-security.com** → click en el tenant
2. Tab **Marca & Dominio**
3. Campo **"Subdominio en bc-security.com"** → escribe `gvm` (o el slug deseado)
4. **Guardar cambios**

### Configuración DNS única (hacer una sola vez)

Si quieres habilitar subdominios dinámicos (`*.bc-security.com`), agrega un registro wildcard en Hostinger:

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| A | `*` | `76.76.21.21` | Auto |

Esto permite que cualquier subdominio apunte a Vercel. El middleware detecta el subdominio y carga el tenant correspondiente.

## Opción 2 — Dominio propio del cliente (PROFESIONAL)

Para que el cliente acceda desde un dominio que ellos controlan, ej: `erp.gvmcorp.com` o `gvmcorp.gvm.com.co`.

### Paso 1: Cliente crea registro DNS en su proveedor

El cliente (o su IT) agrega en su registrador de dominio (Hostinger, Namecheap, GoDaddy, Cloudflare, etc.):

**Opción 2A — Subdominio (recomendado)**

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| A | `erp` (o el que quieran) | `76.76.21.21` | Auto |

Resultado: `erp.gvmcorp.com`

**Opción 2B — Dominio raíz (apex)**

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| A | `@` | `76.76.21.21` | Auto |
| A | `www` | `76.76.21.21` | Auto |

### Paso 2: BC Fabric agrega el dominio al proyecto Vercel

```bash
npx vercel domains add erp.gvmcorp.com
```

O desde la UI de Vercel: Project `gvm-corp` → Settings → Domains → Add.

Vercel emite automáticamente el certificado SSL (5-10 minutos).

### Paso 3: BC Fabric asocia el dominio al tenant en la app

1. Ve a **admin.bc-security.com** → click en el tenant
2. Tab **Marca & Dominio**
3. Campo **"Dominio personalizado"** → escribe `erp.gvmcorp.com`
4. **Guardar cambios**

A partir de ese momento:
- Cuando un usuario entra a `erp.gvmcorp.com`, el middleware detecta el dominio
- Busca en la tabla `tenants` qué tenant tiene ese `custom_domain`
- Inyecta el tenant_id en headers de la petición
- El cliente ve SU marca, SU logo y SUS datos

## Checklist completo para onboarding de nuevo cliente

- [ ] Crear el tenant desde el panel Super Admin
- [ ] Asignar el plan adecuado (Starter/Professional/Enterprise)
- [ ] Configurar módulos habilitados según contrato
- [ ] Crear el primer usuario admin (se le envía contraseña temporal)
- [ ] Subir logo de la empresa del cliente
- [ ] Elegir colores de marca (primario + acento)
- [ ] Definir `app_name` — cómo el cliente llamará a SU ERP
- [ ] Decidir dominio:
  - [ ] Opción A: slug `mi-cliente` → `mi-cliente.bc-security.com`
  - [ ] Opción B: dominio propio del cliente
- [ ] Si Opción B: pedir al cliente crear DNS + agregar dominio a Vercel
- [ ] Enviar al cliente: URL de acceso + credenciales + manual de uso
- [ ] Generar certificado PDF de licencia
- [ ] Agendar capacitación inicial

## Caso específico: GVM Corporation

GVM ya tiene configurado:
- **Subdomain**: `gvm` (accesible como `gvm.bc-security.com` cuando wildcard DNS esté listo)
- **Custom domain**: `gvmcorp.gvm.com.co` (ya verificado en Vercel)
- **App name**: "GVM Corp ERP"

Sólo falta:
- [ ] Subir logo de GVM (admin puede hacerlo desde Tab Marca & Dominio)
- [ ] Comunicar a GVM que pueden acceder por `gvmcorp.gvm.com.co`

## Troubleshooting

### "Vercel dice que el dominio no está configurado"
- Esperar 5-15 min después de crear el registro DNS
- Verificar con `nslookup dominio.com 8.8.8.8`
- Debe responder con `76.76.21.21`

### "El cliente ve la app pero no su marca"
- Verificar que `custom_domain` en la DB esté correctamente guardado
- El middleware debe poder hacer match: host `== custom_domain`
- Probar en incógnito con Ctrl+Shift+R

### "El cliente ve datos de otro tenant"
- CRÍTICO: revisar RLS policies
- `get_my_tenant_id()` debe retornar el tenant correcto basado en el user
- Los usuarios solo tienen un tenant en `user_tenants` (enforced por RLS)

### "Las peticiones OPTIONS/CORS fallan"
- Verificar `vercel.json` incluye el nuevo dominio en headers si usa CORS manual
- Normalmente no es necesario, Next.js maneja esto

## Variables importantes

- IP de Vercel: `76.76.21.21`
- CNAME de Vercel: `cname.vercel-dns.com`
- Límite SSL Vercel: emisión en 5-15 min tras DNS OK
