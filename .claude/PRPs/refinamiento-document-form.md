# PRP: Refinamiento Industrial del Standard DocumentForm (V3)

> **Estado**: ✅ COMPLETADO
> **Fecha**: 2026-02-27

Refactorización del componente maestro `DocumentForm.tsx` para alinearlo con la estética **Cybertruck Industrial (Premium V3)**, optimizando tanto la experiencia visual como la jerarquía de información para documentos comerciales (Ventas y Compras).

## 🎯 Objetivos
- **Unificación Estética**: Aplicar el lenguaje visual de la "SaaS Factory V3" (redondeos extremos, sombras premium, headers oscuros).
*   **Claridad Operativa**: Mejorar la visualización de líneas de ítems y la sección de totales.
*   **Micro-interacciones**: Añadir transiciones refinadas en la adición/eliminación de ítems y validaciones de stock.

## 🏗️ Especificaciones de Diseño

### 1. Header Maestro "Industrial Pod"
*   **Fondo**: `bg-slate-900` para impacto inmediato.
*   **Iconografía**: Contenedores de iconos con efectos de brillo y rotación en hover.
*   **Tipografía**: Uso de itálicas negras y espaciado de tracking aumentado para descripciones técnicas.

### 2. Componentes de Entrada "Industrial Tech"
*   **Selectores e Inputs**: Reemplazar bordes estándar por fondos `bg-slate-50` con sombras `shadow-inner` y efectos de focus con anillos de color temático (Blue para Ventas, Emerald para Compras).
*   **Bordes**: `rounded-[2.5rem]` para inputs principales y `rounded-[1.5rem]` para selectores de línea.

### 3. Tabla de Ítems Ultra-Moderna
*   **Header de Tabla**: Fondo suave con tipografía en bloque (`font-black`, `uppercase`, tracking extremo).
*   **Fila de Ítems**: Espaciado aumentado, sombras en hover y mejores indicadores de alerta de stock.
*   **Acciones**: Botones de basura y adición con micro-interacciones de escala.

### 4. Card de Totales "Final Result"
*   **Estética**: Fondo `slate-900` con gradientes sutiles y un icono de calculadora gigante en marca de agua.
*   **Tipografía**: Números en formato `font-mono` itálico para enfatizar la precisión matemática.

## 🛠️ Tecnologías
- **React Hook Form + Zod** (Mantenido)
- **Tailwind CSS V3.4** (Refinado)
- **Lucide React** (Iconografía ampliada)

## 📋 Plan de Ejecución
1.  **Fase 1**: Refactorización del Header y Información General.
2.  **Fase 2**: Rediseño de la sección de "Items & Servicios" y Tabla de Líneas.
3.  **Fase 3**: Pulido de la sección de Totales y acciones de envío.
4.  **Fase 4**: Validación visual y testing de responsividad.
