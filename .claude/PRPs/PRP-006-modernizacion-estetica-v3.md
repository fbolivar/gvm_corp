# PRP-006: Modernización Estética (Factory V3) - Módulos Core

> **Estado**: ✅ COMPLETADO
> **Fecha**: 2026-02-25
> **Proyecto**: SaaS Factory V3 - GVM Corp

---

## Objetivo

Transformar visualmente los módulos funcionales existentes (Terceros, Compras, Ventas, Tesorería y CRM) al nuevo estándar de diseño "Premium Light / Industrial" introducido en la Fábrica V3. Esto implica la aplicación sistemática de bordes redondeados grandes (`rounded-[3rem]`, `rounded-full`), sombras profundas (`shadow-premium`), tipografía itálica y uppercase para títulos técnicos, e iconos y layout modernos.

## Por Qué

| Problema | Solución |
|----------|----------|
| Inconsistencia visual. Los módulos antiguos lucen como plantillas estándar (boring B2B), contrastando severamente con las nuevas interfaces premium como el Agente de Cartera o el Dashboard principal. | Crear una cohesión estética total en todo el ERP. Un diseño uniforme eleva dramáticamente la percepción de valor del producto. |

**Valor de negocio**: Aumenta la adopción del usuario, reduce la carga cognitiva mediante consistencia visual y posiciona el software a la altura de un producto top-tier a nivel global.

## Qué

### Criterios de Éxito
- [x] El módulo de "Terceros" es refactorizado a "Centro de Comando de Identidades" usando un layout de grid asimétrico, cards redondeadas y blur effects.
- [x] El módulo de "Compras" (Dashboard y Lista de Facturas) adopta tarjetas `shadow-premium` y avatares/badges modernos.
- [x] Los formularios y tablas de "Ventas" y "Tesorería" abandonan esquinas cuadradas y grises planos por `bg-white/50`, borders ultra-suaves e inputs `rounded-2xl`.
- [x] El CRM (Embudo de Ventas) utiliza drag-and-drop cards con animaciones de elevación (`animate-float`, `hover:scale-105`) y glassmorphism.

### Comportamiento Esperado
No hay cambios drásticos en la lógica de negocio detrás de escena. El CRUD de la base de datos (Supabase) sigue funcionando, pero la envoltura (JSX y Tailwind) se reescribe. Las interfaces se sentirán espaciosas, dinámicas y lujosas, priorizando "White Space" y fuentes súper legibles con pesos "Black" e "Italic" para encabezados.

---

## Contexto

### Referencias
- `src/features/portfolio/components/DebtorRiskMatrix.tsx` - Ejemplo ideal de uso de colores Semánticos y UI Premium.
- `src/app/(public)/portal/pago/[id]/page.tsx` - Ejemplo perfecto de espaciado, uso de `<Card>`, `<Badge>`, iconografía y gradientes sutiles.

### Arquitectura Propuesta (Feature-First)
La arquitectura de archivos ya existe. Principalmente modificaremos componentes `.tsx` dentro de:
```
src/features/parties/components/
src/features/purchasing/components/
src/features/sales/components/
src/features/treasury/components/
src/features/crm/components/
```

---

## Blueprint (Assembly Line)

> IMPORTANTE: Solo definir FASES. Las subtareas se generan al entrar a cada fase
> siguiendo el bucle agéntico (mapear contexto → generar subtareas → ejecutar)

### ✅ Fase 1: Centro de Comando de Identidades (Terceros) (COMPLETADO)
- **Dashboard de Terceros**: Título actualizado a "Centro de Identidades" y "Comando de Identidades".
- **Formulario de Detalle**: Envoltura de contenedores modernizada (`pb-20`), eliminado estilos legacy (`container mx-auto py-6 max-w-2xl`).
- **Sistema de Alertas**: Migración finalizada de `alert()` a `toast.error()` usando Sonner.

### ✅ Fase 2: Compras Premium (COMPLETADO)
**Objetivo**: Confirmar o rediseñar el Dashboard de Compras y la lista de documentos de proveedores (Invoices/PO).
**Validación**: Las tablas e indicadores estadísticos lucen esféricos, sombras altas y badges estilizados. Integrado el estilo `Premium Light / Industrial` en todo el módulo. Funciones de autorizar no se interrumpen.

### ✅ Fase 3: Ventas y Tesorería UI Sync (COMPLETADO)
**Objetivo**: Traer la gestión de Flujo de Caja y Pipeline de Ventas al estándar visual actual.
**Validación**: Inputs, DataTables y Botones de acción lucen idénticos a los estándares de la App V3. Totalmente implementado.

### ✅ Fase 4: CRM Funnel & Leads (COMPLETADO)
**Objetivo**: Convertir el prospect/lead tracker actual en un tablero "Kanban / Glassmorphism" interactivo.
**Validación**: El embudo fluye visualmente sin lag, usando animaciones y colores vibrantes. Tablero Kanban totalmente modernizado.

### ✅ Fase 5: Validación Final de Frontend (COMPLETADO)
**Objetivo**: Sistema funcionando end-to-end con 100% consistencia visual.
**Validación**:
- [x] `npm run typecheck` pasa sin errores
- [x] Navegación limpia entre módulos sin saltos de layout ("Layout Shift"). Completada transición hacia el estilo Premium V3.

---

## 🧠 Aprendizajes (Self-Annealing / Neural Network)

### [YYYY-MM-DD]: [Título del aprendizaje]
- **Error**: [Qué falló]
- **Fix**: [Cómo se arregló]
- **Aplicar en**: [Dónde más aplica este conocimiento]

---

## Gotchas

> Cosas críticas a tener en cuenta ANTES de implementar

- [ ] Cuidado con modificar prop-types de componentes en capas "shared" que rompan otras áreas. Modificaremos preferiblemente la composición local de cada feature.
- [ ] Mantener la responsividad: Cuidado con márgenes horizontales agresivos o radios grandes (`3rem`) en pantallas de móvil.

## Anti-Patrones

- NO usar Tailwind v4, mantenernos estrictamente en Tailwind CSS 3.4
- NO introducir nuevas dependencias de styling (ej. Framer Motion) si podemos lograrlo con CSS/Tailwind (`transition-all duration-500`).
- NO cambiar la estructura JSON/Types compartidos con la base de datos para temas puramente estéticos.

---

*PRP pendiente aprobación. No se ha modificado código.*
