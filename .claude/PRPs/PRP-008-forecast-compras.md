# PRP-008: Forecast de Compras / Planeación de Demanda

> **Estado**: COMPLETADO — Fases 1–5 desplegadas (2026-10-07). Histórico de Viviana importado a producción (8.939 filas, ene–sep 2026). Falta solo la Fase 6 opcional (conexión con punto de reorden).
> **Acceso del comercial:** `/my-forecast` ("Mi Pronóstico", siempre visible); el gestor usa `/purchasing/forecast`.
> **Pendientes a validar con Julián:** (1) ABC por venta (Neto) vs. costo — hoy venta, configurable. (2) Mapear los 7 vendedores sin usuario (ex-comerciales ANA MARIA/LUISA/SIMON y 4 zonas vacantes) y marcar a Víctor y Miguel como "aparte" (is_separate). (3) ~17% de SKU del informe no están en el catálogo.
> **Fecha**: 2026-10-07
> **Proyecto**: GVM Corp ERP
> **Origen**: Reunión con Julián Martínez (Director de Compras y Comercio Exterior), 2026-10-07.

## Decisiones confirmadas por Julián (2026-10-07)

| # | Tema | Respuesta |
|---|------|-----------|
| 1 | Clasificación ABC | **A hasta 92%, B hasta 99%, y B también si el valor supera $600.000.** Cortes fijos de Julián. |
| 2 | Fuente del histórico | **El informe de ventas que genera Viviana a fin de cada mes**, que consolida la facturación de **WorldOffice**. NO es la base de la app. Ese informe trae comercial + cliente + producto + ventas. |
| 3 | Ventana | **6 meses móviles.** |
| 4 | Comerciales | Julián compartirá el listado; el informe de Viviana ya trae comercial↔cliente↔producto. |
| 5 | Van aparte | **Solo Víctor y Miguel** (fuera del consolidado general). |
| 6 | Sugerido al comercial | **Promedio de los 6 meses, editable** por el comercial si no le cuadra la cifra. |

> **⚠️ Cambio de diseño por la respuesta #2:** el histórico de ventas NO se calcula desde la base de datos de la app (las facturas reales están en WorldOffice durante la migración). Se **importa** del informe mensual de Viviana. El módulo deja de "leer la base" y pasa a tener un **importador mensual** como fuente del histórico. Esto reemplaza la propuesta original de cruzar `documents + parties.salesperson_id`. **Pendiente: ver un informe real de Viviana** para diseñar el importador (estructura de columnas).

---

## Objetivo

Reemplazar el proceso manual en Excel con el que Julián arma el forecast de compras: cada comercial ajusta mensualmente el pronóstico de unidades de SU portafolio (con el histórico de ventas ya cargado y clasificación ABC), y el sistema consolida automáticamente todos los pronósticos para la decisión de compra, midiendo además la precisión de cada comercial.

> **Importante:** esto NO es el "Forecast" del CRM (que proyecta oportunidades/deals por valor × probabilidad). Es planeación de **demanda de productos para comprar**. Va bajo **Compras**, no bajo CRM.

## Por Qué

| Problema | Solución |
|----------|----------|
| Julián arma todo a mano con BUSCARV y consolidación en Excel; le tomó 3 meses construirlo y cada mes lo actualiza manualmente. | El sistema carga el histórico solo y consolida automáticamente. |
| Los comerciales llenan un Excel distinto por persona (portafolio personalizado) y se lo mandan por correo. | Cada comercial ajusta su pronóstico en pantalla; el consolidado es inmediato. |
| No hay medición objetiva de qué tan bien pronostica cada comercial. | Precisión mensual: pronosticado vs. vendido real. |
| Cuando rota un comercial (ej. llegó Kevin), hay que reconstruir su histórico a mano buscando sus clientes. | El histórico se deriva de la cartera, así que se arma solo. |

**Valor de negocio**: compra mejor sustentada y más rápida, menos trabajo manual de Julián, y un argumento objetivo frente al comercial que sub-pronostica un producto que sí vende.

---

## ⚠️ Decisiones que necesito que confirmes antes de construir

