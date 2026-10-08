import React, { useState } from 'react';
import { Workflow, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/login.css';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login(username.trim().toLowerCase(), password);
    } catch (err) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u) => {
    setUsername(u);
    setError(null);
  };

  return (
    <div className="login-stage">
      <div className="login-card">
        {/* Brand Header */}
        <div className="login-brand">
          <div className="login-logo">
            <Workflow size={22} strokeWidth={2.5} />
          </div>
          <div className="login-title-group">
            <h1 className="login-title">Voyage Ops</h1>
            <p className="login-sub">Autonomous Hotel Operations · Staff Login</p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="login-alert">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label className="login-label" htmlFor="username">
              Username
            </label>
            <div className="relative flex items-center">
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. amit.shah, priya.deshmukh"
                className="login-input w-full"
                autoComplete="username"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="password">
              Password
            </label>
            <div className="relative flex items-center">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="login-input w-full"
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <span>Sign in to Voyage Ops</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo User Accounts */}
        <div className="login-hint">
          <span className="login-hint-title">Quick Select Test Accounts</span>
          <div className="login-hint-chips">
            <button
              type="button"
              onClick={() => handleQuickFill('amit.shah')}
              className="login-hint-chip"
            >
              amit.shah (Manager)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('priya.deshmukh')}
              className="login-hint-chip"
            >
              priya.deshmukh (Housekeeping)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('vikram.rane')}
              className="login-hint-chip"
            >
              vikram.rane (Maintenance)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
