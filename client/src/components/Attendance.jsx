import React, { useEffect, useState } from 'react'
import axios from 'axios'

const API = process.env.VITE_API_BASE || 'http://localhost:4000'

function isoDate(d){
  const yy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${yy}-${mm}-${dd}`
}

export default function Attendance({ token, onLogout }){
  const [students, setStudents] = useState([])
  const [date, setDate] = useState(isoDate(new Date()))
  const [records, setRecords] = useState({})
  const [dates, setDates] = useState([])
  const [newName, setNewName] = useState('')
  const [newRoll, setNewRoll] = useState('')

  useEffect(()=>{ loadStudents(); loadAttendance(date); }, [])

  useEffect(()=>{ loadDates(); }, [students])

  async function loadStudents(){
    const r = await axios.get(API + '/api/students', { headers: { Authorization: 'Bearer '+token } })
    setStudents(r.data)
  }

  async function loadDates(){
    const r = await axios.get(API + '/api/attendance/dates', { headers: { Authorization: 'Bearer '+token } })
    setDates(r.data)
  }

  async function loadAttendance(d){
    const r = await axios.get(API + '/api/attendance/' + d, { headers: { Authorization: 'Bearer '+token } })
    const recs = {}
    r.data.records.forEach(x=> recs[x.student._id] = x.present )
    setRecords(recs)
  }

  function toggle(id){ setRecords(prev=> ({...prev, [id]: !prev[id]})) }

  async function deleteStudent(id){
    if (!confirm('Delete student?')) return;
    await axios.delete(API + '/api/students/' + id, { headers: { Authorization: 'Bearer '+token } })
    await loadStudents();
    await loadDates();
  }

  async function save(){
    const arr = students.map(s=> ({ student: s._id, present: !!records[s._id] }))
    await axios.post(API + '/api/attendance/' + date, { records: arr }, { headers: { Authorization: 'Bearer '+token } })
    alert('Saved')
  }

  async function addStudent(e){
    e.preventDefault();
    await axios.post(API + '/api/students', { name: newName, roll: newRoll }, { headers: { Authorization: 'Bearer '+token } })
    setNewName(''); setNewRoll('');
    await loadStudents();
  }

  async function makeShare(){
    const r = await axios.post(API + '/api/share/' + date, {}, { headers: { Authorization: 'Bearer '+token } })
    const u = window.location.origin + r.data.url
    prompt('Shareable URL (copy):', u)
  }

  return (
    <div className="container">
      <div className="top">
        <h2>Attendance for {date}</h2>
        <div>
          <input type="date" value={date} onChange={e=>{ setDate(e.target.value); loadAttendance(e.target.value) }} />
          <button onClick={save}>Save</button>
          <button onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div style={{display:'flex',gap:20}}>
        <div style={{flex:1}}>
          <div className="students">
            {students.map(s=> (
              <div key={s._id} className={"student " + ((records[s._id])? 'present':'absent')}>
                <div style={{flex:1}} onClick={()=>toggle(s._id)} className="name">{s.name} {s.roll? `(${s.roll})`:''}</div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <div className="mark" onClick={()=>toggle(s._id)}>{records[s._id] ? 'Present' : 'Absent'}</div>
                  <button onClick={()=>deleteStudent(s._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:8}}>
            <button onClick={makeShare}>Create shareable link for {date}</button>
          </div>
        </div>

        <div style={{width:220}} className="card">
          <h4>Saved dates</h4>
          <div>
            {dates.length===0 && <div>No saved dates</div>}
            {dates.map(d=> <div key={d}><a href="#" onClick={e=>{ e.preventDefault(); setDate(d); loadAttendance(d); }}>{d}</a></div>)}
          </div>
        </div>
      </div>

      <form onSubmit={addStudent} className="card">
        <h3>Add student</h3>
        <input placeholder="Name" value={newName} onChange={e=>setNewName(e.target.value)} />
        <input placeholder="Roll" value={newRoll} onChange={e=>setNewRoll(e.target.value)} />
        <button type="submit">Add</button>
      </form>
    </div>
  )
}
