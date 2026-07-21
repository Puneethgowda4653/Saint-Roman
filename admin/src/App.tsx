import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { DashboardLayout } from '@/components/shared/DashboardLayout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { CategoriesPage } from '@/pages/CategoriesPage'
import { ProductsPage } from '@/pages/ProductsPage'
import { InventoryPage } from '@/pages/InventoryPage'
import { OrdersPage } from '@/pages/OrdersPage'
import { BlogPostsPage } from '@/pages/BlogPostsPage'
import { FaqsPage } from '@/pages/FaqsPage'
import { CustomersPage } from '@/pages/CustomersPage'
import { ReturnsPage } from '@/pages/ReturnsPage'
import { FinancePage } from '@/pages/FinancePage'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/blog-posts" element={<BlogPostsPage />} />
              <Route path="/faqs" element={<FaqsPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/returns" element={<ReturnsPage />} />
              <Route path="/finance" element={<FinancePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  )
}

export default App