Estas son decisiones de negocio que cambian el diseño. Las dejo priorizadas:

1. **Origen del histórico de ventas.** Las ventas en el sistema NO guardan el comercial; se ligan al comercial a través del **cliente** (`parties.salesperson_id`). La operación real de GVM son **pedidos** (`SALES_ORDER`) y remisiones, no facturas DIAN (que siguen en WorldOffice). Propongo calcular el histórico con los **pedidos aceptados + remisiones** de los clientes de cada comercial. ¿De acuerdo, o hay otra fuente que deba contar como "venta"?

2. **Rotación de comerciales (el reto que mencionó Julián).** Como la venta se liga al comercial vía el cliente, hay dos formas de ver el histórico:
   - **(A) Por cartera actual (dinámico):** el comercial ve el histórico de los clientes que tiene asignados HOY. Cuando a Kevin le pasan unos clientes, automáticamente "hereda" su histórico — resuelve el reto sin trabajo manual. Pero si un cliente se reasigna, su histórico se va completo con él y el comercial anterior deja de verlo.
   - **(B) Por quién facturó en su momento (fijo):** habría que empezar a guardar el comercial en cada venta de ahora en adelante; el histórico previo no lo tiene. Más fiel, pero no reconstruye el pasado.
   - **Recomiendo (A)**, que es justo como Julián lo arma hoy (busca los clientes de Kevin y trae su histórico). ¿Confirmas?

3. **Umbrales de la clasificación ABC.** El sistema ya calcula ABC con 80% / 95% (estándar). En tu Excel Julián usa **~92% para A, hasta 99% para B**, y además "B si el valor supera $600.000". ¿Qué umbral manda: el estándar del sistema, el de Julián, o lo dejamos **configurable** por GVM? Recomiendo configurable, con los valores de Julián por defecto.

4. **Ventana del histórico.** Julián usa 6 meses (abr–sep). Propongo **6 meses móviles** que avanzan solos cada mes. ¿Sirve 6, o prefieres otra ventana?

5. **Comerciales que van aparte.** Julián dijo que **Víctor y Miguel** se manejan separados ("no meterlos en la sopita"). ¿Los tratamos como un grupo aparte en el consolidado, o se configuran como comerciales normales y tú decides luego?

6. **Hasta dónde llega el módulo.** ¿El entregable es el **consolidado de pronósticos** (lista por producto, lista para que Julián compre, exportable), o quieres que además conecte con el **punto de reorden / inventario** para sugerir la cantidad a comprar (lo que hoy es su "Master Database Procurement")? Recomiendo **fase 1 = consolidado**, y dejar la conexión con reorden para una fase posterior, porque el master cruza inventario por bodega y es más complejo.

7. **Quién marca "puntual / no pedir".** En el Excel el comercial marca productos como "puntual" o pone cero para que no se compren. ¿Lo decide el comercial, o Julián quiere la última palabra sobre eso?

---

## Qué

