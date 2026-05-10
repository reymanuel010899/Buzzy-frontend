import React, { lazy, Suspense, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { AuthContext } from './context/ AuthContext';
import ChatModal from './components/Chat/ChatModal';

const GlobalCallWrapper = lazy(() =>
  import('./components/calls/GlobalCallWrapper').then(m => ({ default: m.GlobalCallWrapper }))
);

const ProtectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useContext(AuthContext);
  const token = localStorage.getItem('accessToken');

  if (!token) {
    return <Navigate to="/sign-in" replace />;
  }

  return (
    <>
      <Suspense fallback={null}>
        <GlobalCallWrapper />
      </Suspense>
      <ChatModal />
      {children}
    </>
  );
};

export default ProtectedRoute;
