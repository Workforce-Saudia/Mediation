import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { LangProvider } from './lib/i18n'
import { ContentProvider } from './lib/content'
import { AuthProvider } from './lib/auth'
import { Toaster } from './lib/toast'
import { Spinner } from './components/common'
import PublicLayout from './components/PublicLayout'
import Home from './pages/Home'
import Workers from './pages/Workers'
import Book from './pages/Book'
import Faq from './pages/Faq'
import { Contact, FormPage, NotFound, Terms, ThankYou } from './pages/SimplePages'

// Dashboard is loaded only when needed, so the public pages stay fast for ad traffic
const AdminLayout = lazy(() => import('./admin/AdminLayout'))
const Login = lazy(() => import('./admin/Login'))
const Dashboard = lazy(() => import('./admin/Dashboard'))
const WorkersAdmin = lazy(() => import('./admin/WorkersAdmin'))
const WorkerEdit = lazy(() => import('./admin/WorkerEdit'))
const CatalogAdmin = lazy(() => import('./admin/CatalogAdmin'))
const ContentAdmin = lazy(() => import('./admin/ContentAdmin'))
const FeaturesAdmin = lazy(() => import('./admin/FeaturesAdmin'))
const FaqAdmin = lazy(() => import('./admin/FaqAdmin'))
const FormsAdmin = lazy(() => import('./admin/FormsAdmin'))
const SubmissionsAdmin = lazy(() => import('./admin/SubmissionsAdmin'))
const WebhooksAdmin = lazy(() => import('./admin/WebhooksAdmin'))
const UsersAdmin = lazy(() => import('./admin/UsersAdmin'))
const Account = lazy(() => import('./admin/Account'))

export default function App() {
  return (
    <LangProvider>
      <ContentProvider>
        <AuthProvider>
          <Toaster />
          <Suspense fallback={<Spinner full />}>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route index element={<Home />} />
                <Route path="workers" element={<Workers />} />
                <Route path="workers/:profession" element={<Workers />} />
                <Route path="workers/:profession/:country" element={<Workers />} />
                <Route path="book/:code" element={<Book />} />
                <Route path="faq" element={<Faq />} />
                <Route path="terms" element={<Terms />} />
                <Route path="contact" element={<Contact />} />
                <Route path="form/:slug" element={<FormPage />} />
                <Route path="thank-you" element={<ThankYou />} />
                <Route path="*" element={<NotFound />} />
              </Route>

              <Route path="admin/login" element={<Login />} />
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="workers" element={<WorkersAdmin />} />
                <Route path="workers/new" element={<WorkerEdit />} />
                <Route path="workers/:id" element={<WorkerEdit />} />
                <Route path="catalog" element={<CatalogAdmin />} />
                <Route path="content" element={<ContentAdmin />} />
                <Route path="features" element={<FeaturesAdmin />} />
                <Route path="faq" element={<FaqAdmin />} />
                <Route path="forms" element={<FormsAdmin />} />
                <Route path="submissions" element={<SubmissionsAdmin />} />
                <Route path="submissions/:slug" element={<SubmissionsAdmin />} />
                <Route path="webhooks" element={<WebhooksAdmin />} />
                <Route path="users" element={<UsersAdmin />} />
                <Route path="account" element={<Account />} />
              </Route>
            </Routes>
          </Suspense>
        </AuthProvider>
      </ContentProvider>
    </LangProvider>
  )
}
