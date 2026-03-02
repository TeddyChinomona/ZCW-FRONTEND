import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  // Replace this with your actual auth logic (e.g., localStorage.getItem('token'))
  const isAuthenticated = !!localStorage.getItem('token'); 
    console.log("ProtectedRoute: isAuthenticated =", isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/" replace />;
};

export default ProtectedRoute;
