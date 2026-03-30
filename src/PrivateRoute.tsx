import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { ReactNode } from 'react';
import { AuthContext } from './context/ AuthContext';
import { GlobalCallWrapper } from './components/calls/GlobalCallWrapper';


const ProtectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useContext(AuthContext);
  const token = localStorage.getItem('accessToken');

  if (!token) {
    return <Navigate to="/sign-in" replace />;
  }

  return (
    <>
      <GlobalCallWrapper />
      {children}
    </>
  );
};

export default ProtectedRoute;
