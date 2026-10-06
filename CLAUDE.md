# 🏭 SaaS Factory V3 - Tu Rol: El Cerebro de la Fábrica

> Eres el **cerebro de una fábrica de software inteligente**.
> El humano decide **qué construir**. Tú ejecutas **cómo construirlo**.

---

## 🏢 Contexto de la Aplicación: GVM Corp

> **Qué es**: ERP SaaS multi-tenant para **GVM S.A.S** (Global Veterinary Medicine, Colombia). Producción en `https://app.bc-security.com` (Vercel, región Oregon). Idioma de trabajo: **español**.

**Situación de negocio**: el cliente está migrando desde **WorldOffice (WO)** por fases con su contador (Andrés). Facturación electrónica DIAN en modo mock hasta terminar la migración; las facturas reales siguen en WO, en la app se opera con pedidos (`SALES_ORDER`) y remisiones. Admin: `fbolivarb@gmail.com` (rol SUPER ADMINISTRADOR).

**Stack real**: Next.js 16 + React 19 + TypeScript, Tailwind, Supabase (proyecto `qoivnsnugfblfebrpifq`, ~120 migraciones en `supabase/migrations/`), Zustand, Zod, Vercel AI SDK + OpenRouter, Vitest. Deploy manual con `npx vercel --prod --yes` (git push NO despliega). Skew Protection activa en Vercel.

**Mapa de rutas** (`src/app/`): `(main)/` app autenticada · `(auth)/` login por usuario `nombre.apellido` · `(print)/` plantillas A4 (no tocar responsive) · `(public)/`, `pay/[token]`, `terminal/[token]` páginas públicas por token (enviar SOLO lo mínimo al cliente) · `(super)/` super-admin multi-tenant · `api/` route handlers (cron, kiosk, team, version, OData).

**Módulos** (`src/features/` ↔ `src/app/(main)/`):

| Área | Qué hace | Features clave |
|------|----------|----------------|
| Ventas | Cotización → pedido → factura (`convertDocumentAction`), remisiones, NC/ND, listas de precios, multi-divisa, portal cliente, link de pago | `sales`, `documents`, `pricing`, `client-portal`, `payments` |
| Compras | OC (`OC-`), recepción a inventario, devoluciones, ACH proveedores, portal proveedor | `purchasing`, `vendor-portal` |
| Inventario | `product_stock` es VISTA sobre `inventory_movements`; lotes FEFO, ubicaciones, seriales, traslados entre bodegas (stock se descuenta al RECIBIR), fichas técnicas, ABC | `inventory`, `products`, `warehouse-transfers`, `catalog`, `logistics`, `production` |
| Terceros / CRM | 6.5k terceros importados de WO (5.437 proveedores / 1.416 clientes), leads, contratos | `parties`, `crm`, `contracts` |
| Contabilidad | Contabilización automática de ventas (motor + 757 reglas del contador, ReteICA/retenciones), 30+ reportes, activos fijos y depreciación, cierre de períodos, medios magnéticos, presupuesto | `accounting`, `taxes`, `budget`, `dian` |
| Tesorería | Cuentas, conciliación bancaria (importa extractos), retenciones (`transaction_withholdings`), cartera | `treasury`, `portfolio` |
| Nómina / RRHH | Nómina consolidada, ausencias, horas extra, capacitación, carnets QR con foto, kiosco de asistencia (`/terminal/[token]`, HMAC `KIOSK_QR_SECRET`, traza por terminal), portal `my-payroll`. **Salarios protegidos por RLS** | `payroll`, `training`, `academy` |
| Gestión comercial | Viáticos/viajes multi-concepto con aprobación (JEFE ADMINISTRATIVO) | `commercial` |
| Soporte | Tickets → HexDesk (API key + webhook HMAC), encuestas de satisfacción, centro de ayuda | `support`, `help` |
| Transversal | Gobernanza: 28 roles / 12 módulos / permisos por rol (`role_permissions`), RLS 100%, `team_admins`; auditoría con actor; backups `.gvm` cifrados (`GVM_BACKUP_KEY`); chat interno realtime; copiloto AI; notificaciones; activos corporativos; importadores WO; PWA; Power BI OData; búsqueda global | `settings`, `super-admin`, `collaboration`, `ai`, `notifications`, `technology`, `import`, `analytics`, `search`, `dashboard` |

**Reglas de datos que NO se ven en el código**:
- El cliente de Supabase NO está tipado contra el esquema: `npm run preflight` (typecheck + `audit:schema` + tests) antes de cada deploy; regenerar `scripts/schema-snapshot.json` tras cada migración.
- RPC de tenant: `get_my_tenant_id()` (no existe `get_current_tenant_id`).
- Fechas date-only son Bogotá (UTC-5): usar `src/shared/lib/dateFmt.ts`.
- Numeración de documentos por trigger en BD según `doc_type`.
- PDFs con el kit `src/shared/lib/pdfKit.ts` (color de marca `#0096E6`).
- Anular conserva consecutivo: las listas filtran `hide_voided` por defecto.

Material de referencia del cliente (exports WO, revisiones del contador) en `docs/`; scripts de migración en `scripts/wo-import/`.

---

## 🎯 Principios Fundamentales

### Henry Ford
> *"Pueden tener el coche del color que quieran, siempre que sea negro."*

**Un solo stack perfeccionado.** No das opciones técnicas. Ejecutas el Golden Path.

### Elon Musk

> *"La máquina que construye la máquina es más importante que el producto."*

**El proceso > El producto.** Los comandos y PRPs que construyen el SaaS son más valiosos que el SaaS mismo.

> *"Si no estás fallando, no estás innovando lo suficiente."*

**Auto-Blindaje.** Cada error es un impacto que refuerza el proceso. Blindamos la fábrica para que el mismo error NUNCA ocurra dos veces.

> *"El mejor proceso es ningún proceso. El segundo mejor es uno que puedas eliminar."*

**Elimina fricción.** MCPs eliminan el CLI manual. Feature-First elimina la navegación entre carpetas.

> *"Cuestiona cada requisito. Cada requisito debe venir con el nombre de la persona que lo pidió."*

**PRPs con dueño.** El humano define el QUÉ. Tú ejecutas el CÓMO. Sin requisitos fantasma.

---

## 🤖 La Analogía: Tesla Factory

Piensa en este repositorio como una **fábrica automatizada de software**:

| Componente Tesla | Tu Sistema | Archivo/Herramienta |
|------------------|------------|---------------------|
| **Factory OS** | Tu identidad y reglas | `CLAUDE.md` (este archivo) |
| **Blueprints** | Especificaciones de features | `.claude/PRPs/*.md` |
| **Control Room** | El humano que aprueba | Tú preguntas, él valida |
| **Robot Arms** | Tus manos (editar código, DB) | Supabase MCP + Terminal |
| **Eyes/Cameras** | Tu visión del producto | Playwright MCP |
| **Quality Control** | Validación automática | Next.js MCP + typecheck |
| **Assembly Line** | Proceso por fases | `bucle-agentico-blueprint.md` |
| **Neural Network** | Aprendizaje continuo | Auto-Blindaje |
| **Asset Library** | Biblioteca de Activos | `.claude/` (Commands, Skills, Agents, Design) |

**Cuando ejecutas `saas-factory`**, copias toda la **infraestructura de la fábrica** al directorio actual.

---

## 🧠 V3: El Sistema que se Fortalece Solo (Auto-Blindaje)

> *"Inspirado en el acero del Cybertruck: los errores refuerzan nuestra estructura. Blindamos el proceso para que la falla nunca se repita."*

### Cómo Funciona

```
Error ocurre → Se arregla → Se DOCUMENTA → NUNCA ocurre de nuevo
```

### Archivos Participantes

| Archivo | Rol en Auto-Blindaje |
|---------|----------------------|
| `PRP actual` | Documenta errores específicos de esta feature |
| `.claude/prompts/*.md` | Errores que aplican a múltiples features |
| `CLAUDE.md` | Errores críticos que aplican a TODO el proyecto |

### Formato de Aprendizaje

```markdown
### [YYYY-MM-DD]: [Título corto]
- **Error**: [Qué falló]
- **Fix**: [Cómo se arregló]
- **Aplicar en**: [Dónde más aplica]
```

---

## 🎯 El Golden Path (Un Solo Stack)

No das opciones técnicas. Ejecutas el stack perfeccionado:

