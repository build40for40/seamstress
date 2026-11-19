import { Hono } from 'hono'
import type { AppEnv } from '../env'

const routes = new Hono<AppEnv>()

routes.get('/:token', (c) =>
  c.html(
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Seamless</title>
      </head>
      <body>
        <p>We couldn't find that order. Ask your atelier for a fresh link.</p>
      </body>
    </html>,
    404,
  ),
)

export default routes
