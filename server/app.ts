import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { packagesRoutes } from './routes/packageRoutes'

const app = new Hono()

// Add a logger middleware
app.use( '*', logger())

// Add a route to packages
app.route('/api/packages', packagesRoutes)

export default app