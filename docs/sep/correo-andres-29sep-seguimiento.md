Asunto: GVM ERP — diagrama de estructura + pendientes tras la reunión del 29-sep

Andrés, buen día.

Como quedamos, adjunto el diagrama detallado de cómo está hoy la estructura de productos ↔ contabilización en el ERP (ventas, ya en simulación, y compras, con las reglas y tarifas que me diste ya cargadas). Incluye también las cifras reales del sistema para que tengas contexto al revisarlo.

Con eso ya armado, te pido lo siguiente para seguir avanzando:

1. **Devoluciones al Exterior con IVA (19% y 5%)**: en tu matriz de compras no hay fila para estos dos casos (sí la hay para Exterior en 0%). ¿Cómo debería quedar esa devolución — mismas cuentas que la devolución nacional, o algo distinto por ser Exterior?

2. **La tabla de contabilización automática por cuenta de gasto** (honorarios, servicios, etc. — la que mencionaste que ibas a exportar de World Office, más allá de las compras de inventario). Cuando la tengas, me ayuda mucho para completar el motor de compras del lado de gastos.

3. **El detalle de las diferencias** que encontraste en tu revisión de la simulación contra World Office (la que hiciste tercero por tercero) — con eso reviso si son de parametrización de mi lado o de datos.

4. Cuando tengas un espacio, revisa el diagrama adjunto y dime si la forma en que estoy vinculando producto → tarifa de IVA → reglas → cuentas del PUC tiene sentido desde tu lado, o si hay algo que ajustar antes de seguir construyendo.

Con el diagrama y estos 4 puntos ya tendría todo lo que necesito para cerrar la Fase de compras y seguir con el cronograma que dejamos armado para octubre.

Gracias, quedo atento.

Fernando
