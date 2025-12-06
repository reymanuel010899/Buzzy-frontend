import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { ReactNode } from 'react';
import { AuthContext } from './context/ AuthContext';


const ProtectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useContext(AuthContext);
  const token = localStorage.getItem('accessToken');
  console.log("Token en ProtectedRoute:", token);
  console.log("User en ProtectedRoute:", user);


  if ( !token) {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
