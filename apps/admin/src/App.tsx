import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Shell from './components/Shell';
import { UiProvider } from './components/ui';
import AnalyticsPage from './pages/Analytics';
import Dashboard from './pages/Dashboard';
import LandingEdit from './pages/LandingEdit';
import Markets from './pages/Markets';
import Landings from './pages/Landings';
import Login from './pages/Login';
import Orders from './pages/Orders';
import RotationEdit from './pages/RotationEdit';
import RotationNew from './pages/RotationNew';
import Rotations from './pages/Rotations';
import Reklama from './pages/Reklama';
import Settings from './pages/Settings';
import Templates from './pages/Templates';
import { ThemeProvider } from './lib/theme';

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

export default function App() {
  return (
    <ThemeProvider>
    <UiProvider>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Shell />}>
            <Route index element={<Dashboard />} />
            <Route path="landings" element={<Landings />} />
            <Route path="landings/:id" element={<LandingEdit />} />
            <Route path="rotations" element={<Rotations />} />
            <Route path="rotations/new" element={<RotationNew />} />
            <Route path="rotations/:id" element={<RotationEdit />} />
            <Route path="templates" element={<Templates />} />
            <Route path="templates/:market" element={<Templates />} />
            <Route path="orders" element={<Orders />} />
            <Route path="markets" element={<Markets />} />
            <Route path="reklama" element={<Reklama />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
    </UiProvider>
    </ThemeProvider>
  );
}
