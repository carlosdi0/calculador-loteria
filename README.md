# Calculador de Lotería

Web sencilla para apuntar los décimos y participaciones de la **Lotería de Navidad** (22 de diciembre) y del **Sorteo del Niño** (6 de enero) y, el día del sorteo, ver cuánto has ganado: premio total, lo que se queda Hacienda y el balance frente a lo jugado.

- Décimos (20 €) y participaciones (importe jugado), con una nota por número.
- Cada lista tiene un enlace corto (`/l/xxxxxxxxxx`) para recuperarla en otro dispositivo o compartirla. Quien tenga el enlace puede verla y editarla.
- Durante el sorteo los resultados se actualizan solos cada minuto.
- Incluye un ejemplo con los resultados reales de Navidad 2025.

## Stack

Vite + React en el cliente y dos funciones de Vercel en `api/`:

| Ruta | Qué hace |
| --- | --- |
| `GET /api/comprobar?sorteo=navidad&numeros=79432,00048` | Premio por décimo de cada número |
| `GET/POST/DELETE /api/lista?id=…` | Leer, guardar y quitar números de una lista |

Las listas se guardan en **Upstash Redis** (integración del Marketplace de Vercel; lee `KV_REST_API_URL`/`KV_REST_API_TOKEN` o `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`). En local, sin esas variables, se usa un almacén en memoria.

## Fuentes de premios

No hay API oficial pública: la web de SELAE (loteriasyapuestas.es) bloquea las peticiones automáticas. Se usan, por orden:

1. `api-loteria.pabloclementeperez.com/output/LoteriaNavidad.json`: lista completa de premiados (importes por billete de 10 décimos) con el código de estado de El País. Tiene CORS abierto.
2. `api.elpais.com/ws/LoteriaNavidadPremiados?n=NUMERO` (y `LoteriaNinoPremiados`): API histórica de El País, un número por petición.

Las dos fuentes siguen mostrando el sorteo anterior hasta que se actualizan. Por eso `lib/comprobar.js` no consulta nada antes de la hora del sorteo, descarta la lista si su `Last-Modified` es anterior al día del sorteo y desconfía de una "lista oficial" en las 3 primeras horas.

Los resultados son orientativos: comprueba siempre el décimo en [loteriasyapuestas.es](https://www.loteriasyapuestas.es).

## Desarrollo

```bash
npm install
npm run dev     # http://localhost:5173 (incluye /api en local)
npm test
```
