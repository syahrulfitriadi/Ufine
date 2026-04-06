import React, { useState } from 'react';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import AddTransaction from './pages/AddTransaction';
import History from './pages/History';
import Report from './pages/Report';
import Profile from './pages/Profile';
import Login from './pages/Login';
import { useAuth } from './contexts/AuthContext';
import { useTransactions } from './contexts/TransactionContext';
import { ToastContainer } from './components/Toast';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { session } = useAuth();
  const { toasts, removeToast } = useTransactions();


  // If no session exists, show Login page
  if (!session) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'report':
        return <Report />;
      case 'add':
        return <AddTransaction onSuccess={() => setActiveTab('report')} />;
      case 'history':
        return <History />;
      case 'profile':
        return <Profile session={session} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-sage-50 relative shadow-2xl overflow-hidden">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      {/* Header / Top Decor */}
      <div className="absolute top-0 w-full h-40 bg-gradient-to-br from-mint-400 to-sage-500 rounded-b-[2rem] z-0"></div>

      {/* Main Content Area */}
      <main className="relative z-10 pt-6 px-4 pb-24 min-h-screen flex flex-col">
        <div key={activeTab} className="page-transition flex-1 flex flex-col">
          {renderContent()}
        </div>
      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

export default App;
