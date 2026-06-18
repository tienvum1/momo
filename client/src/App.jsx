import { useState, useEffect } from 'react'
import { useLocation, BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import api from './api/axios';
import Login from './pages/Auth/Login/Login';
import Register from './pages/Auth/Register/Register';
import AdminUserManager from './pages/Admin/UserManager/UserManager';
import AdminBookingManager from './pages/Admin/BookingManager/AdminBookingManager';
import AdminBookingDetail from './pages/Admin/BookingDetail/AdminBookingDetail';
import AdminQRManager from './pages/Admin/QRManager/AdminQRManager';
import AdminLayout from './components/AdminLayout/AdminLayout';
import MyBookings from './pages/MyBookings/MyBookings';
import MyBookingDetail from './pages/MyBookings/MyBookingDetail';
import BookingPayment from './pages/QRDetail/BookingPayment';
import Home from './pages/Home/Home';
import QRDetail from './pages/QRDetail/QRDetail';
import Profile from './pages/Profile/Profile';
import Guide from './pages/Guide/Guide';
import Header from './components/Header/Header';
import './App.scss'

// Ẩn Header ở một số Route nhất định
const LayoutWrapper = ({ user, handleLogout, children }) => {
  const location = useLocation();
  const excludedPaths = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password'];
  const isExcludedPath = location.pathname.startsWith('/admin') || excludedPaths.some(path => location.pathname.startsWith(path));
  return (
    <>
      {!isExcludedPath && <Header user={user} handleLogout={handleLogout} />}
      {children}
    </>
  );
};

// Bảo vệ Route dựa trên Role
const ProtectedRoute = ({ user, allowedRoles, children }) => {
  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return children;
};

const AuthRoute = ({ user, children }) => {
  if (!user) return <Navigate to="/login" />;
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) { setLoading(false); return; }
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await api.get('/auth/logout');
    } catch (err) {
      console.error('Lỗi đăng xuất:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      window.location.href = '/login';
    }
  };

  if (loading) return <div className="loading-screen">Đang tải...</div>;

  return (
    <Router>
      <LayoutWrapper user={user} handleLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/huong-dan" element={<Guide />} />
          <Route path="/qrs/:id" element={<QRDetail />} />
          <Route
            path="/payment/:bookingId"
            element={<AuthRoute user={user}><BookingPayment /></AuthRoute>}
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/my-bookings"
            element={<AuthRoute user={user}><MyBookings /></AuthRoute>}
          />
          <Route
            path="/my-bookings/:id"
            element={<AuthRoute user={user}><MyBookingDetail /></AuthRoute>}
          />
          <Route
            path="/profile"
            element={<AuthRoute user={user}><Profile /></AuthRoute>}
          />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={<AdminLayout user={user} handleLogout={handleLogout} />}
          >
            <Route path="users" element={<AdminUserManager />} />
            <Route path="bookings" element={<AdminBookingManager />} />
            <Route path="bookings/:id" element={<AdminBookingDetail />} />
            <Route path="qrs" element={<AdminQRManager />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </LayoutWrapper>
    </Router>
  );
}

export default App;
