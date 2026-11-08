# TP Final — Aplicación web completa

> Programación III · UMAI
> Tema libre · Next.js · Firebase / PostgreSQL · Vercel

## Descripción

Desarrollar una aplicación web completa, de tema y tipo a elección, que integre lo trabajado durante la cursada.

El tipo de proyecto es libre: SaaS, ecommerce, experiencia experimental o transmedia, red social de nicho, herramienta interna, plataforma de contenido, etc. Puede retomar y extender un TP anterior o ser una idea nueva.

El resultado debe ser una aplicación funcional, publicada y con un nivel de terminación que permita usarla en producción en el futuro. No se busca cantidad de pantallas, sino una app coherente, bien resuelta y que demuestre lo aprendido.

## Objetivo

Diseñar, desarrollar y publicar una aplicación web propia que:

- Resuelva un problema o proponga una experiencia concreta para un usuario definido.
- Integre frontend, autenticación, persistencia de datos y deploy.
- Aplique los conceptos de React y Next.js vistos en clase.
- Pueda ser explicada y defendida técnicamente por quien la desarrolló.

## Benchmark

Antes de programar, cada estudiante debe analizar entre **2 y 3 productos existentes** similares a su propuesta y documentar en el README:

- Nombre y enlace de cada referencia.
- Qué problema resuelven y para quién.
- Funcionalidades principales.
- Qué se toma como referencia (flujo, navegación, diseño, modelo de datos).
- Qué diferencia a la propuesta propia.

Referencias posibles según el tipo de proyecto:

| Tipo | Referencias |
| --- | --- |
| SaaS / productividad | Notion, Linear, Trello, Todoist, Cal.com |
| Ecommerce | Tiendanube, tiendas en Shopify, Mercado Libre |
| Comunidad / contenido | Letterboxd, Goodreads, Product Hunt |
| Experimental / transmedia | Sitios premiados en Awwwards, referencias del TP6 |

## Stack sugerido

- **Next.js** (App Router, JavaScript) + **Tailwind CSS**.
- **Firebase Authentication** para el login.
- **Base de datos**, una de las dos opciones:
  - **Cloud Firestore** (Firebase).
  - **PostgreSQL** hosteado en **Neon**.
- **Vercel** para el deploy.

Se pueden sumar otras librerías o servicios (Three.js, Stripe en modo test, Resend, Vercel Blob, etc.) siempre que se justifique su uso en el README.

## Requisitos mínimos

### Producto

- Propuesta definida en una oración: qué es, para quién y qué problema resuelve.
- Al menos una entidad principal propia del dominio con ABM (alta, baja, modificación y listado).
- Rutas públicas y rutas privadas.
- Flujo completo de punta a punta: un usuario puede registrarse, usar la funcionalidad principal y ver el resultado persistido.
- Diseño responsive, consistente y con jerarquía visual clara.

### React y Next.js

Se espera ver aplicados los conceptos trabajados en clase:

- Componentes reutilizables y comunicación mediante props.
- `useState` y `useEffect` usados donde corresponde.
- Renderizado de listas con `map` y `key`, y renderizado condicional.
- Manejo de eventos y formularios con validación.
- Estado global con Context API cuando la app lo requiera (usuario activo, carrito, preferencias).
- App Router: layouts, al menos una ruta dinámica (`[id]`, `[slug]`) y navegación con `Link`.
- Uso justificado de Server Components y Client Components (`"use client"`).
- Escrituras mediante Server Actions o Route Handlers.
- Estados de carga, error y vacío (`loading.js`, `error.js`, `not-found.js` o equivalentes).
- Metadata específica por página.

### Autenticación y datos

- Login con Firebase Authentication (email/contraseña y al menos un proveedor social o anónimo).
- Datos asociados al usuario autenticado.
- Un usuario no puede leer ni modificar datos de otro: reglas de Firestore o validación en servidor.
- Protección de rutas privadas (middleware o validación en servidor).
- Variables de entorno fuera del repositorio, con un `.env.example` documentado.

### Deploy

- App publicada en Vercel y funcionando con la base de datos en la nube.
- Datos de prueba cargados y al menos un usuario de prueba para la corrección.

## Opcionales

Suman valor. Se deben elegir **al menos 2**:

- Roles (por ejemplo `admin` / `user`) con panel de administración.
- Búsqueda, filtros, ordenamiento o paginación.
- Upload de imágenes (Firebase Storage, Vercel Blob u otro).
- Envío de emails transaccionales.
- Pagos simulados o en modo test.
- Dashboard con gráficos o métricas.
- SEO: Open Graph, sitemap y metadata dinámica.
- Dark mode o accesibilidad cuidada (teclado, contraste, textos alternativos).
- Escena 3D o interacción experimental integrada al producto.

## Uso de IA

Se permite el uso de herramientas de IA (ChatGPT, Claude, Copilot, Cursor, etc.) con las mismas condiciones que en los TPs anteriores:

- Incluir en el README un **consentimiento sobre el uso de IA**: qué herramientas se usaron y para qué partes del proyecto.
- Incluir una **reflexión sobre el uso de IA**: qué aportó, qué hubo que corregir y qué se aprendió.
- Quien entrega debe poder explicar cualquier parte del código. Lo que no se pueda explicar en la defensa no se considera aprobado.

## Entregables

1. Repositorio en GitHub con historial de commits del desarrollo.
2. Link público a la app en Vercel.
3. README del proyecto con:
   - Nombre, propuesta en una oración y descripción.
   - Benchmark.
   - Tecnologías utilizadas y decisiones técnicas principales.
   - Modelo de datos (entidades y relaciones).
   - Mapa de navegación o diagrama de flujo.
   - Opcionales implementados.
   - Instrucciones de instalación, variables de entorno y usuario de prueba.
   - Capturas de pantalla.
   - Consentimiento y reflexión sobre el uso de IA.
4. Presentación y demo en vivo con explicación técnica del código.

## Criterios de evaluación

- Funcionamiento completo del flujo principal en el deploy.
- Correcta aplicación de los conceptos de React y Next.js.
- Autenticación, persistencia y seguridad de los datos por usuario.
- Organización del código: componentes, carpetas y responsabilidades.
- Calidad del diseño y de la experiencia de uso.
- Claridad de la documentación y del benchmark.
- Defensa técnica del proyecto.

Cualquier propuesta superadora será tenida en cuenta.

---

**Cátedra Programación III — UMAI**
