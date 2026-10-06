(()=>{
const {useState,useEffect,useRef}=React;
const {Avatar,Input}=window.AirbnbDesignSystem_019df1;
const SEVI=s=>['Critical','High','Medium','Low'].indexOf(s);

// ------------ Housekeeping
function HKCard({t}){
 const r=S.rooms[t.room];const exp=t.started?t.started+t.sla*MIN:null;
 return <button className={'hkc'+(t.breached&&active(t)?' over':'')} onClick={()=>openTask(t.id)}>
  <div className="row" style={{justifyContent:'space-between'}}><span className="row g6"><span className="num" style={{fontSize:18,fontWeight:600}}>{t.room}</span>{r.arrival&&r.arrival.vip&&<Icon n="star" s={12} w={2.4}/>}</span><Prio p={t.prio}/></div>
  <span className="small muted">{t.title||r.type}{r.arrival&&active(t)?` · next guest ${hm(r.arrival.ts)}`:''}</span>
  <Person id={t.assignee} size={24}/>
  {t.started&&t.status!=='Completed'&&<div className="col g4"><div className="row small muted" style={{justifyContent:'space-between'}}><span className="num">Started {hm(t.started)}</span><span className="num">Due {hm(exp)}</span></div><ProgBar from={t.started} mins={t.sla}/></div>}
  {t.status==='Completed'&&<span className="small muted num">Completed {hm(t.done)} · took {dur(t.done-(t.started||t.created))}</span>}
  {t.status==='Blocked'&&<span className="small" style={{color:'#a82b10'}}><Icon n="lock" s={12}/> {t.blocked}</span>}
  <div className="row" style={{justifyContent:'space-between'}}><AssignTag ai={t.ai}/>{t.started&&active(t)?<span className="small">Elapsed <Elapsed from={t.started} exp={t.sla}/></span>:<span className="small muted num">{t.sla} min job</span>}</div>
 </button>;
}
function ProgBar({from,mins}){const n=useNow(5000);const f=(n-from)/(mins*MIN);return <div className="bar"><i style={{width:Math.min(100,f*100)+'%',background:f>1?'#c13515':f>.8?'#d9772b':'#2657a0'}}></i></div>}

function Housekeeping(){
 useNow(10000);const [floor,setFloor]=useState('All');
 const all=Object.values(S.tasks).filter(t=>t.type!=='Maintenance'&&(floor==='All'||S.rooms[t.room].floor==+floor));
 const today=Date.now()-12*3600000;
 const cols=[['Unassigned','Waiting for an attendant'],['Assigned','Queued with an attendant'],['Cleaning','In progress'],['Inspection Required','Supervisor check'],['Completed','Today'],['Blocked','Needs a person']];
 const by=s=>all.filter(t=>t.status===s&&(s!=='Completed'||t.done>today)).sort((a,b)=>SEVI(a.prio)-SEVI(b.prio)||a.created-b.created);
 const cleaners=Object.values(S.staff).filter(s=>s.cat==='Housekeeping');
 const over=all.filter(t=>active(t)&&t.breached);
 return <div className="page">
  <PageHead title="Housekeeping" sub="Housekeeping Agent assigns rooms by floor, workload and next arrival" right={<Seg value={floor} onChange={setFloor} options={['All','1','2','3','4','5'].map(x=>({v:x,l:x==='All'?'All floors':'F'+x}))}/>}/>
  <div className="kgrid k6">
   <KPI label="Today’s workload" icon="brush" value={all.filter(t=>active(t)||t.done>today).length} sub={`${all.filter(active).length} still open`}/>
   <KPI label="Available cleaners" icon="users" value={cleaners.filter(s=>s.avail==='Available').length} sub={`${cleaners.filter(s=>s.avail==='Busy').length} busy · ${cleaners.filter(s=>s.avail==='Offline'||s.avail==='On Leave').length} off`}/>
   <KPI label="In progress" icon="refresh" value={by('Cleaning').length} sub={`${by('Inspection Required').length} awaiting inspection`}/>
   <KPI label="Completed" icon="check" value={by('Completed').length} sub="Rooms turned today" tone="ok"/>
   <KPI label="Overdue" icon="clock" value={over.length} sub={over.length?over.map(t=>'Room '+t.room).join(', '):'All on time'} tone={over.length?'critSoft':'ok'} alert={false}/>
   <KPI label="Priority rooms" icon="star" value={all.filter(t=>active(t)&&t.prio==='High').length} sub="VIP or arriving within 2h" tone="high"/>
  </div>
  <div className="hkwrap">
   <div className="board">{cols.map(([s,sub])=>{const L=by(s);return <div key={s} className="bcol"><div className="bhead"><span className="row g8"><TaskStatus s={s}/><b className="num">{L.length}</b></span><span className="small muted">{sub}</span></div>
    <div className="col g8">{L.length?L.map(t=><HKCard key={t.id} t={t}/>):<div className="bempty small muted">{s==='Blocked'?'Nothing blocked':s==='Unassigned'?'Every room has an attendant':'No tasks'}</div>}</div></div>})}</div>
   <Panel title="Attendants" sub="Used by the Housekeeping Agent">
    <div className="col">{cleaners.sort((a,b)=>['Available','Busy','Offline','On Leave'].indexOf(a.avail)-['Available','Busy','Offline','On Leave'].indexOf(b.avail)).map(s=>{const cur=Object.values(S.tasks).find(t=>t.assignee===s.id&&t.status==='Cleaning');const l=loadOf(s.id);
     return <button key={s.id} className="rrow" onClick={()=>openStaff(s.id)} style={{padding:'10px 0'}}><Avatar name={s.name} size={32}/><span className="col" style={{flex:1,minWidth:0,textAlign:'left',gap:2}}><b className="ell">{s.name}</b><span className="small muted ell">{cur?`Cleaning ${cur.room}`:`Floor ${s.floor}`} · {l} open</span></span><Avail a={s.avail}/></button>})}</div></Panel>
  </div></div>;
}

// ------------ Maintenance
function IssueCard({t}){
 const c=t.severity==='Critical'&&active(t);
 return <button className={'icard'+(c?' icrit':'')} onClick={()=>go('issue/'+t.id)}>
  {c&&<div className="icbar"><Icon n="flame" s={14} w={2}/>Critical safety issue · emergency response active</div>}
  <div className="icbody">
   <div className="row" style={{justifyContent:'space-between',gap:8}}><span className="row g8"><span className="num" style={{fontSize:18,fontWeight:600}}>Room {t.room}</span><span className="small muted">{t.id}</span></span>{active(t)?<SLA t={t}/>:<TaskStatus s={t.status}/>}</div>
   <div className="desc">“{t.desc}”</div>
   <div className="row g6" style={{flexWrap:'wrap'}}><span className="small muted row g4"><Icon n="bolt" s={12}/>AI</span><Pill tone="muted">{t.category}</Pill><Prio p={t.severity}/><span className="small muted">SLA {t.sla} min</span>{t.fallback&&<Pill tone="warn" icon="cloudoff">Default</Pill>}{t.needsReview&&<Pill tone="warn">Needs review</Pill>}</div>
   <div className="row" style={{justifyContent:'space-between',gap:8,borderTop:'1px solid var(--color-hairline-soft)',paddingTop:10}}>{t.assignee?<Person id={t.assignee} size={24}/>:<span className="row g6 small" style={{color:'#a82b10',fontWeight:600}}><Icon n="userx" s={15}/>No technician available</span>}<span className="row g8"><span className="small muted">{ago(t.created)}</span>{active(t)&&<TaskStatus s={t.status}/>}</span></div>
  </div></button>;
}
function Maintenance(){
 useNow(10000);const [f,setF]=useState('Open');
 const all=Object.values(S.tasks).filter(t=>t.type==='Maintenance'),open=all.filter(active);
 const techs=Object.values(S.staff).filter(s=>s.cat==='Maintenance');
 const done=all.filter(t=>t.status==='Completed');const avgRes=done.length?Math.round(done.reduce((a,t)=>a+(t.done-t.created),0)/done.length/MIN):0;
 const L=(f==='Open'?open:f==='Critical'?open.filter(t=>t.severity==='Critical'):f==='Unassigned'?open.filter(t=>!t.assignee):done).sort((a,b)=>SEVI(a.severity)-SEVI(b.severity)||deadline(a)-deadline(b));
 return <div className="page">
  <PageHead title="Maintenance" sub="Staff describe the problem. The Maintenance Agent sets category, severity and SLA, then finds a technician." right={<Btn v="primary" icon="plus" onClick={()=>openReport()}>Report issue</Btn>}/>
  <div className="kgrid k7">
   <KPI label="Open issues" icon="wrench" value={open.length}/>
   <KPI label="Critical" icon="flame" value={open.filter(t=>t.severity==='Critical').length} alert={open.some(t=>t.severity==='Critical')}/>
   <KPI label="High priority" icon="alert" value={open.filter(t=>t.severity==='High').length}/>
   <KPI label="Technicians available" icon="users" value={techs.filter(s=>s.avail==='Available').length} sub={`of ${techs.length}`}/>
   <KPI label="Technicians busy" icon="refresh" value={techs.filter(s=>s.avail==='Busy').length}/>
   <KPI label="SLA breaches" icon="clock" value={all.filter(t=>t.breached).length} tone={all.some(t=>t.breached)?'critSoft':null} sub="Today"/>
   <KPI label="Avg. resolution" icon="check" value={avgRes+'m'} sub="Target 45 min" tone="ok"/>
  </div>
  <div className="g2-1">
   <div className="col g12"><div className="row" style={{justifyContent:'space-between'}}><Seg value={f} onChange={setF} options={[{v:'Open',l:`Open · ${open.length}`},{v:'Critical',l:'Critical'},{v:'Unassigned',l:'Unassigned'},{v:'Completed',l:'Completed'}]}/><span className="small muted">Sorted by severity, then SLA</span></div>
    {L.length?<div className="igrid">{L.map(t=><IssueCard key={t.id} t={t}/>)}</div>:<Panel><Empty icon="check" title={f==='Critical'?'No critical issues':'No issues here'} body={f==='Unassigned'?'Every open issue has a technician.':undefined}/></Panel>}</div>
   <Panel title="Technicians" sub="Matched by skill and availability">
    <div className="col">{techs.map(s=>{const act=Object.values(S.tasks).filter(t=>t.assignee===s.id&&active(t));const cur=act.find(t=>t.status==='In repair');
     return <button key={s.id} className="rrow" onClick={()=>openStaff(s.id)} style={{padding:'12px 0',alignItems:'flex-start'}}><Avatar name={s.name} size={36}/><span className="col" style={{flex:1,minWidth:0,textAlign:'left',gap:4}}><span className="row" style={{justifyContent:'space-between'}}><b>{s.name}</b><Avail a={s.avail}/></span><span className="small muted">{s.skills.join(' · ')}</span><span className="small">{cur?<>Repairing <b>Room {cur.room}</b>{act.length>1?` · ${act.length-1} queued`:''}</>:act.length?`${act.length} queued`:s.avail==='Available'?'Free for next issue':s.avail==='On Leave'?'On leave today':'Offline until 14:00'}</span></span></button>})}</div>
    <div className="alert warn small" style={{marginTop:8}}><Icon n="userx" s={16}/><div>No plumber on shift until 14:00. Plumbing issues are escalated to Rahul Deshpande.</div></div>
   </Panel>
  </div></div>;
}

function IssueDetail({id}){
 useNow(1000);const t=S.tasks[id];const [re,setRe]=useState(false);
 if(!t)return <div className="page"><Panel><Empty icon="wrench" title="Issue not found" action={<Btn onClick={()=>go('maint')}>Back to maintenance</Btn>}/></Panel></div>;
 const r=S.rooms[t.room],ev=S.log.filter(e=>e.room===t.room&&e.ts>=t.created-60000);const act=active(t);
 return <div className="page">
  <PageHead back={{label:'Maintenance',go:()=>go('maint')}} title={<span className="row g12" style={{flexWrap:'wrap'}}>Room {t.room}<span className="muted" style={{fontWeight:400}}>· {t.id}</span><TaskStatus s={t.status}/><Prio p={t.severity}/></span>} sub={`${t.category} · reported by ${t.reporter} at ${hm(t.created)} · ${r.type}, Floor ${r.floor}${r.guest?' · guest in room':''}`}
   right={act&&<>{t.status==='Assigned'&&<Btn icon="play" onClick={()=>A.start(t)}>Start repair</Btn>}{(t.status==='In repair'||t.status==='Assigned')&&<Btn v="primary" icon="check" onClick={()=>A.complete(t)}>Mark resolved</Btn>}<Btn icon="sliders" onClick={()=>openTask(t.id)}>More actions</Btn></>}/>
  {t.severity==='Critical'&&act&&<div className="alert crit big"><Icon n="flame" s={22} w={2}/><div className="col g4"><b style={{fontSize:16}}>Critical safety issue — emergency response active</b><span>{nmOf(t.assignee)||'Engineering'} and Security have been alerted. Rahul Deshpande and the Duty Manager were notified at {hm(t.created)}. If guests are at risk, move them out and call Security on ext. 100.</span></div></div>}
  {t.noTech&&!t.assignee&&act&&<div className="alert warn big"><Icon n="userx" s={22}/><div className="col g4"><b style={{fontSize:16}}>No technician available</b><span>The issue was escalated to Rahul Deshpande and stays in the queue. Assign someone manually, or it will be assigned when a {t.skill||t.category} technician comes on shift.</span><div className="row g8" style={{marginTop:6}}><Btn v="primary" sz="xs" onClick={()=>setRe(true)}>Assign manually</Btn><Btn sz="xs" onClick={()=>A.escalate(t)}>Notify supervisor again</Btn></div></div></div>}
  <div className="g2-1">
   <div className="col g20">
    <Panel title="Reported problem"><div className="quote" style={{fontSize:18}}>“{t.desc}”</div></Panel>
    <AIPanel t={t}/>
    {re&&<Panel title="Assign technician" right={<button className="link small" onClick={()=>setRe(false)}>Close</button>}><ReassignList t={t} onDone={()=>setRe(false)}/></Panel>}
   </div>
   <div className="col g20">
    <Panel title="SLA">{act?<SLA t={t} big/>:<div className="col g4"><b>{t.status}</b><span className="small muted">{t.done?`${hm(t.done)} · took ${dur(t.done-t.created)}`:''}</span></div>}</Panel>
    <Panel title="Technician" right={act&&<button className="link small" onClick={()=>setRe(!re)}>Reassign</button>}>{t.assignee?<div className="col g8"><Person id={t.assignee} sub={S.staff[t.assignee].role+' · '+S.staff[t.assignee].skills.join(', ')} size={40}/><div className="row g8"><AssignTag ai={t.ai}/><Avail a={S.staff[t.assignee].avail}/></div></div>:<span className="row g6" style={{color:'#a82b10',fontWeight:600}}><Icon n="userx" s={16}/>Unassigned</span>}</Panel>
    <Panel title="Audit trail"><Timeline events={ev} compact/></Panel>
   </div></div></div>;
}

// ------------ Report flow
const EX=['AC is not cooling','There is a gas smell in the room','Toilet keeps running','Bathroom light flickering'];
function ReportFlow({initialRoom='',onDone,compact,reporter}){
 const [room,setRoom]=useState(initialRoom),[desc,setDesc]=useState(''),[err,setErr]=useState({}),[phase,setPhase]=useState('form'),[step,setStep]=useState(0),[res,setRes]=useState(null);
 const aiDown=S.flags.aiDown;
 const STEPS=['Analyzing issue…','Understanding problem…','Determining urgency…','Finding technician…'];
 const submit=()=>{const e={};if(!S.rooms[room.trim()])e.room=room.trim()?`Room ${room.trim()} doesn’t exist at this property.`:'Enter the room number.';if(desc.trim().length<4)e.desc='Tell us what’s wrong in a few words.';setErr(e);if(Object.keys(e).length)return;
  if(S.flags.offline){setPhase('offline');return}
  setPhase('proc');setStep(0);[1,2,3,4].forEach(i=>setTimeout(()=>setStep(i),i*700));setTimeout(()=>{setRes(createIssue(room.trim(),desc.trim(),reporter));setPhase('result')},3000)};
 if(phase==='offline')return <div className="col g16"><div className="alert warn"><Icon n="wifioff" s={18}/><div><b>We couldn’t send this report.</b> You’re offline. Your report for Room {room} has been saved on this device and will be sent automatically when you reconnect.</div></div><Btn onClick={()=>setPhase('form')}>Back</Btn></div>;
 if(phase==='proc'){const forced=/gas|smoke|fire|burning|spark|flame/i.test(desc);return <div className="col g16" style={{padding:compact?0:'8px 0'}}><div className="row g12"><div className="spin"></div><div className="col"><b style={{fontSize:18}}>Maintenance Agent is on it</b><span className="small muted">Room {room} · “{desc}”</span></div></div>
  <div className="col g8">{STEPS.map((s,i)=>{const st=step>i?'done':step===i?'act':'wait';const down=aiDown&&i===1&&step>i;return <div key={s} className={'pstep '+st}><span className="pdot">{st==='done'?<Icon n={down?'cloudoff':'check'} s={14} w={2.4}/>:st==='act'?<span className="spin sm"></span>:null}</span><span style={{color:down?'#874e00':undefined}}>{down?'AI unavailable — applying safe default classification':i===2&&forced&&step>i?'Safety keyword found — forcing Critical':s}</span></div>})}</div></div>}
 if(phase==='result'&&res){const t=res,crit=t.severity==='Critical',none=!t.assignee,fb=t.fallback&&!t.forced;
  return <div className="col g16">
   {crit?<div className="alert crit big"><Icon n="flame" s={22} w={2}/><div className="col g4"><b style={{fontSize:16}}>Critical safety issue — emergency response started</b><span>{nmOf(t.assignee)||'Engineering'} and Security have been alerted. Rahul Deshpande has been notified. If guests are at risk, move them out and call Security on ext. 100.</span></div></div>
   :none?<div className="alert warn big"><Icon n="userx" s={22}/><div className="col g4"><b style={{fontSize:16}}>No technician available</b><span>Your report is saved and escalated to Rahul Deshpande. It will be assigned as soon as a technician is free. You don’t need to do anything else.</span></div></div>
   :fb?<div className="alert warn big"><Icon n="cloudoff" s={22}/><div className="col g4"><b style={{fontSize:16}}>Issue reported — queued for review</b><span>AI classification is temporarily unavailable. A default priority has been applied and the issue has been queued for review.</span></div></div>
   :<div className="alert ok big"><Icon n="check" s={22} w={2.4}/><div className="col g4"><b style={{fontSize:16}}>Technician assigned</b><span>{nmOf(t.assignee)} has been notified and is heading to Room {t.room}.</span></div></div>}
   <div className="resgrid"><div className="k">{fb?'Classification':'AI classification'}</div><div><b>{t.category}</b></div><div className="k">Severity</div><div className="row g8"><Prio p={t.severity}/>{t.forced&&<span className="small muted">Safety rule{t.aiSeverity?` · AI said ${t.aiSeverity}`:''}</span>}</div><div className="k">SLA</div><div>{t.sla} min</div><div className="k">Technician</div><div>{t.assignee?nmOf(t.assignee):<span style={{color:'#a82b10'}}>None available</span>}</div><div className="k">Status</div><div><TaskStatus s={t.status}/> <span className="small muted">{t.assignee?'Technician Assigned':'Escalated'}</span></div></div>
   {!fb&&<div className="small" style={{color:'var(--color-body)'}}><b>Why:</b> {t.why}</div>}
   <div className="row g8" style={{flexWrap:'wrap'}}>{!compact&&<Btn v="primary" onClick={()=>{onDone&&onDone();go('issue/'+t.id)}}>View issue</Btn>}<Btn onClick={()=>{setPhase('form');setDesc('');setRes(null)}}>Report another</Btn>{!compact&&<Btn v="tertiary" onClick={()=>{onDone&&onDone();go('ai')}}>See it in AI Operations</Btn>}</div>
  </div>}
 return <div className="col g16">
  {aiDown&&<div className="alert warn small"><Icon n="cloudoff" s={16}/><div>AI classification is temporarily unavailable. You can still report. A default priority will be applied and a supervisor will review it.</div></div>}
  <Input label="Room number" value={room} onChange={e=>setRoom(e.target.value.replace(/\D/g,'').slice(0,3))} error={err.room} placeholder="e.g. 204" inputMode="numeric" style={{fontSize:18,fontWeight:600,width:compact?'100%':160}}/>
  <div className="col g6"><label className="flabel" htmlFor="rdesc">Describe the problem</label><textarea id="rdesc" className={'ta'+(err.desc?' err':'')} rows={compact?4:5} placeholder="Describe the issue in your own words..." value={desc} onChange={e=>setDesc(e.target.value)}></textarea>{err.desc&&<span className="small" style={{color:'var(--color-error)'}}>{err.desc}</span>}
   <div className="row g6" style={{flexWrap:'wrap'}}><span className="small muted">Try:</span>{EX.map(x=><Chip key={x} onClick={()=>setDesc(x)}>{x}</Chip>)}</div></div>
  <div className="small muted row g6"><Icon n="bolt" s={14}/>No need to pick a category or urgency. The Maintenance Agent works that out.</div>
  <Btn v="primary" style={{height:48,fontSize:16}} onClick={submit}>Report Issue</Btn>
 </div>;
}
function ReportModal(){const r=S.ui.report;if(!r)return null;const close=()=>{S.ui.report=null;emit()};
 return <Modal open onClose={close} width={560}><div className="dhead"><div className="col g4"><div style={{fontSize:20,fontWeight:600}}>Report maintenance issue</div><div className="small muted">Reported as {ROLES[S.role].name}</div></div><button className="ib" onClick={close}><Icon n="x"/></button></div><div style={{padding:'4px 24px 24px'}}><ReportFlow initialRoom={r.room} onDone={close}/></div></Modal>}

Object.assign(window,{Housekeeping,Maintenance,IssueDetail,ReportFlow,ReportModal,IssueCard,HKCard});
})();