| Capa | Tecnología | Por Qué |
|------|------------|---------|
| Framework | Next.js 16 + React 19 + TypeScript | Full-stack en un solo lugar, Turbopack 70x más rápido |
| Estilos | Tailwind CSS 3.4 | Utility-first, sin context switching |
| Backend | Supabase (Auth + DB) | PostgreSQL + Auth + RLS sin servidor propio |
| AI Engine | Vercel AI SDK v5 + OpenRouter | Streaming nativo, 300+ modelos, una sola API |
| Validación | Zod | Type-safe en runtime y compile-time |
| Estado | Zustand | Minimal, sin boilerplate de Redux |
| Testing | Playwright MCP | Validación visual automática |

**Ejemplo:**
- Humano: "Necesito autenticación" (QUÉ)
- Tú: Implementas Supabase Email/Password (CÓMO)

---

## 🏗️ Arquitectura Feature-First

> **¿Por qué Feature-First?** Colocalización para IA. Todo el contexto de una feature en un solo lugar. No saltas entre 5 carpetas para entender algo.

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Rutas de autenticación
│   ├── (main)/              # Rutas principales
│   └── layout.tsx           # Layout root
│
├── features/                 # Organizadas por funcionalidad
│   ├── auth/
│   │   ├── components/      # LoginForm, SignupForm
│   │   ├── hooks/           # useAuth
│   │   ├── services/        # authService.ts
│   │   ├── types/           # User, Session
│   │   └── store/           # authStore.ts
│   │
│   └── [feature]/           # Misma estructura
│
└── shared/                   # Código reutilizable
    ├── components/          # Button, Card, etc.
    ├── hooks/               # useDebounce, etc.
    ├── lib/                 # supabase.ts, etc.
    └── types/               # Tipos compartidos
```

---

## 🔌 MCPs: Tus Sentidos y Manos

### 🧠 Next.js DevTools MCP - Quality Control
Conectado vía `/_next/mcp`. Ve errores build/runtime en tiempo real.

```
init → Inicializa contexto
nextjs_call → Lee errores, logs, estado
nextjs_docs → Busca en docs oficiales
```

### 👁️ Playwright MCP - Tus Ojos
Validación visual y testing del navegador.

```
playwright_navigate → Navega a URL
playwright_screenshot → Captura visual
playwright_click/fill → Interactúa con elementos
```

### 🖐️ Supabase MCP - Tus Manos (Backend)
Interactúa con PostgreSQL sin CLI.

```
execute_sql → SELECT, INSERT, UPDATE, DELETE
apply_migration → CREATE TABLE, ALTER, índices, RLS
list_tables → Ver estructura de BD
get_advisors → Detectar tablas sin RLS
```

---

## 📋 Sistema PRP (Blueprints)

Para features complejas, generas un **PRP** (Product Requirements Proposal):

```
Humano: "Necesito X" → Investigas → Generas PRP → Humano aprueba → Ejecutas Blueprint
```

**Ubicación:** `.claude/PRPs/`

| Archivo | Propósito |
|---------|-----------|
| `prp-base.md` | Template base para crear nuevos PRPs |
| `PRP-XXX-*.md` | PRPs generados para features específicas |

---

## 🤖 AI Engine (Vercel AI SDK + OpenRouter)

Para features de IA, consulta `.claude/ai_templates/_index.md`.

---

## 🔄 Bucle Agéntico (Assembly Line)

Ver `.claude/prompts/bucle-agentico-blueprint.md` para el proceso completo:

1. **Delimitar** → Dividir en FASES (sin subtareas)
2. **Mapear** → Explorar contexto REAL antes de cada fase
3. **Ejecutar** → Subtareas con MCPs según juicio
4. **Auto-Blindaje** → Documentar errores y blindar proceso
5. **Transicionar** → Siguiente fase con contexto actualizado

---

## 📏 Reglas de Código

### Principios
- **KISS**: Prefiere soluciones simples
- **YAGNI**: Implementa solo lo necesario
- **DRY**: Evita duplicación
- **SOLID**: Una responsabilidad por componente

### Límites
- Archivos: Máximo 500 líneas
- Funciones: Máximo 50 líneas
- Componentes: Una responsabilidad clara

### Naming
- Variables/Functions: `camelCase`
- Components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Files/Folders: `kebab-case`

### TypeScript
- Siempre type hints en function signatures
- Interfaces para object shapes
- Types para unions
- NUNCA usar `any` (usar `unknown`)

### Patrón de Componente

```typescript
interface Props {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  onClick: () => void;
}

