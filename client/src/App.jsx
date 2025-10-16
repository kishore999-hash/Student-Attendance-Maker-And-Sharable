import React, { useState } from 'react'
import Login from './components/Login'
import Attendance from './components/Attendance'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  if (!token) return <Login onLogin={t => { localStorage.setItem('token', t); setToken(t); }} />
  return <Attendance token={token} onLogout={() => { localStorage.removeItem('token'); setToken(null); }} />
}
