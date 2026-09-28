# Central SER&TEC — Frontend

Interfaz web del sistema interno de Sertec: carga y aprobación de horas del personal
de obra, novedades y ausencias, liquidación, combustible, km por tantos y
certificaciones por contrato. Se usa desde escritorio y desde el celular en campo.

Stack: Next.js 16 (App Router), React 19, TanStack Query, shadcn/base-ui, Tailwind 4,
Recharts, react-hook-form + Zod. Tests con Vitest y Testing Library.

El backend (NestJS + Prisma) vive en el repo `Backend`. **Toda la documentación del
sistema está ahí**: glosario (`CONTEXT.md`), bitácora
(`.claude/Contexto/contexto-proyecto.md`), ADRs, planes y documentos de deploy en `docs/`.

## Levantar en local

Necesita el backend corriendo (por defecto en `http://localhost:3001`).

```bash
cp .env.example .env.local   # ajustar NEXT_PUBLIC_API_URL si hace falta
npm install
npm run dev
```

Abre en [http://localhost:3000](http://localhost:3000).

`NEXT_PUBLIC_API_URL` se hornea en el bundle del cliente en el build: si cambia, hay
que volver a buildear.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build y servidor de producción |
| `npm test` | Suite completa con Vitest (`npm run test:watch` en modo watch) |
| `npm run lint` | ESLint |

## Estructura

- `src/app/` — rutas. Las protegidas van bajo `(protected)/`, agrupadas por área
  (Operación, Personas, Resultados operativos, Administración). `login/` y `403/` afuera.
- `src/features/` — componentes y hooks por módulo (reporte, aprobaciones, liquidación,
  combustible, certificaciones, admin, etc.).
- `src/components/` — layout y componentes de UI compartidos (shadcn).
- `src/lib/` — cliente HTTP (`api/`), sesión (`auth/`) y utilidades.
- `src/types/` — tipos compartidos con la API.

## Reglas de trabajo

Están en `CLAUDE.local.md`: mostrar un mockup antes de tocar UI, mostrar el cambio antes
de commitear, nunca deployar sin pedido explícito, y los dos repos van juntos (un cambio
de API se deploya con su par en el Backend).