export function Button({ children, variant = 'primary', onClick }: Props) {
  return (
    <button onClick={onClick} className={`btn btn-${variant}`}>
      {children}
    </button>
  );
}
```

---

## 🛠️ Comandos

### Development
```bash
npm run dev          # Servidor (auto-detecta puerto 3000-3006)
npm run build        # Build producción
npm run typecheck    # Verificar tipos
npm run lint         # ESLint
```

### Git
```bash
npm run commit       # Conventional Commits
```

---

## 🧪 Testing (Patrón AAA)

```typescript
test('should calculate total with tax', () => {
  // Arrange
  const items = [{ price: 100 }, { price: 200 }];
  const taxRate = 0.1;

  // Act
  const result = calculateTotal(items, taxRate);

  // Assert
  expect(result).toBe(330);
});
```

---

## 🔒 Seguridad

- Validar TODAS las entradas de usuario (Zod)
- NUNCA exponer secrets en código
- SIEMPRE habilitar RLS en tablas Supabase
- HTTPS en producción

---

## ❌ No Hacer (Critical)

### Código
- ❌ Usar `any` en TypeScript
- ❌ Commits sin tests
- ❌ Omitir manejo de errores
- ❌ Hardcodear configuraciones

### Seguridad
- ❌ Exponer secrets
- ❌ Loggear información sensible
- ❌ Saltarse validación de entrada

### Arquitectura
- ❌ Crear dependencias circulares
- ❌ Mezclar responsabilidades
- ❌ Estado global innecesario

---

## 🔥 Aprendizajes (Auto-Blindaje Activo)

> Esta sección CRECE con cada error encontrado.

### 2025-01-09: Usar npm run dev, no next dev
- **Error**: Puerto hardcodeado causa conflictos
- **Fix**: Siempre usar `npm run dev` (auto-detecta puerto)
- **Aplicar en**: Todos los proyectos

### 2026-06-15: Carnets QR — nombre y cargo del empleado
- **Error**: (1) Empleados sin `party` salían como "Sin nombre" (no se miraba `profiles.full_name`). (2) `contract_type` en español (`INDEFINIDO`) caía al fallback "Empleado Activo" porque el mapa solo tenía claves en inglés.
- **Fix**: Lógica pura y testeada en `src/features/payroll/utils/carnetHelpers.ts` (`resolveEmployeeName` con cascada party→profiles→"Sin nombre", `contractLabel` con claves ES+EN, `resolvePartyRow` para el quirk de PostgREST objeto/array). Fuente única usada por `kioskActions` y `EmployeeQRCards`. Tests en `carnetHelpers.test.ts` congelan el comportamiento.
- **Aplicar en**: Cualquier lectura de relaciones embebidas de Supabase (pueden venir como objeto o array) y cualquier dato con valores enum mezclados ES/EN. Extraer lógica frágil a funciones puras + test antes de que se vuelva a romper.

### 2026-07-31: Pedidos — "descripción y cantidad son obligatorios" con la línea llena
- **Error**: Al limpiar (×) el selector de catálogo de una línea, `SearchableSelect` emite `''` y se guardaba en `product_id`, que es `z.string().uuid()`. La cadena vacía no es uuid → error en `lines` → toast genérico "Revisa los items: descripción y cantidad son obligatorios" aunque ambos campos estuvieran llenos. Mismo síntoma al dejar la CANTIDAD vacía (`valueAsNumber` → `NaN`).
- **Fix**: `product_id` se guarda como `v || null`; `qty` usa `setValueAs` con fallback a 0; el toast ahora nombra el ítem y el campo real (`DocumentForm.tsx`).
- **Aplicar en**: Cualquier campo uuid nullable alimentado por un selector que se pueda limpiar (bodega, lote, dimensiones) y cualquier `register(..., { valueAsNumber: true })`. Los mensajes de error de formulario nunca deben adivinar el campo.

### 2026-07-31: Integración que falla en silencio (contabilización automática)
- **Error**: `createEntry` insertaba `document_id` en `journal_entries`, columna que nunca existió. El INSERT fallaba SIEMPRE y `documentService.createDocument` se lo tragaba con `catch { console.error }`. Resultado: meses con 0 asientos en la base y nadie se enteró. Además `getAccountByCode` usaba `.single()`, que devuelve error (no null) si hay 0 o >1 filas.
- **Fix**: columna creada + `maybeSingle()` + el motor devuelve `warnings` al llamador en vez de tragarse los problemas.
- **Aplicar en**: Cualquier integración "fire and forget" en un try/catch. Si un catch solo hace console.error, la funcionalidad puede estar muerta sin síntoma visible: hay que verificar con datos reales (`select count(*)`) que la tabla destino tenga filas, no asumir que el código se ejecuta.

### 2026-08-12: "Server Action ... was not found on the server" en producción
- **Error**: Un usuario con la pestaña abierta desde antes de un deploy intentó guardar un borrador de pedido y falló. Cada `vercel --prod` genera IDs nuevos para las Server Actions; el bundle viejo del navegador envía un ID que ya no existe (version skew). No es un bug del formulario: rompe CUALQUIER acción de las sesiones ya abiertas.
- **Fix**: `deploymentId` en `next.config.ts` (para que Vercel Skew Protection enrute al deploy original) + `AppUpdateGuard` global (`src/shared/components/system/AppUpdateGuard.tsx`): avisa de versión nueva comparando `/api/version` y, si una acción devuelve 404, muestra un mensaje entendible en vez del error técnico.
- **Aplicar en**: Todo deploy en horario laboral. Skew Protection debe estar ACTIVA en Vercel (Settings → Advanced) para que el arreglo de raíz opere; sin ella solo queda el aviso. Preferir desplegar fuera de horario de operación del cliente.

### 2026-08-12: Columnas que no existen — 12 módulos rotos sin que nadie lo supiera
- **Error**: Auditoría de TODO el código contra el esquema real: 19 discrepancias. Insert/select sobre columnas inexistentes → PostgREST devuelve error y la función queda muerta, a veces en silencio (el código no comprueba `error`). Afectados: devoluciones de compra (`documents.tax`/`created_by`), API keys (`prefix`), asiento de apertura de migración (`journal_entries.date`), control de asistencia (`employees.full_name/position/department`), portales cliente y proveedor (`documents.notes`), link de pago y terminal QR (`tenants.legal_name`), resoluciones DIAN (`expiry_date`), escáner de barras (`inventory_movements.reason`), historial de conciliación (`matched_count`), copiloto AI (`treasury_accounts.currency`), retenciones de tesorería (tabla inexistente).
- **Fix**: Corregidos los 19 + tabla `transaction_withholdings` creada. Herramienta permanente: `npm run audit:schema` (compara el código con `scripts/schema-snapshot.json`) y `npm run preflight` (typecheck + audit + tests). Regenerar el snapshot después de cada migración.
- **Aplicar en**: ANTES de cada deploy correr `npm run preflight`. TypeScript no ve estos errores: el cliente de Supabase no está tipado contra el esquema. Un `catch { console.error }` sobre un insert convierte esto en una funcionalidad muerta invisible.

### 2026-08-31: 25 pedidos idénticos por un doble clic (duplicados de documentos)
- **Error**: Un clic sostenido en "Guardar" creó 25 pedidos iguales (SO-01590..SO-01614) en 14 segundos para ARANGO HERMANOS SAS. El botón de `DocumentForm` solo se deshabilita si la página pasa la prop opcional `isLoading`, y `/sales/orders/new`, `/sales/quotations/new` y `/documents/[id]/edit` no la pasaban. Barrido histórico: 39 ráfagas de duplicados (23 con más de una copia viva), incluidas remisiones gemelas por doble clic en "convertir" y pedidos duplicados ya facturados (ACCEPTED).
- **Fix**: Tres capas. (1) Guarda interna en `DocumentForm` (`submitting` + ref, `busy = isLoading || submitting`), que ya no depende de que el llamador recuerde la prop. (2) Clave de idempotencia por intento de guardado, generada en el formulario y validada por índice único `(tenant_id, idempotency_key)`; `createSalesDocumentAction` devuelve el documento existente ante un reenvío y ante violación 23505 (carrera real), y rechaza un gemelo (mismo tipo/tercero/fecha/total) creado hace menos de 60 s. (3) `convertDocumentAction` redirige al hijo creado hace menos de 60 s en vez de crear otro.
- **Secuela (visibilidad)**: anular conserva el consecutivo, así que las 75 filas ANULADO copaban la lista de pedidos y el dashboard de ventas (los "últimos 50" eran casi todos anulados), e inflaban el KPI "Total Pedidos" hundiendo el % de cumplimiento. Ahora `getDocuments` acepta `hide_voided` y las listas lo activan por defecto; el filtro de estado ofrece "Solo anulados" y "Todos (incluye anulados)". Nada se borró.
- **Aplicar en**: Toda Server Action que CREE algo con consecutivo. Deshabilitar el botón es necesario pero NO suficiente: no cubre otra pestaña, un reintento tras error de red ni una carrera; eso solo lo cierra una clave de idempotencia con índice único en la base. Una prop opcional de bloqueo (`isLoading`) se olvida — la guarda debe vivir dentro del componente.

### 2026-09-01: Embed a `profiles` roto — "Could not find a relationship in the schema cache"
- **Error**: `satisfaction_surveys.created_by` referenciaba `auth.users(id)` y el select usaba `author:profiles(full_name)`. PostgREST no atraviesa esquemas: no encuentra la relación, devuelve error y el servicio retorna `[]` — la página queda vacía sin explicación (el error solo se ve en consola).
- **Fix**: FK adicional y directa a `public.profiles(id)` (`satisfaction_surveys_created_by_profiles_fkey`), igual que `support_tickets_assigned_to_profiles_fkey`, que ya existía por esta misma razón. Verificado con una petición real a `/rest/v1/...?select=...,author:profiles(full_name)` (HTTP 400 → 200).
- **Aplicar en**: Cualquier columna de usuario (`created_by`, `assigned_to`, `approved_by`) que se quiera embeber como `profiles(...)`. La FK a `auth.users` NO habilita el embed. Antes de dar por buena una consulta con embeds, probarla contra PostgREST — un `catch` que devuelve lista vacía convierte esto en una pantalla en blanco sin síntoma.

### 2026-09-01: PostgREST corta en 1.000 filas y `.limit(5000)` no sirve
- **Error**: El buscador de clientes de las encuestas usaba `.select(...).limit(5000)`. PostgREST aplica su tope `max-rows` (1.000) y recorta la respuesta SIN error: de 1.425 clientes solo llegaban los 1.000 primeros por orden alfabético, así que XIOMARA TORRES PEREZ "no existía". Mismo patrón en el KPI de volumen pendiente de pedidos, en el export de traslados y —lo grave— en `backupService`, cuyos `.limit(10000)/.limit(50000)` guardaban 1.000 filas por tabla: las copias de seguridad de `parties` (6.712), `documents` (2.213) y `document_lines` (8.152) estaban incompletas desde siempre.
- **Fix**: helper `fetchAllRows` (`src/shared/lib/fetchAllRows.ts`, con tests) que pagina con `range()` hasta agotar la tabla, aplicado a los cuatro casos. Ya existía el patrón correcto en `partyService.getAllPartiesLight` y en `cachedLookups` — el error fue no reutilizarlo.
- **Aplicar en**: NUNCA usar `.limit(n)` con n > 1.000 esperando n filas. Si el resultado alimenta un buscador, un total, un export o un backup, hay que paginar con `fetchAllRows` y ordenar por una columna única (`id`, o el criterio de negocio + `id` como desempate: sin orden total, `range()` salta filas). El síntoma es siempre silencioso: datos que "no existen", totales bajos, respaldos a medias.

### 2026-09-07: Traslados — el inventario se descuenta al RECIBIR, no al enviar
- **Cambio de regla (decisión del cliente)**: antes `sendTransfer` creaba los movimientos OUT del origen al pasar a EN TRÁNSITO. Ahora el envío no toca el stock: `receiveTransfer` genera OUT en origen e IN en destino por cada renglón recibido. Mientras la mercancía viaja sigue contabilizada en el origen.
- **Recepción pieza por pieza**: nueva tabla `warehouse_transfer_receipts` (un renglón por lote recibido: lote, vencimiento, cantidad). Una línea puede recibirse en varios lotes y en varias tandas, por eso es tabla aparte y no columnas en `warehouse_transfer_lines`. El lote se crea en la bodega destino si no existía y el trigger `adjust_lot_on_movement` ajusta sus unidades solo (basta pasar `lot_id` en el movimiento).
- **Lote obligatorio** únicamente si el producto ya tiene lotes registrados (`product_lots`), para no frenar al bodeguero con insumos que no manejan lote.
- **Aplicar en**: `product_stock` es una VISTA sobre `inventory_movements` — no hay que actualizar stock a mano, basta crear los movimientos correctos. La aritmética de recepción (exceso, lotes repetidos, decimales) vive en `receiptValidation.ts` con tests: recibir de más descuadra dos bodegas a la vez y no se nota hasta el conteo.

### 2026-09-08: Kiosco QR — el fichaje no guardaba en qué terminal se marcó
- **Error**: `/api/kiosk/clock` validaba el terminal (token, vigencia, empresa) pero llamaba a `clockIn(..., tenant_id, geo)` SIN pasar `terminal.id`, y `payroll_attendance` no tenía columna para ello. Marcar en La Ceja, Bogotá o Fómeque producía exactamente la misma fila: no había forma de saber dónde se autenticó el carnet. Además `last_ping_at` del terminal se actualizaba con `void adminClient...` (sin await): en serverless la función termina antes y la promesa nunca corre — los 5 terminales tenían "último uso" vacío pese a haber 19 marcaciones reales con GPS.
- **Fix**: columnas `check_in_terminal_id` / `check_out_terminal_id` (dos, porque la jornada puede empezar en una sede y terminar en otra), guardadas por `clockIn`/`clockOut`; `await` en el ping; el endpoint devuelve `terminal_name` para confirmarlo en pantalla. Reporte nuevo `AttendancePunchLog` con filtro por sede. Verificado de punta a punta contra el endpoint real (firma HMAC incluida) y borrando después el registro de prueba.
- **Aplicar en**: Todo `void promesa` / promesa sin `await` en una route handler o Server Action: en Vercel no se ejecuta. Si el dato importa, hay que esperarlo y comprobar su `error`. Y al validar una entidad de contexto (terminal, sucursal, dispositivo), guardar SU ID en el registro: validar no es trazar.
- **Gotcha de dev**: tras `npm run build`, el `npm run dev` siguiente servía 404 en rutas API existentes por caché de Turbopack. Se resuelve con `rm -rf .next` antes de levantar el dev.

### 2026-09-08: El portal público del terminal QR filtraba el directorio de empleados
- **Error**: `/terminal/[token]` es público (sin sesión, basta el enlace) y enviaba al navegador la lista COMPLETA de empleados activos —id y nombre de los 39— solo para dos cosas: mostrar el nombre mientras se procesaba el escaneo y pintar "N empleados registrados" en el pie. Cualquiera con la URL se llevaba el directorio del personal.
- **Fix**: la página envía únicamente el CONTEO (`count: 'exact', head: true`). El nombre real ya lo devuelve `/api/kiosk/clock` DESPUÉS de validar la firma HMAC del QR; mientras tanto se muestra "Verificando...". Verificado en producción: el HTML del portal ya no contiene ningún nombre de empleado. Se añadió además `rotateTerminalTokenAction` (botón "Renovar enlace") para invalidar un enlace filtrado sin perder el historial del terminal, y se desactivaron los terminales que no están en uso.
- **Aplicar en**: Toda página pública por token (terminal, portal cliente/proveedor, link de pago). Enviar SOLO lo mínimo para pintar la pantalla: si el dato se puede resolver en el servidor después de autenticar la operación, no debe viajar al cliente antes. Un `select` cómodo en un Server Component público es una fuga de datos, no un detalle de rendimiento.

### 2026-09-11: ReteICA salía en $0 para todos — columna no seleccionada
- **Error**: `accountingService.previewSalesEntry` leía el tercero con `.select('taxpayer_type, payment_term_days, city')` y luego evaluaba `party.applies_reteica === true`. La columna nunca venía en el select → `undefined` → ReteICA jamás se practicaba, aunque 950 terceros tienen la marca traída de WorldOffice y 86 pedidos recientes eran Bogotá→Bogotá. En la simulación para el contador habría salido $0 en toda la columna y se habría atribuido a la parametrización (tarifa, reglas), no al código.
- **Fix**: `applies_reteica` añadida al select. Sondeo con 120 documentos reales: ReteICA pasó de $0 a $694.789, asiento cuadrado, 0 advertencias. La simulación ahora incluye también los PEDIDOS FACTURADOS (`SALES_ORDER` ACCEPTED, tratados como FV) porque las facturas reales siguen en WorldOffice y en la app solo hay 16 borradores.
- **Aplicar en**: Cada vez que un servicio evalúe `row.campo` sobre una fila leída con un `select` explícito, verificar que el campo ESTÉ en la lista. TypeScript no lo detecta (el cliente de Supabase no está tipado contra el esquema) y el síntoma es un valor "legítimamente" falso/cero, no un error. Antes de entregar una simulación o reporte al contador, correr un sondeo con datos reales y desconfiar de cualquier columna que dé cero en todas las filas.

### 2026-09-15: Asistencia — retardo de 409 minutos a las 9:48 de la mañana (hora UTC del servidor)
- **Error**: `attendanceService` y `/api/kiosk/clock` calculaban todo con la hora local del proceso (`setHours`, `getHours`, `getDay`, `toISOString().split('T')[0]`). En Vercel el proceso está en UTC (+5 h respecto a Bogotá): una entrada a las 09:48 en Entrerríos salió con 409 min de retardo (14:48 − 08:00), las 4 pm contaban como franja nocturna, un sábado a las 8 pm era domingo, y cualquier marcación después de las 7 pm caía en la `work_date` del día SIGUIENTE — una salida a las 7:30 pm no cerraba la jornada sino que abría una entrada para mañana. En la máquina de desarrollo (Windows en hora colombiana) las pruebas pasaban: el bug solo existía en producción.
- **Fix**: helper `src/features/payroll/utils/bogotaTime.ts` (desfase fijo −05:00, Colombia no tiene horario de verano; `getUTC*` sobre el instante desplazado, sin depender de la zona del proceso) con 13 tests, usado en `clockIn/clockOut/getTodayStatus`, `calculateLateness`, `calculateNightHours`, domingo y en la hora que la tablet muestra al empleado. Tests de `attendanceService` con instantes UTC congelan los casos. Retardos ya grabados recalculados por SQL con `at time zone 'America/Bogota'`.
- **Aplicar en**: TODO cálculo de fecha/hora en servidor (Server Actions, route handlers, crons): nunca `new Date().getHours()/getDay()/toISOString().slice(0,10)` para lógica de negocio colombiana. Probar con instantes UTC explícitos en los tests (`new Date('...Z')`), porque en la máquina local el error no se ve. Para fechas date-only, `parseLocalDate` de `dateFmt.ts`.

### 2026-09-15: El kiosco tardaba en leer el carnet QR
- **Error**: `Html5Qrcode` arrancaba con `fps: 10`, `qrbox` fijo de 250 px, todos los formatos habilitados (probaba códigos de barras 1D en cada cuadro), intento de imagen espejada activo y resolución por defecto. El carnet había que sostenerlo quieto y centrado varios segundos.
- **Fix**: solo `QR_CODE` en `formatsToSupport`, `useBarCodeDetectorIfSupported` (decodificación nativa por hardware en Chrome/Android), `disableFlip`, `fps: 30`, `qrbox` del 75 % del visor, `videoConstraints` 1280×720 con `focusMode: continuous`. Pantalla de resultado de 3,5 s (3 s en error) para no retener la fila.
- **Aplicar en**: Cualquier lector de códigos con `html5-qrcode`: restringir formatos y activar el detector nativo es lo que más pesa; el `qrbox` limita dónde busca el decodificador, así que un recuadro pequeño hace que el código "no se capture" aunque esté en pantalla.

### 2026-09-16: Autoservicio de asistencia — el guard "ya hay salida" vivía solo en el kiosco
- **Error**: Al abrir la salida desde "Mi nómina" (`selfClockOutAction`), un empleado podía llamarla dos veces: la segunda pisaba su salida real con una hora posterior, recalculaba horas trabajadas con ese checkout tardío y dejaba huérfana la justificación de salida anticipada. El kiosco sí bloqueaba "jornada completa" (409), pero el guard estaba en el route handler, no en `attendanceService.clockOut`, así que el nuevo llamador no lo heredó.
- **Fix**: `clockOut` rechaza si `current.check_out` ya existe. La resolución de identidad del portal selecciona solo `id, tenant_id, status` de `employees` (el admin client salta la RLS de salarios: no traer `*` "por comodidad").
- **Aplicar en**: Toda función compartida entre un flujo controlado (tablet/HMAC) y uno de autoservicio: los guards de estado e idempotencia van en la función compartida, nunca reimplementados en cada llamador. Y cualquier helper que use admin client sobre `employees` debe pedir columnas explícitas.

### 2026-09-16: Módulo nuevo (planeador de visitas) sin guard de módulo del lado del servidor
- **Error**: El planeador de visitas del CRM (`crm_visits`) nació con la regla fina bien aplicada (un comercial solo ve/edita lo suyo, los roles de gerencia ven todo, `salesperson_id` forzado en servidor) pero SIN `canViewModule('crm')`: ni `/crm` tenía `layout.tsx` con `ModuleGate` ni las Server Actions verificaban `role_permissions`. Cualquier usuario autenticado del tenant podía entrar por URL o invocar `getPartySnapshotAction` y leer las ventas de cualquier cliente. Lo detectó el agente `security-reviewer` antes del deploy. Además `REPRESENTANTE COMERCIAL` tenía `can_view=false` en `crm`: los comerciales no habrían visto el módulo que se construyó para ellos.
- **Fix**: `src/app/(main)/crm/layout.tsx` con `<ModuleGate moduleKey="crm">` (cubre también leads/pipeline/forecast, que tampoco lo tenían), `canViewModule('crm')` repetido en `loadVisitPageContext()` y en el `ctx()` de las Server Actions, y el guard de "ve todo el equipo" DENTRO de `getSalespeople` (no en cada llamador). `can_view` activado para REPRESENTANTE COMERCIAL.
- **Aplicar en**: Todo módulo nuevo: (1) `layout.tsx` con `ModuleGate`, (2) el mismo chequeo en la función compartida que arma el contexto de las Server Actions (son endpoints HTTP invocables sin pasar por la página), (3) revisar en `role_permissions` que los roles a los que va dirigido el módulo tengan `can_view`. Invocar `security-reviewer` antes de desplegar tablas o acciones nuevas — aquí valió la pena.
- **Gotcha de dev**: `redirect()` desde un Server Component hacia otra ruta del mismo módulo disparó "Rendered more hooks than during the previous render" en el Router de Next en modo dev. Para negar acceso a un registro ajeno usar `notFound()`; para un tablero, mejor mostrar la versión acotada al usuario que redirigir.

### 2026-09-17: Regla "solo cierto rol escribe" implementada solo en la Server Action
- **Error**: `crm_sales_targets` (nueva) tenía RLS solo por tenant y la asignación de cartera actualizaba `parties.salesperson_id` con el cliente de sesión. La regla "solo gerencia asigna cartera y define metas" vivía únicamente en `accountActions.ts`. Con su propio JWT y la anon key pública, cualquier comercial podía llamar a PostgREST y ponerse clientes o bajarse la meta. Lo detectó `security-reviewer` antes del deploy.
- **Fix**: función `is_crm_manager()` (SECURITY DEFINER, misma regla que `visitService.canSeeAllVisits`), política de escritura en `crm_sales_targets` y trigger `guard_party_salesperson` en `parties` (BEFORE UPDATE OF salesperson_id). Probado con `SET LOCAL ROLE authenticated` + claims JWT en un bloque DO que termina en RAISE (rollback automático): comercial bloqueado, gerente ok.
- **Aplicar en**: Toda tabla con regla "solo el rol X escribe" dentro del tenant: la RLS (o un trigger si es una columna de una tabla compartida) debe verificar el rol; la Server Action es UX, no barrera. Truco de prueba sin dejar rastro: DO $$ ... SET LOCAL ROLE authenticated; set_config('request.jwt.claims', ...); ...; RAISE EXCEPTION 'ROLLBACK_OK %', resultado $$.
- **Nota de dev**: con `ModuleGate` en un `layout.tsx`, Turbopack en dev a veces no encuentra la Server Action del sidebar ("Failed to find Server Action") y salta el AppUpdateGuard; pasa también en `/analytics`, no en producción. Para probar en local, quitar el overlay con `document.querySelectorAll('div.fixed.inset-0.z-\[9999\]').forEach(e => e.remove())`.

### 2026-09-17: FKs de una tabla nueva sin comprobar pertenencia al tenant
- **Error**: `crm_interactions` tenía RLS correcta por `tenant_id` propio y `user_id = auth.uid()`, pero `party_id`/`visit_id` llegaban del cliente validados solo como uuid: la FK de Postgres comprueba existencia, no tenant. Se podía insertar una fila propia apuntando a un cliente de otra empresa (oráculo de existencia + registros huérfanos). Hallazgo del `security-reviewer`.
- **Fix**: antes del insert, `select('id')` del cliente y la visita con el cliente de sesión (la RLS de `parties`/`crm_visits` ya filtra por tenant) y error si no aparecen.
- **Aplicar en**: Toda tabla nueva con FK a entidades multi-tenant (`party_id`, `document_id`, `product_id`…): o la política RLS incluye `EXISTS (... tenant_id = fila.tenant_id)` o la Server Action confirma la referencia con el cliente de sesión. Zod `uuid()` no es autorización.
- **Gotcha de herramientas**: en un script Python con heredoc, `""` dentro de una cadena normal se convierte en el carácter retroceso y el regex de JS pierde el límite de palabra sin error visible. Para escribir regex con `` en archivos usar cadenas raw (`r'...'`) o el tool Write.

### 2026-09-17: La barra "Hay una versión nueva" hacía ruido con varios deploys al día
- **Error**: `AppUpdateGuard` mostraba una barra a TODOS los usuarios con la app abierta en cada `vercel --prod`. Con 5 deploys en un día laboral, los empleados la veían todo el tiempo y no sabían si debían recargar.
- **Fix**: la capa preventiva ahora es silenciosa: detecta la versión nueva y recarga la página completa en el siguiente cambio de pantalla (`usePathname`), cuando el usuario ya salió de lo que estaba haciendo. El modal solo aparece si una acción falla de verdad (404 de Server Action). Skew Protection mantiene funcionando la pestaña vieja mientras tanto.
- **Aplicar en**: Agrupar cambios y desplegar UNA vez, de preferencia fuera del horario de operación (antes de 7 a. m. o después de 6 p. m. Bogotá); las pruebas van en local. Avisar al usuario solo cuando tenga que hacer algo.

### 2026-09-17: Revocar EXECUTE "por no encontrar llamadas" bloqueó las remisiones (incidente con el cliente)
- **Error**: Al endurecer funciones SECURITY DEFINER se revocó `next_delivery_note_number` y `consume_stock_for_document` porque el grep `rpc\(\s*['"]nombre` no las encontró: en `salesService.ts` y `providerIntegrationService.ts` la llamada está partida en dos líneas (`client.rpc(
 'next_delivery_note_number', …)`). Resultado: "Error desconocido" al hacer remisiones en producción durante horas, hasta que un usuario avisó. Fernando recibió un llamado de atención del cliente.
- **Fix**: grants restaurados (`20260917150000_restore_rpc_grants_delivery_and_stock.sql`). Blindaje permanente: `scripts/audit-rpc-grants.mjs` (`npm run audit:rpc`, dentro de `npm run preflight`) lee los permisos reales de la base y falla si alguna función llamada por `.rpc(` (detección multilínea) no tiene EXECUTE para `authenticated` (o para `anon` si la llama código sin sesión), o si no existe. Probado: detecta el caso exacto de hoy.
- **Regla de despliegue (OBLIGATORIA)**: desplegar SOLO con `npm run deploy` (= preflight + `vercel --prod`). Nunca `npx vercel --prod` a mano. Cualquier cambio de permisos (GRANT/REVOKE/RLS) exige además probar en local el flujo que usa esa función (crear remisión, enviar a DIAN, registrar activo…) antes de desplegar. Un REVOKE no lo ven ni typecheck ni tests.
- **Aplicar en**: Todo cambio de seguridad en base de datos. El linter de Supabase propone revocar; la decisión se toma con `audit:rpc` en verde y prueba funcional, no con grep.

### 2026-09-17: Dock de chat global — avisos de mensajes nuevos siempre visibles
- **Qué se construyó**: ícono flotante (`ChatDock.tsx`, montado en el layout principal) con contador de mensajes sin leer en tiempo real, panel con quién escribió y hace cuánto, aviso emergente persistente (hasta abrirlo o cerrarlo, no un toast de 6s), sonido corto, notificación del navegador si está permitida, y contador en el título de la pestaña ("(3) GVM Corp"). Reemplaza el toast efímero que tenía `ChatPresence.tsx` (ahora solo presencia).
- **No leídos**: funciones `get_chat_unread()` y `mark_chat_channel_read(id)` (SECURITY INVOKER, solo `auth.uid()`), contra `chat_channel_members.last_read_at`. La página de Colaboración marca leído al abrir un canal o al llegar un mensaje mientras está abierto; abre un canal directo por `?c=<id>` (lo usa el dock).
- **Gotcha de verificación**: `next start` local en Windows lanzó "React error #310" en `/dashboard` — se reprodujo IDÉNTICO con `git checkout` del código original sin ningún cambio mío, así que es un artefacto del entorno local, no del código. Los previews de Vercel están protegidos por SSO (no se pueden probar con Playwright). Verificación real: desplegar a producción y probar ahí de inmediato con un usuario de prueba + INSERT directo en `chat_messages` desde el MCP de Supabase mientras la sesión del navegador sigue abierta — así se ve el flujo end-to-end (badge, toast, título, abrir canal, marcar leído) sin depender del entorno local.
- **Aplicar en**: Si `next start` local falla con un error que no cambia al revertir el código, no es tuyo — compara contra producción real antes de seguir depurando.

### 2026-09-18: Alertas duplicadas "Inventario sin asiento contable" — no era el mismo bug de capacitación
- **Error**: `inventoryService.createMovement` tenía un intento "MVP hardcoded" (desde julio) de generar un asiento contable por CADA movimiento IN/OUT de inventario, contra las cuentas `1435`/`6135` (INACTIVAS en el PUC) y `9999` (no existe). Nunca funcionó — `select count(*) from journal_entries where description ilike 'Inv:%'` daba 0 — y en vez de fallar en silencio disparaba una notificación HIGH por movimiento: 1.010 alertas idénticas acumuladas en dos meses (43 IN + 43 OUT solo en el último día), 78 sin leer, desplazando del dashboard (`CriticalAlertsPanel`, top 3 por prioridad/fecha) las alertas que sí importaban. El usuario lo confundió con el bug de capacitación duplicada del día anterior (ese era RLS/visibilidad de una sola notificación; este es creación sin límite de notificaciones nuevas — causas distintas, mismo síntoma visual).
- **Fix**: eliminado por completo el bloque de auto-contabilización por movimiento (nunca contabilizó nada real en 2 meses); limpiadas las 1.010 notificaciones acumuladas. La contabilización real de GVM es por DOCUMENTO (`accounting_rules`, motor de ventas), no por movimiento suelto de inventario; esa matriz todavía no tiene costo de venta.
- **Aplicar en**: Cualquier integración "fire and forget" que dispare una notificación en vez de un `console.error`: sin límite de frecuencia, un fallo sistemático (cuenta contable inactiva/inexistente) se vuelve spam de UNA notificación por evento de negocio, no un error aislado. Antes de dar por buena una integración automática, verificar con SQL que de verdad produjo filas en la tabla destino (aquí: `journal_entries`), no solo que no lanzó excepción. Si en el futuro se necesita costear inventario, debe ser una regla explícita del contador con cuentas reales del PUC y una alerta agregada (una vez al día), no una por movimiento.

### 2026-09-18: Kiosco QR — el recuadro del lector quedaba "cortado" (cámara 16:9 en caja cuadrada)
- **Error**: `KioskTerminal.tsx` pedía la cámara a 1280×720 (16:9, `videoConstraints`) pero el contenedor visual era `aspect-square` (1:1). El video no llenaba la caja: quedaba arriba, con una franja vacía (`bg-slate-900`) abajo. Las esquinas decorativas se dibujan por posición absoluta sobre TODO el contenedor cuadrado, así que el recuadro que el empleado ve como "guía" no coincidía con el área donde la cámara realmente mostraba imagen — el carnet quedaba fuera de foco visualmente aunque el decodificador siguiera funcionando, lo que confundía y hacía perder tiempo acomodándolo.
- **Fix**: contenedor cambiado a `aspect-video` (16:9, igual que la resolución pedida) + `aspectRatio: { ideal: 16/9 }` agregado a `videoConstraints` + CSS `!h-full !w-full object-cover` forzado sobre el `<video>` que inyecta la librería, para que SIEMPRE llene el recuadro sin importar qué resolución negocie cada cámara/tablet. Verificado contra el código de `html5-qrcode` (`clientWidth`/`clientHeight` se leen en vivo para escalar las coordenadas de decodificación), así que forzar el tamaño por CSS no desalinea el área real de lectura.
- **Aplicar en**: Cualquier lector de cámara (QR, código de barras, firma) montado en un contenedor con aspect ratio fijo: hacer que ese aspect ratio COINCIDA con `videoConstraints`, y además forzar `object-cover` sobre el `<video>` inyectado como red de seguridad — distintas tablets/cámaras negocian resoluciones distintas y "ideal" en `getUserMedia` no es garantía.

### 2026-09-18: "No se encontró licencia activa" en una tablet, con la licencia vigente hasta 2030
- **Error**: `LicenseBanner`/`LicenseManager` llamaban a `licenseService.getLicense()`, que consultaba `tenant_licenses` con el cliente de Supabase del NAVEGADOR (`@supabase/ssr` browser client) directo desde un `useEffect` al montar. Ese cliente inicializa la sesión de forma asíncrona (lee cookies, puede refrescar el token); si el componente dispara la consulta ANTES de que termine, corre como `anon`, la RLS (`tenant_id = get_my_tenant_id()`) no encuentra nada y `.single()` lanzaba error silenciado → banner "No se encontró licencia activa" aunque la licencia esté perfectamente vigente (ENTERPRISE hasta 2030, verificado en la BD). En un PC rápido esa carrera casi siempre se gana; en una tablet más lenta, no — mismo usuario (`fbolivarb@outlook.com`, cuenta y `user_tenants` sin ningún problema, verificado), dos resultados distintos según el dispositivo. El sidebar nunca mostró el problema porque su bootstrap (`getSidebarBootstrapAction`) ya resuelve la sesión del lado del SERVIDOR (cookies), sin esa carrera.
- **Fix**: `getLicense()` reemplazada por `getLicenseAction()` (`src/features/settings/actions/licenseActions.ts`, Server Action con el cliente de servidor) en los DOS lugares que la usaban (`LicenseBanner.tsx`, `LicenseManager.tsx`); función vieja del cliente eliminada para que no se vuelva a usar por error. De paso, `.single()` → `.maybeSingle()` (no lanza si 0 filas).
- **Aplicar en**: Cualquier consulta a Supabase disparada en un `useEffect` de montaje (sin esperar una interacción del usuario) que dependa de la sesión: preferir una Server Action (cookies, sin carrera) sobre el cliente del navegador. Si YA está en el navegador y el síntoma es "funciona en unos equipos y en otros no" sin patrón de datos, sospechar de una carrera de inicialización de sesión antes que de la RLS o los datos — confirmarlo revisando primero la cuenta/rol en la BD (si están limpios, el problema es el timing del cliente, no los datos).

### 2026-09-18: Dos deploys seguidos en horario laboral → dashboard y menú vacíos para varios usuarios ("rol Miembro", todo en $0)
- **Error**: Tras corregir el bug de licencia (deploy anterior) se desplegó un segundo cambio poco después, EN HORARIO LABORAL, violando la regla ya escrita de agrupar deploys y hacerlos fuera de operación. Las pestañas que ya estaban abiertas quedaron con el bundle viejo; `SidebarContent.tsx` llama `getSidebarBootstrapAction()` (Server Action) directo al montar, y si esa llamada falla por desfase de versión (ID de acción inexistente en el nuevo deploy), el `catch` solo hacía `console.error` — la pantalla se quedaba con los valores iniciales (`role: 'Miembro'`, `permissions: {}`), así que el menú lateral perdía casi todos los enlaces y el dashboard (que depende del mismo rol resuelto) mostraba todo en $0. Verificado que NO era un problema de datos: se simuló la sesión exacta del usuario afectado con el truco `SET LOCAL ROLE authenticated` + `request.jwt.claims` y la fila de `user_tenants` volvió perfecta (rol correcto, tenant correcto) — la falla era 100% del lado del navegador (bundle viejo), no de la base.
- **Fix**: el `catch` de `getSidebarBootstrapAction()` ahora recarga la página UNA sola vez (bandera en `sessionStorage` para no entrar en bucle si el error persiste por otra causa) en vez de quedarse en silencio con datos por defecto. `AppUpdateGuard` solo intercepta 404 de Server Actions disparadas por una ACCIÓN del usuario (guardar, etc.); esta llamada se dispara sola al montar, antes de que el usuario haga nada, y no pasaba por ese aviso.
- **Aplicar en (regla que se rompió hoy)**: `feedback_deploy_strategy` — agrupar TODOS los cambios de un día y desplegar UNA sola vez, de preferencia fuera de horario de operación del cliente (antes de 7 a.m. o después de 6 p.m. Bogotá). Si hay que corregir algo urgente en horario laboral, avisar que puede requerir refrescar la pestaña. Y: cualquier llamada a una Server Action desde un `useEffect` de montaje (no gatillada por el usuario) necesita su propio manejo de desfase de versión — no basta con que `AppUpdateGuard` cubra las acciones "normales".

### 2026-09-23: Encuestas a proveedores — clonar un módulo copia sus permisos, no sus validaciones de referencia
- **Qué se construyó**: `purchasing/vendor-surveys`, espejo de `support/surveys` (encuestas de clientes) pero con el PROVEEDOR calificando a GVM como comprador — mismas 3 secciones de preguntas adaptadas (Relación comercial y comunicación, Pedidos y pagos —incluye cumplimiento de tiempos de pago, que no existe en la de clientes—, Condiciones comerciales) + experiencia general (CSAT/NPS/fortaleza/mejora), mismo motor de ponderación por cargo duplicado en `vendorSurveyScoring.ts` (no importado desde el de clientes: cuestionarios distintos, no vale la pena acoplar ~80 líneas genéricas).
- **Hueco heredado corregido en el original al clonar**: `support/surveys` nunca tuvo `ModuleGate`/`canViewModule` en sus páginas — solo se ocultaba el link del sidebar, cualquier usuario autenticado del tenant podía entrar por URL. Al construir el clon SÍ se agregó `layout.tsx` con `<ModuleGate moduleKey="purchasing:vendor-surveys">` (usa el fallback jerárquico de `moduleGuard.ts` a "purchasing", sin romper roles existentes) + `canViewModule` repetido en las Server Actions.
- **Error que SÍ se coló al clonar (detectado por `security-reviewer` antes de desplegar)**: `createVendorSurveyAction` insertaba con `party_id` validado solo como `z.string().uuid()`, confiando en la FK a `parties` para "garantizar" que el proveedor existe — pero la FK de Postgres corre con privilegios del dueño de la tabla y NO respeta RLS, así que un usuario podía referenciar el `party_id` de un proveedor de OTRO tenant (oráculo de existencia cross-tenant). Es el mismo patrón ya corregido en `crm_interactions` (2026-09-17), que se había cerrado en el módulo de clientes original en su momento pero no se volvió a copiar al clonar.
- **Fix**: antes del insert, `select('id')` del proveedor con el cliente de sesión (la RLS de `parties` ya filtra por tenant) y error si no aparece.
- **Aplicar en**: Clonar un módulo copia lo que el AGENTE recuerda copiar, no lo que el módulo origen tiene de verdad — son DOS problemas independientes (autorización de módulo vs. pertenencia de la referencia al tenant) y hay que verificar los dos por separado contra el origen, no asumir que porque se corrigió el permiso de módulo ya quedó blindado. Antes de dar por bueno un clon, correr `security-reviewer` comparándolo explícitamente contra el original, no solo revisar el clon en aislado.

### 2026-09-23: TERCERA vez con alertas duplicadas — esta vez por deduplicar contra un título que cambia
- **Error**: `smartAlertService.triggerAlert` deduplicaba con `eq('title', ...)`, pero varios títulos incluyen un CONTEO en vivo ("33 Empleados sin Marcar Entrada"). `evaluateAndTriggerAlerts` corre en cada carga de `/dashboard` (no en un cron); cada vez que el conteo cambiaba entre una visita y la siguiente (alguien marcaba entrada), el título ya no coincidía con el de la alerta sin leer existente y nacía una notificación NUEVA en vez de refrescar la vieja. Llevaba así desde MAYO: decenas de "N Empleados sin Marcar Entrada" acumuladas, 5 sin leer el 23-sep con conteos distintos (33/36/37/39/40) todas a la vista en el dashboard a la vez. Mismo síntoma visible que los dos incidentes anteriores de alertas duplicadas (capacitación 2026-09-17, contabilización de inventario 2026-09-18) pero causa distinta cada vez — el usuario ya había pedido mitigar esta clase de ruido en general.
- **Hallazgo adicional en la misma revisión**: `notificationService.checkAndNotifyLowStock` no tenía NINGUNA deduplicación — cada movimiento de inventario que dejara un producto bajo el mínimo creaba una notificación nueva, sin límite, aunque ya hubiera una sin leer para ese mismo producto.
- **Fix**: columna nueva `app_notifications.alert_key` (clave ESTABLE por tipo de alerta, no el texto del título) en las 13 alertas de `smartAlertService` y en la de stock bajo (`LOW_STOCK:<product_id>`). `triggerAlert` ahora busca por `alert_key` + `is_read=false`: si existe, ACTUALIZA esa misma fila (título/cuerpo/prioridad/fecha) en vez de crear otra; si no existe, la crea con su `alert_key`. Limpiadas las 5 duplicadas sin leer de asistencia.
- **Aplicar en**: Cualquier alerta cuyo título incluya un dato que cambie con el tiempo (conteo, monto, nombre del más urgente) NUNCA debe deduplicarse por el texto del título — necesita una clave estable independiente del contenido. Y ninguna notificación automática por evento (movimiento, cron, carga de página) debe crearse sin comprobar primero si ya existe una versión sin leer del mismo tipo: el patrón correcto es "buscar por clave estable → actualizar si existe → crear si no", nunca "insertar siempre" ni comparar por el texto del mensaje.

### 2026-09-25: Excepción individual de permiso — usar `can_admin` del rol, no tocar el trigger
- **Caso**: Yenny Andrea Gamboa (rol AUXILIAR DE FACTURACION) necesitaba poder cambiar el comercial asignado (`parties.salesperson_id`), bloqueado por el trigger `guard_party_salesperson` (2026-09-17), que exige `is_crm_manager()`.
- **Cómo se resolvió**: `is_crm_manager()` YA contempla `role_permissions.can_admin=true` para `module_key='crm'` como vía de excepción (además de la lista de roles gerenciales). Verificado que ella es la ÚNICA usuaria con ese rol → activar `can_admin=true` en `role_permissions` para (su rol, 'crm') equivale a un permiso individual sin crear una excepción nueva, sin tocar el trigger ni la función, y sin afectar a nadie más. Verificado extremo a extremo con el truco `SET LOCAL ROLE authenticated` + `request.jwt.claims` (incluida una actualización real de `salesperson_id` con rollback) antes de confirmar al usuario que quedó listo.
- **Aplicar en**: Antes de tocar un trigger/función de seguridad para "hacerle una excepción a alguien", revisar si la función YA tiene un mecanismo de excepción por rol/permiso (`can_admin`, flags tipo `can_edit_product_tax`, `team_admins`) — casi siempre es más seguro y preciso usar ese mecanismo que modificar la regla general. Si el rol es compartido por varias personas, esto NO sirve (afectaría a todas) y hay que usar una excepción por persona real (patrón `team_admins`) en vez de por rol.
- **Hueco encontrado al preguntar "¿quedó traza de esto?"**: `role_permissions` (quién puede hacer qué) no tenía NINGÚN trigger de auditoría — ni por UI ni por SQL directo quedaba rastro de un cambio de permisos, a diferencia de `parties`/`documents`/`employees`/etc., que sí usan el trigger genérico `fn_audit_log()`. Se conectó (`trg_audit_role_permissions`) y se insertó un registro retroactivo del cambio de hoy. **Gotcha propio**: el primer intento de registro retroactivo atribuyó el cambio a Andrea (la beneficiaria) en vez de a Fernando (quien lo pidió) — un `actor_user_id` mal puesto en un log de auditoría es peor que no tener log, porque parece que alguien se autoconcedió el permiso. Corregido antes de cerrar.
- **Aplicar en**: Cualquier cambio de permisos/roles hecho por fuera de la app (SQL directo vía MCP) — verificar primero si la tabla de gobernanza tocada tiene auditoría; si no la tiene, es un hueco real que vale la pena cerrar, no soltar el cambio y ya. Y al dejar un registro retroactivo, el `actor_user_id` es quien AUTORIZÓ/PIDIÓ el cambio, nunca quien queda beneficiado por él.
- **Segundo hueco, peor, encontrado al verificar "¿esto se ve en la pantalla?"**: la RLS de `audit_log` filtra SIEMPRE por `tenant_id = tenant del usuario`. `role_permissions`/`app_roles` no tienen `tenant_id` (roles globales) → `fn_audit_log()` dejaba esas filas en `tenant_id = NULL`, que nunca calza con el filtro — **invisibles en /settings/audit para todo el mundo**, aunque existieran en la tabla. Fix: `fn_audit_log()` ahora usa `get_my_tenant_id()` como fallback cuando la tabla auditada no tiene esa columna.
- **Tercer hallazgo, el más importante**: `fbolivarb@gmail.com` (is_platform_admin=true, super-admin de PLATAFORMA) **no tiene fila en `user_tenants` para GVM** — por diseño (opera `/super-admin`, multi-tenant), pero eso significa que con esa cuenta NO ve nada de `/settings/audit` ni de ninguna pantalla filtrada por `tenant_id = get_my_tenant_id()`, sin importar qué tan "admin" sea a nivel de plataforma. La cuenta operativa de GVM día a día es `fbolivarb@outlook.com` (SUPER ADMINISTRADOR ahí sí, con `user_tenants`). Antes de dar por buena una verificación de "esto ya lo puede ver X", confirmar CON CUÁL de sus cuentas — plataforma y tenant son dos identidades distintas aunque sea la misma persona.
- **Aplicar en**: Cualquier pantalla nueva que filtre por `tenant_id`: probar su RLS con el truco de sesión simulada usando la cuenta REAL que la va a mirar, no asumir que "es admin, va a poder verlo". Y cualquier trigger/función reutilizada en una tabla SIN `tenant_id` (catálogos globales: roles, tipos, etc.) necesita revisar explícitamente qué le pasa a esa columna cuando no existe — `NULL` silencioso rompe cualquier RLS que compare por igualdad.

### 2026-09-26: El backup .gvm llevaba meses sin respaldar 70 tablas reales (contabilidad, tesorería, CRM, bodegas, gobernanza)
- **Error**: `BACKUP_TABLES` en `backupService.ts` tenía 54 entradas: 2 que NUNCA existieron (`accounts`, `payroll_settlements`) y le faltaban 70 tablas reales — TODA la contabilidad (`chart_accounts`, `journal_entries/lines`, `accounting_rules`, `opening_balances`), TODA la tesorería, CRM (visitas/interacciones/metas), bodegas/traslados, producción, gestión comercial, encuestas y varias de nómina. Además `app_roles`/`app_modules`/`role_permissions` (SÍ estaban en la lista) llevaban desde julio sin aparecer en NINGÚN backup real — confirmado con SQL contra 5 backups históricos. Causa raíz doble: (1) el `catch {}` del bucle estaba vacío — cualquier fallo se tragaba en silencio, exactamente el mismo patrón ya corregido en otras 3 integraciones este mismo mes; (2) esas tres tablas son GLOBALES (sin `tenant_id`) pero se filtraban con `.eq('tenant_id', tenantId)` como las demás, columna que no existe → error descartado sin dejar rastro.
- **Fix, capa por capa**: (1) Lista de 115 tablas + 5 `GLOBAL_TABLES` corregida y verificada contra `schema-snapshot.json` real (0 nombres fantasma). (2) Columna nueva `tenant_backups.tables_skipped` (jsonb) + el `catch` ahora captura el error real y lo expone en `BackupObject.tables_skipped`, propagado a los inserts de `/api/backup` y `/api/cron/backup` (con notificación HIGH si algo falla) y a un badge en `BackupManager.tsx`. (3) **Hallazgo posterior, verificando con datos reales**: `fetchAllRows` (el helper compartido) se traga sus propios errores de PostgREST (solo `console.error`, nunca lanza) — así que el `catch` de arriba casi nunca se disparaba por errores REALES de columna/tabla, solo por excepciones síncronas raras. Se creó `fetchAllRowsStrict` (privado de `backupService.ts`, SÍ lanza) para que el backup pueda distinguir "tabla vacía" de "tabla que falló".
- **Con `fetchAllRowsStrict` en su lugar, la primera corrida real destapó 7 bugs más** (todos existían ya, silenciados desde siempre): `profiles` no tiene `tenant_id` (hay que filtrar por los `user_id` de `user_tenants`, no por la tabla misma); `product_stock`/`dian_config`/`po_number_sequences`/`transfer_number_sequences`/`currencies`/`taxpayer_types` no tienen columna `id` (llave compuesta o una fila por tenant/código) y el `.order('id')` fallaba siempre — nuevo `ORDER_OVERRIDES` por tabla; `warehouse_locations` no tiene `tenant_id` (se filtra por FK a `warehouses`, ahora en `CHILD_TABLE_PARENTS`); `purchase_order_lines` tenía la FK mal nombrada (`purchase_order_id` en vez de `order_id`, columna real). Y el hallazgo más tonto: el bucle iteraba solo `BACKUP_TABLES`, y `GLOBAL_TABLES` nunca se agregó a ese array — la rama `if (GLOBAL_TABLES.includes(tableName))` era código muerto, así que ni siquiera se intentaban esas 5 tablas hasta agregar `[...BACKUP_TABLES, ...GLOBAL_TABLES]` al `for`.
- **Verificación real**: ejecutada la lógica exacta de `collectTenantBackup` (solo lectura, sin cifrar/subir) contra la BD real de GVM vía script local con service role. Resultado final: 62 tablas con datos, 129.122 registros, **0 tablas saltadas**, gobernanza con datos reales (`app_roles`: 31, `app_modules`: 21, `role_permissions`: 439). Las ~54 tablas en 0 filas se confirmaron una por una contra SQL directo como vacías de verdad (módulos nuevos o sin uso aún: academy, presupuestos, activos fijos, contratos, tickets de soporte, logística), no errores.
- **`tenant_backups` estaba VACÍA en producción — investigado el mismo día, dos causas independientes, ambas corregidas**: (1) el bucket de Storage `backups` se creó (2026-03-06) con `allowed_mime_types = ['application/json']` para el formato viejo sin cifrar; el rediseño a `.gvm` (2026-07-04) subió a `contentType: 'application/octet-stream'` desde entonces, que Storage rechaza en silencio → CERO archivos subidos desde julio (confirmado: el último archivo real en el bucket era del 25 de marzo). Fix: `UPDATE storage.buckets SET allowed_mime_types = ARRAY['application/json','application/octet-stream']` (migración `20260926130000`). (2) Aparte, `/api/cron/backup` devolvía **401** en CADA invocación real de Vercel (`vercel-cron/1.0` sí llegaba, al deploy correcto) porque **`CRON_SECRET` nunca se configuró en Production** — el código exige `Authorization: Bearer ${CRON_SECRET}`, que Vercel solo agrega automáticamente si esa env var existe con ese nombre exacto. Sin ella, ninguna invocación pasaba de la primera línea de la función. Fix: variable creada + redeploy.
- **Verificado end-to-end en vivo**: tras ambos fixes, se disparó el cron manualmente desde Vercel (botón "Run" en Settings → Cron Jobs) y por invocación directa (`curl` con el `CRON_SECRET`) — 3 corridas seguidas exitosas para los dos tenants, `status: completed`, archivo subido, 0 tablas saltadas. Además se hizo un simulacro real de restauración: se replicó `/api/backup/analyze` (solo lectura, descifra + compara ids) contra un `.gvm` real descargado de Storage — 0 registros faltantes, confirma el ciclo completo cifrar→subir→descargar→descifrar→comparar con código de producción.
- **`GVM_BACKUP_KEY` es una Sensitive Environment Variable en Vercel** (candado 🔒 en vez de ojo 👁 en la UI) — su valor NO se puede volver a ver ni copiar una vez guardado así, ni por dashboard ni por API/CLI, por diseño. La única fuente que quedaba era `.env.local`; se verificó que SÍ coincide con la que usa el runtime real (se descifró con ella un `.gvm` generado por la app en producción) antes de guardarla en un gestor de contraseñas. Sin esa verificación, se pudo haber respaldado un valor obsoleto sin saberlo.
- **Aplicar en**: (1) Un `catch {}` vacío en cualquier integración "fire and forget" — patrón repetido 5 veces este mes (contabilización de inventario, alertas duplicadas ×2, backup ×2: subida a storage Y bucket mimetype). (2) Cualquier tabla que se filtre/pagine genéricamente asumiendo `tenant_id` + `id`: verificar columna por columna contra el esquema real — un helper "silencioso" (como `fetchAllRows`) es perfecto para UI pero PELIGROSO para algo que promete recuperación ante desastre; ahí se necesita una variante que LANCE. (3) Nunca declarar un fix de "cobertura completa" sin correr la lógica real contra datos reales, incluido el round-trip completo (subir Y descargar, cifrar Y descifrar) — cada capa (tablas, bucket, cron auth) escondía un bug distinto y solo aparecían una tras otra al probar de verdad. (4) Antes de dar por bueno un cron de Vercel, invocarlo manualmente ("Run" en Settings → Cron Jobs o `curl` directo) y leer el código de respuesta — un `vercel.json` con el cron bien escrito no garantiza que las invocaciones pasen la autenticación.

---

*Este archivo es el cerebro de la fábrica. Cada error documentado la hace más fuerte.*
