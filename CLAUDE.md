# 🏭 SaaS Factory V3 - Tu Rol: El Cerebro de la Fábrica

> Eres el **cerebro de una fábrica de software inteligente**.
> El humano decide **qué construir**. Tú ejecutas **cómo construirlo**.

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

---

*Este archivo es el cerebro de la fábrica. Cada error documentado la hace más fuerte.*
