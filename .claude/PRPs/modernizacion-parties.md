# PRP: Modernización del Directorio de Terceros (Fábrica V3)

> **Estado**: 📝 Propuesta | **Prioridad**: 🔥 Alta | **Estética**: Cybertruck Industrial

## 🎯 Objetivo
Transformar el módulo de Terceros (`Parties`) de una interfaz de gestión simple a un **Centro de Comando de Identidades**. Elevaremos la visualización de clientes y proveedores usando el stack perfeccionado de la Fábrica V3.

## 🛠️ Alcance Técnico

### 1. `PartyList.tsx` (Panel de Control)
- **Header "Impact"**: Títulos en `font-black` itálica con iconografía de fondo sobredimensionada.
- **Micro-interacciones**: Transiciones suaves entre modo Grid y Tabla.
- **Filtros Avanzados**: Rediseño de los dropdowns con estética de vidrio (glassmorphism) y sombras premium.

### 2. `PartyTable.tsx` (Registro Industrial)
- **Bordes Cybertruck**: Aplicar `rounded-[3rem]` y `shadow-premium`.
- **Tipografía Técnica**: Uso intensivo de `font-mono` para NITs y teléfonos, con tracking ajustado.
- **Badges Evolucionados**: Indicadores de "Cliente" y "Proveedor" con gradientes sutiles y bordes industriales.

### 3. `PartyForm.tsx` (Ingreso de Datos de Precisión)
- **Layout de "Pods"**: Agrupar campos en bloques lógicos con sombreado interno.
- **Validación Visual**: Feedback en tiempo real para el cálculo del DV y validación de campos obligatorios.
- **Botón de Acción Final**: Transformar el botón de "Guardar" en una pieza central de alta fidelidad.

## 🎨 Design Tokens (Premium Light)
- **Colores**: Slate 900 (Primario), Indigo 500 (Acento Técnico), Amber 500 (Natural), Emerald 500 (Success).
- **Redondeado**: `3rem` para contenedores principales, `1.5rem` para elementos internos.
- **Sombras**: `shadow-premium` (suave y dispersa) + `shadow-active` para interacciones.

## 🚀 Fases de Ejecución
1. **Fase 1**: Modernización de `PartyList.tsx` y Header Global.
2. **Fase 2**: Refactorización de `PartyTable.tsx` (Filas y Celdas).
3. **Fase 3**: Rediseño de `PartyForm.tsx` y UX de Registro.
