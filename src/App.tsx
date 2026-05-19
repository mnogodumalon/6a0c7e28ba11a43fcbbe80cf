import '@/lib/sentry';
import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import AdminPage from '@/pages/AdminPage';
import SpeisekartePage from '@/pages/SpeisekartePage';
import TischverwaltungPage from '@/pages/TischverwaltungPage';
import BestellerfassungPage from '@/pages/BestellerfassungPage';
import PublicFormSpeisekarte from '@/pages/public/PublicForm_Speisekarte';
import PublicFormTischverwaltung from '@/pages/public/PublicForm_Tischverwaltung';
import PublicFormBestellerfassung from '@/pages/public/PublicForm_Bestellerfassung';
// <public:imports>
// </public:imports>
// <custom:imports>
const BestellungErfassenPage = lazy(() => import('@/pages/intents/BestellungErfassenPage'));
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route path="public/6a0c7e05738179c77a2f1273" element={<PublicFormSpeisekarte />} />
              <Route path="public/6a0c7e0cc5e08888032338dd" element={<PublicFormTischverwaltung />} />
              <Route path="public/6a0c7e0d8fdbde67bb981006" element={<PublicFormBestellerfassung />} />
              {/* <public:routes> */}
              {/* </public:routes> */}
              <Route element={<Layout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="speisekarte" element={<SpeisekartePage />} />
                <Route path="tischverwaltung" element={<TischverwaltungPage />} />
                <Route path="bestellerfassung" element={<BestellerfassungPage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                <Route path="intents/bestellung-erfassen" element={<Suspense fallback={null}><BestellungErfassenPage /></Suspense>} />
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
