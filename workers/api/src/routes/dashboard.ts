import { Hono } from 'hono'
import type { AppEnv } from '../env'

const routes = new Hono<AppEnv>()

export default routes
