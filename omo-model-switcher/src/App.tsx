import { MainLayout } from './components/Layout/MainLayout';
import { ToastContainer } from './components/common/Toast';
import { AgentPage } from './pages/AgentPage';
import { ConfigPage } from './pages/ConfigPage';
import { PresetPage } from './pages/PresetPage';
import { ModelsPage } from './pages/ModelsPage';
import { ImportExportPage } from './pages/ImportExportPage';
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
    </>
  );
}

export default App;
