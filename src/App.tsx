import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ClientHome from './pages/ClientHome';
import AdminLayout from './pages/AdminLayout';
import Dashboard from './pages/Dashboard';
import Branches from './pages/Branches';
import Doctors from './pages/Doctors';
import Allocations from './pages/Allocations';
import Billing from './pages/Billing';
import Login from './pages/Login';
import Register from './pages/Register';
import UpdatePassword from './pages/UpdatePassword';
import LandingPage from './pages/LandingPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rotas de Autenticação */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/update-password" element={<UpdatePassword />} />

          {/* Painel Administrativo (Protegido) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="branches" element={<Branches />} />
            <Route path="doctors" element={<Doctors />} />
            <Route path="allocations" element={<Allocations />} />
            <Route path="billing" element={<Billing />} />
          </Route>

          {/* Rota Pública do Paciente (slug da clínica) */}
          <Route path="/:slug" element={<ClientHome />} />

          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
