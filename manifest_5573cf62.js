(()=>{
const {useState}=React;
const {Avatar}=window.AirbnbDesignSystem_019df1;

function MTask({t,tech}){
 const r=S.rooms[t.room];
 const crit=t.severity==='Critical';
 return <div className={'mcard'+(crit?' mcrit':'')+(t.breached?' mover':'')}>
  {crit&&<div className="icbar"><Icon n="flame" s={14} w={2}/>Critical · go now</div>}
  <div style={{padding:16}} className="col g12">
   <div className="row" style={{justifyContent:'space-between'}}><span className="num" style={{fontSize:28,fontWeight:700,letterSpacing:-.5}}>{t.room}</span>{tech?<SLA t={t}/>:<Prio p={t.prio}/>}</div>
   {tech?<><div style={{fontSize:16,fontWeight:500}}>“{t.desc}”</div><div className="row g6" style={{flexWrap:'wrap'}}><Pill tone="muted">{t.category}</Pill><Prio p={t.severity}/>{r.guest&&<Pill tone="muted" icon="user">Guest in room</Pill>}</div></>
   :<><div className="small" style={{color:'var(--color-body)'}}>{r.type} · Floor {r.floor}{r.arrival?` · next guest ${hm(r.arrival.ts)}${r.arrival.vip?' (VIP)':''}`:''}</div>{t.started&&t.status==='Cleaning'&&<div className="small">Started {hm(t.started)} · <Elapsed from={t.started} exp={t.sla}/> of {t.sla} min</div>}</>}
   <div className="row g8"><TaskStatus s={t.status}/>{t.breached&&<Pill tone="critSoft" icon="clock">Overdue</Pill>}</div>
   {t.status==='Assigned'&&<button className="mbtn pri" onClick={()=>A.start(t)}>{tech?'Start repair':'Start cleaning'}</button>}
   {(t.status==='Cleaning'||t.status==='In repair')&&<button className="mbtn pri" onClick={()=>A.complete(t)}>{tech?'Mark resolved':'Mark room clean'}</button>}
   {t.status==='Inspection Required'&&<div className="small muted row g6"><Icon n="clock" s={14}/>Waiting for supervisor inspection</div>}
   {t.status==='Blocked'&&<div className="small" style={{color:'#a82b10'}}>Blocked: {t.blocked}</div>}
   {active(t)&&t.status!=='Inspection Required'&&<div className="row g8">{t.status!=='Blocked'?<button className="mbtn" onClick={()=>A.block(t,tech?'Needs parts or another trade':'Guest in room / DND')}>{tech?'Can’t fix now':'Can’t access room'}</button>:<button className="mbtn" onClick={()=>A.restart(t)}>Resume</button>}{!t.escalated&&<button className="mbtn" onClick={()=>A.escalate(t)}>Need help</button>}</div>}
  </div></div>;
}
function MobileApp(){
 useNow(1000);const role=ROLES[S.role],sid=role.staffId,me=S.staff[sid],tech=S.role==='tech';
 const [tab,setTab]=useState('tasks');const [rq,setRq]=useState('');
 const mine=Object.values(S.tasks).filter(t=>t.assignee===sid&&(active(t)||(t.done&&Date.now()-t.done<3600000))).sort((a,b)=>(active(b)-active(a))||['Critical','High','Medium','Low'].indexOf(a.prio)-['Critical','High','Medium','Low'].indexOf(b.prio));
 const open=mine.filter(active),done=mine.filter(t=>!active(t));
 const myRooms=new Set(mine.map(t=>t.room));
 const alerts=S.notes.filter(n=>n.level==='critical'||myRooms.has(n.room)||(!tech&&n.title.includes('Cleaning'))||(tech&&n.title.includes('technician')));
 const d=new Date();
 return <div className="phone"><div className="pscreen">
  <div className="psb num"><b>{String(d.getHours()).padStart(2,'0')}:{String(d.getMinutes()).padStart(2,'0')}</b><span className="row g4"><Icon n={S.flags.offline?'wifioff':'bar'} s={14}/>{S.flags.offline?'':'5G'}</span></div>
  <div className="phead2"><div className="row g12"><Avatar name={me.name} size={40}/><div className="col" style={{flex:1}}><b>{me.name}</b><span className="small muted">{me.role} · {typeof me.floor==='number'?'Floor '+me.floor:me.floor}</span></div>
   <button className={'availt '+me.avail.replace(' ','')} onClick={()=>A.avail(sid,me.avail==='Offline'?'Available':'Offline')}><Dot c={AVAIL_C[me.avail]}/>{me.avail}</button></div></div>
  {S.flags.offline&&<div className="banner off" style={{margin:0,borderRadius:0,fontSize:13}}><Icon n="wifioff" s={16}/><span>Offline. Updates will sync when you reconnect.</span></div>}
  <div className="pbody">
   {tab==='tasks'&&<div className="col g12">
    <div className="row" style={{justifyContent:'space-between',alignItems:'baseline'}}><b style={{fontSize:22}}>{tech?'My issues':'My rooms'}</b><span className="small muted">{open.length} open · {me.done} done today</span></div>
    {S.notes.find(n=>n.level==='critical'&&!n.read&&Date.now()-n.ts<30*MIN)&&<button className="mcritalert" onClick={()=>setTab('alerts')}><Icon n="flame" s={18} w={2}/><span className="col" style={{alignItems:'flex-start'}}><b>{S.notes.find(n=>n.level==='critical'&&!n.read).title}</b><span className="small">Tap for details</span></span></button>}
    {!open.length&&<Empty icon="check" title={tech?'No issues assigned':'No rooms assigned'} body={me.avail==='Available'?'You’re available. The agent will send your next task here.':'Set yourself to Available to receive tasks.'}/>}
    {open.map(t=><MTask key={t.id} t={t} tech={tech}/>)}
    {done.length>0&&<><div className="small muted" style={{marginTop:8,fontWeight:600}}>Completed in the last hour</div>{done.map(t=><div key={t.id} className="row g8 small" style={{padding:'8px 0',borderBottom:'1px solid var(--color-hairline-soft)'}}><Icon n="check" s={14} c="#17693f"/><b className="num">{t.room}</b><span className="muted">{hm(t.done)}</span><span style={{flex:1}}></span><TaskStatus s={t.status}/></div>)}</>}
   </div>}
   {tab==='alerts'&&<div className="col g8"><b style={{fontSize:22}}>Alerts</b>{!alerts.length&&<Empty icon="bell" title="No alerts"/>}{alerts.map(n=>{const [tone,ic]=LV[n.level];return <div key={n.id} className={'note'+(n.level==='critical'?' ncrit':'')}><span className="nic" style={{background:TONE[tone][1],color:TONE[tone][0]}}><Icon n={ic} s={16} w={2}/></span><span className="col" style={{gap:2,flex:1}}><b>{n.title}</b>{n.body&&<span className="small">{n.body}</span>}<span className="small muted">{ago(n.ts)}</span></span></div>})}</div>}
   {tab==='rooms'&&<div className="col g12"><b style={{fontSize:22}}>Room status</b><div className="search sm" style={{width:'100%'}}><Icon n="search" s={15} c="#6a6a6a"/><input placeholder="Room number" value={rq} inputMode="numeric" onChange={e=>setRq(e.target.value)}/></div>
    <div className="col">{Object.values(S.rooms).filter(r=>rq?r.id.startsWith(rq):(typeof me.floor==='number'?r.floor===me.floor:r.maint)).slice(0,30).map(r=><div key={r.id} className="row g12" style={{padding:'12px 0',borderBottom:'1px solid var(--color-hairline-soft)'}}><b className="num" style={{width:40,fontSize:16}}>{r.id}</b><span className="col" style={{flex:1,gap:2}}><span className="small">{r.type}</span><span className="small muted">{r.guest?'In house':r.arrival?'Arrives '+hm(r.arrival.ts):'No arrival'}</span></span>{r.maint&&<Icon n="wrench" s={14} c="#653886"/>}<RoomStatus s={r.status}/></div>)}</div></div>}
   {tab==='report'&&<div className="col g12"><b style={{fontSize:22}}>Report a problem</b><ReportFlow compact reporter={me.name} initialRoom={open[0]?open[0].room:''}/></div>}
  </div>
  <div className="ptabs">{[['tasks',tech?'Issues':'Rooms','tasks',open.length],['alerts','Alerts','bell',alerts.filter(n=>!n.read).length],['rooms','Status','bed'],['report','Report','wrench']].map(([k,l,ic,c])=><button key={k} className={tab===k?'on':''} onClick={()=>setTab(k)}><span className="rel"><Icon n={ic} s={22}/>{c>0&&<span className="badge">{c}</span>}</span>{l}</button>)}</div>
 </div></div>;
}
function MobileStage(){
 const [m,setM]=useState(false);const role=ROLES[S.role];
 return <div className="mstage">
  <div className="mside col g16">
   <div className="brand" style={{padding:0}}><div className="logo"><Icon n="nodes" s={16} c="#fff" w={2.2}/></div><div className="col"><b>Voyage Ops</b><span className="small muted">Staff mobile app</span></div></div>
   <div className="col g8"><div style={{fontSize:22,fontWeight:600}}>Previewing as {role.name}</div><div className="muted">{role.title}. The mobile app shows only what this person needs: their tasks, alerts, room status and a one-step issue report.</div></div>
   <div className="rel"><Btn icon="users" onClick={()=>setM(!m)}>Switch role</Btn><RoleMenu open={m} onClose={()=>setM(false)} style={{left:0,top:48}}/></div>
   <div className="col g8 small" style={{color:'var(--color-body)'}}><b>Try it</b>
    {S.role==='tech'?<><span>1. Switch to a manager, report “AC is not cooling” for Room 204.</span><span>2. Come back here. The issue appears with a live SLA timer.</span><span>3. Start repair, then mark resolved. The desktop updates instantly.</span></>
    :<><span>1. Start cleaning Room 107, then mark it clean.</span><span>2. Switch to Sunita Pawar (supervisor) to pass inspection in Housekeeping.</span><span>3. Use Report to flag a problem from the room.</span></>}</div>
   <label className="row g8 small"><input type="checkbox" checked={S.flags.offline} onChange={e=>{S.flags.offline=e.target.checked;S.flags.offAt=Date.now();emit()}}/>Simulate no connection</label>
  </div>
  <MobileApp/>
 </div>;
}
Object.assign(window,{MobileStage});
})();
