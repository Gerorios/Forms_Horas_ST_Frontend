# Rediseño visual y de navegación con tono ERP

- **Fecha**: 2026-08-25
- **Estado**: propuesto, pendiente de aprobación del usuario
- **Alcance**: Frontend (Next.js) — sin cambios de backend ni de modelo de datos
- **Autor de la decisión**: Gerorios (product owner) + Claude (facilitación del diseño vía brainstorming)

## 1. Contexto y motivación

La app "Formulario Horas" viene creciendo módulo a módulo (Liquidación, Novedades, Control general, Combustible, Admin, etc.) hacia lo que el usuario y Rodrigo definieron explícitamente como objetivo: **un ERP a medida**. El diseño visual y de navegación actual (sidebar angosta de íconos, paleta cálida arena/dorado apagado, densidad de tabla estándar) fue pensado para una app más chica y no comunica ese tono. Este spec cubre exclusivamente el **rediseño visual y de navegación**; no toca el acoplamiento de datos entre módulos (ver sección 8).

El proceso de diseño se hizo con la skill de brainstorming (camino arquitectónico) usando el Visual Companion para las decisiones puramente visuales (layout, tiles, paleta, densidad de tabla) y preguntas en texto para las decisiones de alcance/estrategia.

## 2. Decisiones visuales (validadas con mockups)

### 2.1 Navegación general

Se reemplaza la sidebar angosta de íconos (siempre visible, sin agrupar módulos) por:

- Una **pantalla de inicio ("home launcher")** en `/`, con un tile grande por módulo (Liquidación, Novedades, Control general, Combustible, Admin).
- Una **barra superior fina** (logo, buscador simple, usuario) — sin sidebar persistente.
- Dentro de cada módulo, la navegación interna es por **pestañas/breadcrumb** arriba del contenido — el mismo patrón que Liquidación ya usa hoy dentro de `quincena/`.

Referencia visual: mockup `layout-shell.html`, opción **C**.

### 2.2 Estilo de los tiles del home

Cards suaves estilo SaaS moderno: fondo `surface`, bordes redondeados, sombra suave, ícono grande centrado, sin KPIs ni alertas embebidas en el tile (se descartó el estilo denso tipo SAP Fiori y el estilo lista/consola de admin).

Referencia visual: mockup `home-tiles.html`, opción **B**.

### 2.3 Paleta de color

Paleta extraída por análisis de píxeles del logo real (`public/logo.png`), no inventada:

| Token | Valor | Uso |
|---|---|---|
| Base/neutro | `#788080` (gris) | textos secundarios, elementos neutros, sidebar-equivalentes si quedan |
| Acento de marca (único) | `#E8B030` (dorado) | botones primarios, íconos activos, bordes de énfasis, elementos de marca |
| Fondo | blanco puro / `#f8f8f8` | superficies |

Se descartaron: paleta corporativa azul marino + gris (opción A, "genérica") y la paleta arena/dorado apagado actual refinada (opción B) — el usuario prefirió fidelidad exacta al logo real en vez de mantener el dorado más oscuro (`#a97a16`) que usa hoy la app.

Referencia visual: mockup `paleta-logo.html`, opción **D**.

### 2.4 Densidad de tablas

Se mantiene la densidad **actual** (padding cómodo, línea divisoria solo debajo de cada fila) — se descartó explícitamente la opción de tabla compacta tipo "planilla" (filas finas, bordes en todas las celdas, ~40% más filas por pantalla). El tono ERP se logra por paleta/estructura, no por comprimir la información.

Referencia visual: mockup `densidad-tabla.html`, opción **A**.

## 3. Alcance técnico: qué es global y qué se pilotea

Investigación del código actual (`src/app/globals.css`, `src/components/layout/app-shell.tsx`) mostró dos restricciones estructurales:

