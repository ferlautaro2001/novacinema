# NovaCinema - 2026

<p align="center">
  <img src="public/novacinema-logo.png" width="300" alt="Logo de NovaCinema: pochoclera a rayas con claqueta y marquesina dorada"/>
</p>

> **Primer Trabajo Práctico Programación IV - UTN**
>
> **Repositorio:** `novacinema`

Sistema de gestión integral de un cine: cartelera, venta de entradas online, selección de
butacas, candy bar, boletería con validación de QR, fidelización con Nova Points y panel de
administración con facturación y estadísticas.

---

## Integrantes y Backlog

La planificación, las épicas, las historias de usuario y sus criterios de aceptación se
gestionan centralizadamente en GitHub:

- **Gestión de incidencias & user stories:** [Issues del repositorio](https://github.com/ferlautaro2001/angular-p1/issues)
- **Épicas como hitos:** [Milestones](https://github.com/ferlautaro2001/angular-p1/milestones)

| Integrante                              | Rol               |
| :-------------------------------------- | :---------------- |
| **Fernandez Di Bella, Lautaro Alfredo** | Líder de Proyecto |

### Estado del backlog

262 issues abiertas: 12 épicas, 79 historias de usuario y 171 criterios de aceptación,
repartidas en 12 milestones.

```text
┌────────────────────────────────────────────┬────────┐
│                 Milestone                  │ Issues │
├────────────────────────────────────────────┼────────┤
│ EP-01 Infraestructura base y design system │ 29     │
├────────────────────────────────────────────┼────────┤
│ EP-02 Identidad, autenticación y sesión    │ 22     │
├────────────────────────────────────────────┼────────┤
│ EP-03 Catálogo de películas                │ 19     │
├────────────────────────────────────────────┼────────┤
│ EP-04 Salas, funciones y programación      │ 24     │
├────────────────────────────────────────────┼────────┤
│ EP-05 Precios, preventa y cupones          │ 16     │
├────────────────────────────────────────────┼────────┤
│ EP-06 Cartelera y descubrimiento           │ 26     │
├────────────────────────────────────────────┼────────┤
│ EP-07 Compra de entradas online            │ 30     │
├────────────────────────────────────────────┼────────┤
│ EP-08 Candy bar                            │ 17     │
├────────────────────────────────────────────┼────────┤
│ EP-09 Boletería y control de acceso        │ 19     │
├────────────────────────────────────────────┼────────┤
│ EP-10 Nova Points                          │ 24     │
├────────────────────────────────────────────┼────────┤
│ EP-11 Cuenta del cliente y post-compra     │ 20     │
├────────────────────────────────────────────┼────────┤
│ EP-12 Panel de administración              │ 16     │
└────────────────────────────────────────────┴────────┘
```

---

## Tech Stack

<p align="left">
  <img src="https://img.shields.io/badge/Angular-DD0031?style=flat-square&logo=angular&logoColor=white" alt="angular"/>
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="supabase"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="typescript"/>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="postgresql"/>
  <img src="https://img.shields.io/badge/Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white" alt="vitest"/>
  <img src="https://img.shields.io/badge/RxJS-B7178C?style=flat-square&logo=reactivex&logoColor=white" alt="rxjs"/>
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" alt="html5"/>
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" alt="css3"/>
</p>

- **Framework & UI:** Angular 22 (standalone components, sin NgModules) y CSS propio sobre los tokens del design system NovaCinema
- **Backend & autenticación:** Supabase (`@supabase/supabase-js` 2) — Postgres, Auth y Row Level Security
- **Lenguajes & estilos:** TypeScript 6, HTML5, CSS3 con los tokens en `src/styles/tokens.css`
- **Tipografías:** Anton, Figtree e IBM Plex Mono (Google Fonts)
- **Documentos y códigos:** `jspdf` (entradas y reportes en PDF), `write-excel-file` (reportes en Excel), `angularx-qrcode` (QR de entradas y productos)
- **Testing:** Vitest + jsdom (`ng test`)
- **Formato:** Prettier

---

## Índice Visual de Pantallas

Las capturas de los flujos y componentes se van a indexar en el directorio `visuals/` a medida
que cada épica se implemente.

| Pantalla                     | Épica | Descripción                                                     |    Captura    |
| :--------------------------- | :---: | :-------------------------------------------------------------- | :-----------: |
| **Login y registro**         | EP-02 | Ingreso, alta de cuenta y recuperación de contraseña.           | _A completar_ |
| **Cartelera**                | EP-06 | Grilla de películas en cartel con filtros y destacadas.         | _A completar_ |
| **Detalle de película**      | EP-06 | Sinopsis, géneros, restricción de edad y funciones disponibles. | _A completar_ |
| **Selector de fecha y hora** | EP-01 | Elección rápida de función, sin datepicker de calendario.       | _A completar_ |
| **Mapa de butacas**          | EP-07 | Sala de 518 butacas con VIP, accesibles y pasillos.             | _A completar_ |
| **Checkout y entrada QR**    | EP-07 | Pago, confirmación y entrada con código QR.                     | _A completar_ |
| **Candy bar**                | EP-08 | Catálogo de productos y combos.                                 | _A completar_ |
| **Boletería**                | EP-09 | Venta presencial y validación de QR.                            | _A completar_ |
| **Mi cuenta**                | EP-11 | Perfil, compras, crédito y Nova Points.                         | _A completar_ |
| **Panel de administración**  | EP-12 | Facturación, gráficos y log de actividad.                       | _A completar_ |

---

## Estructura del Proyecto

```
novacinema/
├── public/                     # Assets estáticos (logo, favicon)
├── src/
│   ├── app/
│   │   ├── core/               # Núcleo no visual
│   │   │   ├── auth/           # Sesión y roles
│   │   │   ├── data/           # Acceso a datos
│   │   │   ├── documentos/     # PDF y Excel
│   │   │   ├── guards/         # Guards de ruta
│   │   │   ├── models/         # Tipos del dominio
│   │   │   ├── reglas/         # Reglas de negocio puras (precios, puntos, butacas…)
│   │   │   └── supabase/       # Cliente de Supabase
│   │   ├── features/           # Una carpeta por área funcional
│   │   │   ├── admin/  auth/  boleteria/  candy/
│   │   │   ├── cartelera/  compra/  cuenta/
│   │   │   └── no-encontrado/
│   │   ├── layout/             # Encabezado, navegación, pie, notificaciones, carga
│   │   └── shared/             # UI reutilizable, directivas, pipes, validadores
│   ├── environments/           # Configuración por entorno
│   ├── styles/                 # base.css, tema-claro.css, impresion.css
│   └── styles.css              # Importa los tokens y los estilos globales

```

Componentes de UI en `src/app/shared/ui/`: `auth-card`, `badge`, `boton`, `campo-numero`,
`campo-select`, `campo-texto`, `cargando`, `codigo-qr`, `estado-vacio`, `estrellas`,
`flip-card`, `grafico-barras`, `mapa-butacas`, `mensaje`, `modal`, `pelicula-card`, `portada`,
`push-button`, `selector-fecha`, `selector-hora`, `stat-tile`.

---
