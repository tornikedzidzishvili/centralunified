import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import { useState } from 'react';

function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));

  const handleLogin = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route 
          path="/" 
          element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/users" 
          element={user && (user.role === 'admin' || user.role === 'admin_editor') ? <Users user={user} onLogout={handleLogout} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/settings" 
          element={user && user.role === 'admin' ? <Settings user={user} onLogout={handleLogout} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/reports" 
          element={user && (user.role === 'admin' || user.role === 'manager_viewer') ? <Reports user={user} onLogout={handleLogout} /> : <Navigate to="/" />} 
        />
      </Routes>
    </Router>
  );
}

export default App;
