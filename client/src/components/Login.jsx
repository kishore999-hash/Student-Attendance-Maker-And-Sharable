import React, { useState } from 'react'
import axios from 'axios'

const API = process.env.VITE_API_BASE || 'http://localhost:4000'

export default function Login({ onLogin }){
  const [teacherId, setTeacherId] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  async function submit(e){
    e.preventDefault();
    try{
      const r = await axios.post(API + '/api/login', { teacherId, password })
      onLogin(r.data.token)
    }catch(er){
      setErr(er?.response?.data?.error || 'Login failed')
    }
  }

  return (
    <div className="container">
      <h2>Teacher login</h2>
      <form onSubmit={submit} className="card">
        <input placeholder="Teacher ID" value={teacherId} onChange={e=>setTeacherId(e.target.value)} />
        <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
        <button type="submit">Login</button>
        {err && <div className="error">{err}</div>}
      </form>
    </div>
  )
}
