import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ThemeToggle } from './components/ThemeToggle'
import Sports from './pages/Sports'
import Teams from './pages/Teams'
import Competitions from './pages/Competitions'
import Events from './pages/Events'
import Results from './pages/Results'
import Customers from './pages/Customers'
import Bookies from './pages/Bookies'
import Bets from './pages/Bets'
import BalanceChanges from './pages/BalanceChanges'
import Analytics from './pages/Analytics'
import AuditLogs from './pages/AuditLogs'
import Login from './pages/Login'
import './App.css'

function App() {
  const { isAuthenticated, username, logout, loading } = useAuth()

  return (
    <Router>
      <div className="app">
        {!loading && isAuthenticated && (
          <nav className="navbar">
            <div className="nav-container">
              <h1 className="nav-title">Sports Betting Admin Platform</h1>
              <div className="nav-links">
              <NavLink 
                to="/analytics" 
                className={({ isActive }) => 
                  `nav-analytics-btn ${isActive ? 'active' : ''}`
                }
                style={{ 
                  backgroundColor: '#3b82f6', 
                  color: 'white', 
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  marginRight: '0.5rem'
                }}
              >
                View Analytics
              </NavLink>
              <Link to="/sports">Sports</Link>
              <Link to="/teams">Teams</Link>
              <Link to="/competitions">Competitions</Link>
              <Link to="/events">Events</Link>
              <Link to="/results">Results</Link>
              <Link to="/customers">Customers</Link>
              <Link to="/bookies">Bookies</Link>
              <Link to="/bets">Bets</Link>
              <Link to="/balance-changes">Balance Changes</Link>
              <Link to="/audit-logs">📋 Audit Logs</Link>
              <div className="nav-user-section">
                <ThemeToggle />
                <span className="nav-username">👤 {username}</span>
                <button onClick={logout} className="nav-logout-btn">
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>
        )}
        <main className="main-content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <div className="welcome">
                    <h2>Welcome to Sports Betting Admin Platform</h2>
                    <p>Select a section from the navigation above</p>
                  </div>
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sports"
              element={
                <ProtectedRoute>
                  <Sports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teams"
              element={
                <ProtectedRoute>
                  <Teams />
                </ProtectedRoute>
              }
            />
            <Route
              path="/competitions"
              element={
                <ProtectedRoute>
                  <Competitions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events"
              element={
                <ProtectedRoute>
                  <Events />
                </ProtectedRoute>
              }
            />
            <Route
              path="/results"
              element={
                <ProtectedRoute>
                  <Results />
                </ProtectedRoute>
              }
            />
            <Route
              path="/customers"
              element={
                <ProtectedRoute>
                  <Customers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookies"
              element={
                <ProtectedRoute>
                  <Bookies />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bets"
              element={
                <ProtectedRoute>
                  <Bets />
                </ProtectedRoute>
              }
            />
            <Route
              path="/balance-changes"
              element={
                <ProtectedRoute>
                  <BalanceChanges />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute>
                  <AuditLogs />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App

