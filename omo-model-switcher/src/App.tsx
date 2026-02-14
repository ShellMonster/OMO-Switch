import { MainLayout } from './components/Layout/MainLayout';
import { ToastContainer } from './components/common/Toast';
import { UpdaterModal } from './components/common/UpdaterModal';
import { VersionBadge } from './components/common/VersionBadge';
import { AgentPage } from './pages/AgentPage';
import { ConfigPage } from './pages/ConfigPage';
import { PresetPage } from './pages/PresetPage';
import { ModelsPage } from './pages/ModelsPage';
import { ImportExportPage } from './pages/ImportExportPage';
import { SettingsPage } from './pages/SettingsPage';
import { useUIStore } from './store/uiStore';

function App() {
  const { currentPage } = useUIStore();

  const renderPage = () => {
    switch (currentPage) {
      case 'agent':
        return <AgentPage />;
      case 'config':
        return <ConfigPage />;
      case 'preset':
        return <PresetPage />;
      case 'models':
        return <ModelsPage />;
      case 'import-export':
        return <ImportExportPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <AgentPage />;
    }
  };

  return (
    <>
      <MainLayout>
        {renderPage()}
      </MainLayout>
      <ToastContainer />
      <UpdaterModal />
      <VersionBadge />
    </>
  );
}

export default App;
