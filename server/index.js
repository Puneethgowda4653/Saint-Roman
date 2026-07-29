import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import settingsRoutes from './routes/settings.js';
import categoriesRoutes from './routes/categories.js';
import productsRoutes from './routes/products.js';
import inventoryRoutes from './routes/inventory.js';
import ordersRoutes from './routes/orders.js';
import cmsRoutes from './routes/cms.js';
import customersRoutes from './routes/customers.js';
import returnsRoutes from './routes/returns.js';
import financeRoutes from './routes/finance.js';
import publicRoutes from './routes/public.js';
import dashboardRoutes from './routes/dashboard.js';
import couponsRoutes from './routes/coupons.js';
import reportsRoutes from './routes/reports.js';
import supportRoutes from './routes/support.js';
import notificationsRoutes from './routes/notifications.js';
import auditRoutes from './routes/audit.js';
import bannersRoutes from './routes/banners.js';
import teamRoutes from './routes/team.js';
import influencersRoutes from './routes/influencers.js';
import marketingRoutes from './routes/marketing.js';
import shippingRoutes from './routes/shipping.js';
import crmRoutes from './routes/crm.js';
import aiRoutes from './routes/ai.js';
import uploadRoutes from './routes/upload.js';
import mediaRoutes from './routes/media.js';

const app = express();
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');

// In development, browser-sync may pick any available port (3000, 3001, 3002, …).
// Instead of maintaining a fixed list, allow any localhost origin so CORS never
// silently breaks the storefront when a port shifts.
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (server-to-server, curl, Postman, etc.)
    if (!origin) return callback(null, true);
    // Allow any localhost port in development
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return callback(null, true);
    // Also allow any explicitly listed non-localhost origins (for production)
    if (CORS_ORIGIN.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  }
}));
// Limit raised from the 100kb default so base64-encoded image uploads (/api/upload/image) fit.
// Base64 inflates raw bytes by ~33%, so 25mb here covers photos up to ~18mb raw.
app.use(express.json({ limit: '25mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/returns', returnsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/banners', bannersRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/influencers', influencersRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/media', mediaRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Image is too large. Please use a smaller file.' });
  }
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Ellora admin API running on http://localhost:${PORT}`);
});
