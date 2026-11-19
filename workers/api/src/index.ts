import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { AppEnv } from './env'
import clients from './routes/clients'
import dashboard from './routes/dashboard'
import invoices from './routes/invoices'
import me from './routes/me'
import members from './routes/members'
import orders from './routes/orders'
import photos from './routes/photos'
import priceItems from './routes/price-items'
import review from './routes/review'
import session from './routes/session'
import timesheets from './routes/timesheets'
import track from './routes/track'

const api = new Hono<AppEnv>()
  .get('/health', (c) => c.json({ ok: true }))
  .route('/', session)
  .route('/', members)
  .route('/', priceItems)
  .route('/', clients)
  .route('/', orders)
  .route('/', review)
  .route('/', invoices)
  .route('/', timesheets)
  .route('/', dashboard)
  .route('/', me)
  .all('*', (c) => c.json({ error: 'Not found' }, 404))

const app = new Hono<AppEnv>()
  .route('/api', api)
  .route('/track', track)
  .route('/photos', photos)

app.onError((err, c) => {
  if (err instanceof HTTPException) return c.json({ error: err.message }, err.status)
  console.error(err)
  return c.json({ error: 'Something went wrong on our side. Try again in a moment.' }, 500)
})

export default app
