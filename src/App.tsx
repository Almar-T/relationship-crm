import { HashRouter, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { DashboardPage } from './pages/DashboardPage';
import { PeoplePage } from './pages/PeoplePage';
import { PersonDetailPage } from './pages/PersonDetailPage';
import { AddPersonPage } from './pages/AddPersonPage';
import { EditPersonPage } from './pages/EditPersonPage';
import { SearchPage } from './pages/SearchPage';
import { SettingsPage } from './pages/SettingsPage';

/**
 * HashRouter is deliberate: GitHub Pages serves static files only, so deep
 * links like /person/123 would 404 on refresh with a BrowserRouter. Hash routes
 * (/#/person/123) always resolve to index.html.
 */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="people" element={<PeoplePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="add" element={<AddPersonPage />} />
          <Route path="person/:id" element={<PersonDetailPage />} />
          <Route path="person/:id/edit" element={<EditPersonPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