### Criterios de Éxito
- [ ] El histórico de ventas por producto se carga automáticamente para cada comercial, sin BUSCARV manual.
- [ ] Cada comercial ve su portafolio (solo sus productos) con el histórico y ajusta el pronóstico del próximo mes.
- [ ] El comercial puede confirmar sin cambios, ajustar la cantidad, o marcar un producto como "puntual / no pedir".
- [ ] Cada producto queda clasificado A/B/C según las reglas acordadas.
- [ ] Julián ve el consolidado de todos los comerciales en un solo lugar, listo para comprar, y lo puede exportar.
- [ ] El sistema muestra la precisión del mes cerrado: pronosticado vs. vendido real, por comercial.
- [ ] Cuando cambia la cartera de un comercial, su histórico se ajusta solo (según la decisión #2).

### Comportamiento Esperado

**Mensual, el comercial**: entra a "Forecast de compras", ve su portafolio con las unidades vendidas de los últimos 6 meses por producto, su clasificación ABC y el pronóstico sugerido (por defecto, el promedio o el último mes). Ajusta lo que deba, marca lo puntual, y envía. Queda registrado qué pronosticó y cuándo.

**Mensual, Julián**: abre el período, ve quién ya envió y quién no, y consulta el **consolidado**: por producto, la suma de lo que todos los comerciales pronosticaron, con su ABC. Lo usa para comprar. Al cerrar el mes, el sistema compara lo pronosticado contra lo realmente vendido y muestra la precisión por comercial.

---

## Contexto

### Referencias de código (patrones y datos que ya existen)
- `src/features/inventory/services/abcAnalysisService.ts` — **ya calcula la lógica ABC/Pareto exacta** (acumulado, clases A/B/C). Se adapta para agrupar por comercial. No hay que reinventarla.
- `parties.salesperson_id` — vincula cada cliente a su comercial. Es la base de "ventas por comercial".
- `documents` (doc_type `SALES_ORDER`, `issue_date`, `party_id`) + `document_lines` (`product_id`, `qty`, `unit_price`) — el histórico de ventas. 2.629 documentos de venta hoy.
- `is_crm_manager()` / `crm_sales_targets` — patrón de "solo gerencia ve todo, el comercial ve lo suyo". Se reutiliza el criterio de visibilidad.
- `products` (`cost`) — precio de costo para valorizar y clasificar.
- `fetchAllRows` (`src/shared/lib/fetchAllRows.ts`) — paginar sin el tope de 1.000 filas de PostgREST (clave: hay miles de líneas de venta).

### Arquitectura Propuesta (Feature-First)

```
src/features/procurement-forecast/
├── components/
│   ├── SalesReportImporter.tsx    # Julián sube el informe mensual de Viviana (WO)
│   ├── MyForecastEditor.tsx       # el comercial ajusta su portafolio
│   ├── ForecastConsolidated.tsx   # Julián: consolidado para comprar
│   ├── ForecastAccuracy.tsx       # pronosticado vs. vendido
│   └── ForecastPeriodManager.tsx  # abrir/cerrar período mensual
├── services/
│   ├── salesReportImport.ts       # parsea el informe de Viviana (puro + tests)
│   ├── forecastAbc.ts             # ABC por comercial (puro + tests)
│   └── forecastService.ts
├── actions.ts
└── types/index.ts
```

Rutas bajo **Compras**: `/purchasing/forecast` (importar informe, consolidado y período, para Julián), y la vista del comercial para ajustar su portafolio (según rol, o `/purchasing/forecast/mine`). Entrada en el menú de Compras. Patrón de referencia: los importadores de WorldOffice ya existentes en `scripts/wo-import/` y el módulo `import`.

### Modelo de Datos Propuesto

```sql
-- Período mensual de forecast (uno por mes)
CREATE TABLE forecast_periods (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    year        int NOT NULL,
    month       int NOT NULL CHECK (month BETWEEN 1 AND 12),
    status      text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')),
    opened_by   uuid REFERENCES profiles(id),
    created_at  timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, year, month)
);

-- Línea de pronóstico: un producto, un comercial, un período
CREATE TABLE forecast_lines (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    period_id       uuid NOT NULL REFERENCES forecast_periods(id) ON DELETE CASCADE,
    salesperson_id  uuid NOT NULL REFERENCES profiles(id),  -- el comercial
    product_id      uuid NOT NULL REFERENCES products(id),
    abc_class       text CHECK (abc_class IN ('A','B','C')),
    suggested_qty   numeric,          -- lo que el sistema propone (histórico)
    forecast_qty    numeric,          -- lo que el comercial decide
    is_one_off      boolean NOT NULL DEFAULT false,  -- "puntual / no pedir"
    submitted_at    timestamptz,      -- NULL = aún no enviado
    note            text,
    UNIQUE (period_id, salesperson_id, product_id)
);

-- Histórico de ventas IMPORTADO del informe mensual de Viviana (WorldOffice).
-- Una fila por comercial × producto × mes. Es la fuente del promedio sugerido.
CREATE TABLE sales_history_import (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    year            int NOT NULL,
    month           int NOT NULL CHECK (month BETWEEN 1 AND 12),
    salesperson_id  uuid REFERENCES profiles(id),  -- resuelto desde el nombre del informe
    salesperson_label text,                         -- nombre tal cual viene del informe
    product_id      uuid REFERENCES products(id),   -- resuelto por código/nombre
    product_label   text,                           -- descripción tal cual viene
    qty             numeric NOT NULL DEFAULT 0,
    value_cop       numeric,
    imported_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, year, month, salesperson_label, product_label)
);
```

RLS: el comercial ve y edita solo sus `forecast_lines`; Julián y gerencia ven todo (criterio de `is_crm_manager()` o permiso de Compras). Importar y abrir/cerrar período: solo Julián/gerencia. Nada se sobrescribe tras cerrar el período.

**Cómo se arma el histórico** (reemplaza el BUSCARV manual de Julián): Julián sube el informe mensual de Viviana; el importador lo parsea y llena `sales_history_import` (comercial × producto × mes). El `suggested_qty` de cada `forecast_line` es el **promedio de los 6 meses** de ese producto para ese comercial (decisión #6), editable. El ABC se asigna con los cortes de Julián (92/99 + $600k).

**Cómo se maneja la rotación** (decisión #2): el comercial de cada venta viene **del propio informe de Viviana** (él trae comercial↔cliente↔producto desde WO). Así, cuando llega un comercial nuevo (caso Kevin), su histórico aparece en cuanto el informe lo refleje — sin reconstrucción manual en la app. La asignación de cartera de la app (`parties.salesperson_id`) no es la fuente aquí; manda el informe.

### Estructura real del informe de Viviana (analizada 2026-10-07)

Archivo: `INFORME DE VENTAS ... GENERAL.xlsx` (~23 MB). La hoja fuente es **`BASE`**: **94.122 filas, desde 2023**, una por línea de factura. Las hojas `Detail1..6` son caché de tablas dinámicas (ignorar). Columnas de `BASE`:

`Vendedor | Cliente | Zona | Linea de Negocio | Documento | AÑO | MES | Fecha1 | Descripción | Linea Producto | Clasificación | Cantidad | Promedio | Neto | % IVA | DSTO | Iva | ITotal`

Mapeo al importador:
- **Vendedor** → comercial (nombre completo, ej. "JOSE ALEXANDER CLAVIJO NIÑO"). Ver Apéndice: hay que mapear a los usuarios de la app.
- **Descripción** → producto, trae código + nombre ("MUCOL-028 MUCOLIPT…"); el código mapea a `products` por SKU.
- **Cantidad** → unidades (para el promedio y el forecast).
- **Neto** → valor COP (para el ABC con la regla de $600k).
- **AÑO / MES / Fecha1** → ventana de 6 meses.
- **Documento** ("FV ####") = factura de WorldOffice.

Consecuencia útil: el informe general **ya trae varios años**, así que con una sola carga el sistema tiene todo el histórico y filtra los 6 meses solo; no es obligatorio subir mes a mes (aunque Julián puede subir el del mes nuevo para actualizar).

---

## Blueprint (Assembly Line)

### Fase 1: Importador del informe de Viviana
**Objetivo**: Julián sube el informe mensual (WO) y el sistema lo parsea a `sales_history_import` (comercial × producto × mes), resolviendo comercial y producto, con tests sobre un informe real.
**Validación**: al importar un mes real, los totales cuadran contra el propio informe.

### Fase 2: ABC por comercial
**Objetivo**: clasificación A/B/C por portafolio de cada comercial, con umbrales configurables (`forecastAbc.ts` + tests).
**Validación**: el ABC de un comercial coincide con el de su Excel (Alexander o Kevin) dentro de lo razonable.

### Fase 3: Editor del comercial
**Objetivo**: pantalla donde el comercial ve su portafolio, ajusta el pronóstico, marca puntual y envía.
**Validación**: un comercial de prueba ajusta y envía; queda registrado qué y cuándo.

### Fase 4: Período y consolidado (Julián)
**Objetivo**: abrir/cerrar período, ver quién envió, y el consolidado por producto exportable.
**Validación**: con 2–3 comerciales que enviaron, el consolidado suma correctamente y exporta.

### Fase 5: Precisión del forecast
**Objetivo**: al cerrar el mes, pronosticado vs. vendido real por comercial.
**Validación**: contra un mes con ventas reales, la precisión calcula bien.

### Fase 6 (posterior, opcional): Conexión con punto de reorden
**Objetivo**: sugerir cantidad a comprar cruzando inventario por bodega (el "Master Database Procurement"). Solo si se aprueba la decisión #6.

### Fase 7: Validación final
- [ ] `npm run deploy` (preflight) + `security-reviewer` (tablas y acciones nuevas, datos de ventas sensibles)
- [ ] Prueba end-to-end con un comercial real y Julián

---

## Gotchas

- [ ] **La fuente es el informe de Viviana (WO), no la base** — mientras la facturación siga en WorldOffice, el histórico se importa, no se calcula. Cuando GVM termine de migrar la facturación a la app, se podrá cambiar la fuente al cálculo directo (los `documents`), y el módulo quedará más automático.
- [ ] **Resolver comercial y producto del informe** — el informe los nombra a su manera; hay que mapear a `profiles`/`products`. Lo que no mapee debe quedar visible (no tragarse en silencio), para que Julián lo corrija.
- [ ] **Reimportar el mismo mes** — debe reemplazar, no duplicar (índice único por mes + comercial + producto).
- [ ] **Umbral ABC de Julián** — 92/99 + regla de $600k (decisión #1), distinto del 80/95 del inventario. No confundir con el ABC de inventario.
- [ ] **Portafolio personalizado** — cada comercial ve SOLO sus productos (los que su histórico trae), no todo el catálogo.
- [ ] **Víctor y Miguel aparte** (decisión #5) — fuera del consolidado general.
- [ ] **Fechas date-only Bogotá** — `src/shared/lib/dateFmt.ts`, no UTC.

## Anti-Patrones
- NO reutilizar el CRM de oportunidades ni su tabla `opportunities` para esto.
- NO mostrarle a un comercial el portafolio o los números de otro.
- NO tragarse en silencio las filas del informe que no mapeen a un comercial o producto conocido: mostrarlas para corregir.
- NO dar por bueno el parser sin probarlo contra un informe real de Viviana.

---

## Apéndice — mapeo de vendedores (RESUELTO con Julián, 2026-10-07)

1. **Nombre del vendedor ≠ usuario de la app** → **aprobado:** el sistema cruza automáticamente el nombre del informe con el usuario y le muestra a Julián los que no cuadren para confirmarlos una vez; el mapeo queda guardado.

2. **"Vendedores" que son zonas/áreas** → son **ventas de posiciones vacantes** (aún sin comercial asignado). Cuando se llene la vacante, el comercial que cubra esa zona **hereda ese histórico** (se mapea la zona a ese comercial). **"GERENCIA DE VENTAS" = Gerardo Bolívar.** Mientras una zona siga vacante, su histórico queda sin dueño pero disponible para heredar.

**Solución unificada:** una tabla de **alias de vendedor** (texto del informe → comercial de la app) cubre los tres casos: nombres de personas, "GERENCIA DE VENTAS"→Gerardo, y "ZONA X"→el comercial que la cubra (o sin asignar mientras esté vacante). Julián confirma/edita estos alias una vez y quedan guardados; es el mismo mecanismo del punto 1.

```sql
CREATE TABLE forecast_salesperson_aliases (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    report_label    text NOT NULL,                 -- "JOSE ALEXANDER...", "ZONA CENTRO...", "GERENCIA DE VENTAS"
    salesperson_id  uuid REFERENCES profiles(id),  -- NULL = vacante (sin dueño todavía)
    is_separate     boolean NOT NULL DEFAULT false, -- Víctor y Miguel: fuera del consolidado general
    UNIQUE (tenant_id, report_label)
);
```

Diseño cerrado.

---

*PRP con diseño cerrado y todas las decisiones confirmadas. Listo para aprobación de Fernando y construcción de la Fase 1. No se ha modificado código.*