- **La paleta** vive en CSS custom properties centralizadas en `globals.css` (~15 líneas: `--color-brand`, `--color-brand-deep`, `--color-ink`, `--color-slate`, `--color-line`, `--color-sand`, `--color-surface`, mapeo shadcn). Prácticamente no hay color hardcodeado fuera de ese archivo (solo colores de gráficos, ya centralizados aparte).
- **El shell de navegación** (`AppShell`) se monta una sola vez, globalmente, desde `src/app/(protected)/layout.tsx` — envuelve todas las rutas protegidas.

Por construcción, **ninguno de los dos se puede pilotear parcialmente** sin duplicar código a propósito (shell condicional por ruta, o tokens con override scopeado). Dado que ambos son cambios baratos y de bajo riesgo (un archivo de tokens, un componente de layout), la decisión es:

- **Paleta y shell nuevo se aplican a TODA la app de una sola vez.**
- El **piloto real** es el rediseño de página-por-página del módulo **Liquidación** (el más grande y más usado): se ajustan bordes, sombras, espaciados y estructura de sus 6 páginas (`page.tsx`, `tarifas/`, `perfiles/`, `analisis/`, `quincena/`, `quincena/detalle/`) para que se sientan "herramienta de trabajo ERP" con la paleta/shell/densidad ya definidos arriba.
- El resto de los módulos (Novedades, Control general, Combustible, Admin) hereda automáticamente la paleta y el shell nuevo, pero **no** se rediseña su estructura interna en este spec — quedan visualmente consistentes (misma paleta, mismo shell) pero sin el ajuste fino de layout que sí recibe Liquidación.

## 4. Componentes afectados

- `src/app/globals.css` — tokens de color (`@theme` inline, Tailwind v4).
- `src/components/layout/app-shell.tsx` — reemplazado por un nuevo shell (topbar + home launcher).
- `src/app/(protected)/layout.tsx` — usa el nuevo shell en vez de `AppShell`.
- Nuevo: componente de home launcher (tiles por módulo) — vive en `/` dentro de `(protected)`.
- `src/app/(protected)/liquidacion/**` — las 6 páginas existentes, ajustes de layout/spacing/bordes (no de lógica ni de datos).

No se tocan: lógica de negocio, llamadas a la API, esquema de Prisma, ningún módulo backend.

## 5. Manejo de errores

No aplica — es un cambio puramente de presentación. No hay nuevos flujos de error; los estados de carga/error existentes (loading, empty state, error de fetch) se preservan tal cual, solo con el estilo visual nuevo.

## 6. Testing

- Cambios de CSS/JSX de layout — no se agregan tests nuevos de lógica.
- Se revisan y ajustan los tests existentes que dependan de estructura DOM o textos que cambien (por ejemplo, si algún test busca un ítem de la sidebar actual por rol/texto, o si `control-general-page.test.tsx`/otros asumen la presencia del `AppShell` actual).
- Se corre el suite completo de Vitest antes de mergear cada PR de esta iniciativa.

## 7. Plan de rollout (alto nivel, se detalla en el implementation plan)

1. PR 1: tokens de paleta nueva en `globals.css` (global, bajo riesgo, reversible con un revert de 1 archivo).
2. PR 2: nuevo shell (topbar + home launcher) reemplazando `AppShell` (global).
3. PR 3+: rediseño página por página de Liquidación (piloto), en PRs chicos por página para poder revisar y revertir de forma acotada.
4. Evaluación con el usuario tras el piloto: decidir si se replica el ajuste de layout al resto de módulos, y en qué orden.

## 8. Fuera de alcance (explícitamente)

- El acoplamiento de datos de Liquidación con `registroHoras`/`novedad` (lectura directa de tablas de otros módulos en vez de una interfaz propia) — es un problema de arquitectura de datos discutido en la misma conversación, pero es independiente de este rediseño visual y queda para un spec propio.
- Rediseño de página interna de Novedades, Control general, Combustible o Admin — solo heredan paleta/shell, sin ajuste de layout en este spec.
- Cualquier cambio de modelo de datos, endpoints o lógica de cálculo.
