(()=>{
const {useState,useMemo}=React;
const {Avatar,Card}=window.AirbnbDesignSystem_019df1;
const SEVI=s=>['Critical','High','Medium','Low'].indexOf(s);

// seed one historic trace per kind so the orchestrator view is never empty
(()=>{const b=Date.now();
 S.traces.push({id:'tr-305',kind:'issue',room:'305',title:'Maintenance issue reported',ts:b-4*MIN,steps:[{stage:'event',title:'Issue reported',detail:'“Burning smell from the wall socket near the desk” · Room 305',ts:b-4*MIN},{stage:'orch',title:'Orchestrator',detail:'Issue routed to Maintenance Agent',ts:b-4*MIN+1000},{stage:'mt',title:'Maintenance Agent',detail:'Safety / Electrical · High · 10 min SLA',ts:b-4*MIN+4000},{stage:'rule',title:'Safety rule',detail:'HIGH → CRITICAL · immediate escalation',ts:b-4*MIN+6000},{stage:'task',title:'Task created',detail:'MT-1181 · Maintenance · Critical',ts:b-4*MIN+7000},{stage:'person',title:'Vikram Rane',detail:'Assigned automatically · Rahul Deshpande notified',ts:b-4*MIN+8000}]});
 S.traces.push({id:'tr-520',kind:'checkout',room:'520',title:'Guest checked out',ts:b-9*MIN,steps:[{stage:'event',title:'Guest checked out',detail:'Room 520 · from PMS',ts:b-9*MIN},{stage:'orch',title:'Orchestrator',detail:'Checkout event routed to Room Readiness',ts:b-9*MIN+1300},{stage:'rr',title:'Room Readiness Agent',detail:'Marked DIRTY · High priority · VIP arrival in 1h 49m',ts:b-9*MIN+2600},{stage:'hk',title:'Housekeeping Agent',detail:'Looking for an available attendant',ts:b-9*MIN+3900},{stage:'task',title:'Task created',detail:'Cleaning · High · 50 min',ts:b-9*MIN+5200},{stage:'person',title:'Lata Chavan',detail:'Assigned automatically · on Floor 5 · suites skill',ts:b-9*MIN+5200}]});
})();

const STAGES={checkout:[['event','Event','logout'],['orch','Orchestrator','nodes'],['rr','Room Readiness Agent','bed'],['hk','Housekeeping Agent','brush'],['task','Task created','tasks'],['person','Assigned to','user']],
 issue:[['event','Event','wrench'],['orch','Orchestrator','nodes'],['mt','Maintenance Agent','bolt'],['rule','Safety rules','shield'],['task','Task created','tasks'],['person','Assigned to','user']]};
function Flow({tr}){
 useNow(500);const stg=STAGES[tr.kind].filter(s=>s[0]!=='rule'||tr.steps.some(x=>x.stage==='rule')||/gas|smoke|fire|burning|spark/i.test(tr.steps[0]?.detail||''));
 const doneN=stg.filter(s=>tr.steps.some(x=>x.stage===s[0])).length;const complete=doneN===stg.length;
 return <div className="flow">{stg.map(([k,label,ic],i)=>{const st=tr.steps.find(x=>x.stage===k);const state=st?'done':i===doneN?'act':'wait';const crit=k==='rule'&&st;const warn=k==='person'&&st&&/^No /.test(st.title);
  return <div key={k} className={'fnode '+state}>
   <div className="frail"><span className="fdot" style={crit?{background:'#c13515',borderColor:'#c13515'}:warn?{background:'#d9772b',borderColor:'#d9772b'}:null}><Icon n={ic} s={16} w={2} c={state==='wait'?'#929292':'#fff'}/></span>{i<stg.length-1&&<span className={'fline'+(state==='done'&&i+1===doneN&&!complete?' flowing':'')+(state==='done'&&i+1<doneN?' full':'')}></span>}</div>
   <div className="fcont"><div className="flabel2">{label}</div>{st?<><div style={{fontWeight:600,fontSize:16,color:crit?'#a82b10':undefined}}>{st.title}</div><div className="small" style={{color:'var(--color-body)'}}>{st.detail}</div></>:state==='act'?<div className="small muted row g6"><span className="spin sm"></span>Working…</div>:<div className="small muted">Waiting</div>}</div>
   <div className="small muted num" style={{width:64,textAlign:'right'}}>{st?hm(st.ts)+':'+String(new Date(st.ts).getSeconds()).padStart(2,'0'):''}</div></div>})}</div>;
}
function AIOps(){
 useNow(1000);const [sel,setSel]=useState(null);const [who,setWho]=useState('All');
 const tr=S.traces.find(t=>t.id===sel)||S.traces[0];
 const ts=Object.values(S.tasks).filter(active);
 const activeN={orch:S.traces.filter(t=>t.steps.length<6&&Date.now()-t.ts<20000).length,rr:Object.values(S.rooms).filter(r=>r.status==='Dirty').length,hk:ts.filter(t=>t.type!=='Maintenance').length,mt:ts.filter(t=>t.type==='Maintenance').length};
 const feed=S.log.filter(e=>e.kind==='AI Agent'||e.kind==='System').filter(e=>who==='All'||(e.actor||'').startsWith(who));
 const due=Object.values(S.rooms).find(r=>r.status==='Occupied'&&r.dueOut)||Object.values(S.rooms).find(r=>r.status==='Occupied');
 return <div className="page">
  <PageHead title="AI Operations" sub={S.flags.aiDown?'Maintenance Agent running on fallback rules. Other agents operating normally.':'4 agents operating normally. Humans supervise and step in on exceptions.'} right={<><Btn icon="logout" onClick={()=>{checkout(due.id);setSel(null)}}>Simulate checkout · Room {due.id}</Btn><Btn v="primary" icon="plus" onClick={()=>openReport()}>Report issue</Btn></>}/>
  <div className="agrid">{Object.values(S.agents).map(a=>{const deg=a.id==='mt'&&S.flags.aiDown;return <Card key={a.id} padded={false} style={{padding:20,display:'flex',flexDirection:'column',gap:14,background:'#fff',border:a.current?'1px solid #222':'1px solid #dddddd'}}>
   <div className="row" style={{justifyContent:'space-between',alignItems:'flex-start'}}><div className="col g4"><b style={{fontSize:16}}>{a.name}{a.id!=='orch'?' Agent':''}</b><span className="small muted">{a.desc}</span></div></div>
   <div>{deg?<Pill tone="warn" icon="cloudoff">Fallback rules</Pill>:a.current?<Pill tone="ink"><Dot c="#fff" pulse/>Processing</Pill>:<Pill tone="ok"><Dot c="#17693f"/>Active</Pill>}</div>
   <div className="dl tight"><div>Currently</div><div>{a.current||'Listening for events'}</div><div>Last action</div><div>{a.last}</div><div>Last run</div><div className="num">{Math.max(1,Math.round((Date.now()-a.lastTs)/1000))<60?Math.max(1,Math.round((Date.now()-a.lastTs)/1000))+' sec ago':ago(a.lastTs)}</div></div>
   <div className="row" style={{borderTop:'1px solid var(--color-hairline-soft)',paddingTop:12,gap:0}}>{[['Active',activeN[a.id]],['Processed',a.processed],['Success',a.success+'%']].map(([l,v],i)=><div key={l} className="col" style={{flex:1,gap:2,borderLeft:i?'1px solid var(--color-hairline-soft)':'none',paddingLeft:i?12:0}}><span className="num" style={{fontSize:18,fontWeight:600}}>{v}</span><span className="small muted">{l}</span></div>)}</div>
  </Card>})}</div>
  <Panel title="Orchestration" sub="How each event moves through the agents" pad={false}>
   <div className="orch">
    <div className="trlist">{S.traces.slice(0,10).map(t=>{const on=tr&&t.id===tr.id;const n=STAGES[t.kind].length-(t.kind==='issue'&&!t.steps.some(x=>x.stage==='rule')&&t.steps.length>=5?1:0);const run=t.steps.length<n;
     return <button key={t.id} className={'tri'+(on?' on':'')} onClick={()=>setSel(t.id)}><span className="nic" style={{background:on?'#222':'#f2f2f2',color:on?'#fff':'#222'}}><Icon n={t.kind==='checkout'?'logout':'wrench'} s={15}/></span><span className="col" style={{flex:1,minWidth:0,gap:2,textAlign:'left'}}><b className="ell">{t.title}</b><span className="small muted">Room {t.room} · {hm(t.ts)}</span></span>{run?<span className="spin sm"></span>:t.steps.some(x=>x.stage==='rule')?<Pill tone="crit">Critical</Pill>:<Icon n="check" s={16} c="#17693f"/>}</button>})}</div>
    <div style={{padding:24,minWidth:0}}>{tr?<><div className="row" style={{justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}><div className="col g4"><b style={{fontSize:18}}>{tr.title} · Room {tr.room}</b><span className="small muted">Started {hm(tr.ts)} · {tr.steps.length} steps</span></div><Btn sz="xs" onClick={()=>go('room/'+tr.room)}>Open room</Btn></div><Flow tr={tr}/></>:<Empty icon="nodes" title="No events yet" body="Simulate a checkout to watch the agents coordinate."/>}</div>
   </div>
  </Panel>
  <Panel title="Agent activity feed" sub="Every agent and system decision, newest first" right={<Seg value={who} onChange={setWho} options={[{v:'All',l:'All'},{v:'Orchestrator',l:'Orchestrator'},{v:'Room Readiness',l:'Room Readiness'},{v:'Housekeeping',l:'Housekeeping'},{v:'Maintenance',l:'Maintenance'}]}/>}><Timeline events={feed} max={25}/></Panel>
 </div>;
}

// ------------ Tasks
function Tasks(){
 useNow(5000);
 const [f,setF]=useState({q:'',type:'All',status:'Open',prio:'All',as:'All',floor:'All',sla:'All',staff:'All'});const [sort,setSort]=useState({k:'prio',d:1});const [sel,setSel]=useState(new Set());const [pg,setPg]=useState(0);
 const set=(k,v)=>{setF({...f,[k]:v});setPg(0)};
 let L=Object.values(S.tasks).filter(t=>(f.type==='All'||t.type===f.type)&&(f.status==='All'||(f.status==='Open'?active(t):t.status===f.status))&&(f.prio==='All'||t.prio===f.prio)&&(f.as==='All'||(f.as==='AI'?t.ai:!t.ai))&&(f.floor==='All'||S.rooms[t.room].floor==+f.floor)&&(f.staff==='All'||t.assignee===f.staff)&&(f.sla==='All'||(f.sla==='Breached'?t.breached:(active(t)&&!t.breached&&(t.type!=='Cleaning'||t.started)&&deadline(t)-Date.now()<t.sla*MIN*.25)))&&(!f.q||(t.id+' '+t.room+' '+(t.desc||'')+' '+(nmOf(t.assignee)||'')).toLowerCase().includes(f.q.toLowerCase())));
 const key={prio:t=>SEVI(t.prio),created:t=>-t.created,sla:t=>active(t)?deadline(t):9e15,room:t=>+t.room,status:t=>t.status};
 L.sort((a,b)=>{const x=key[sort.k](a),y=key[sort.k](b);return (x>y?1:x<y?-1:0)*sort.d||b.created-a.created});
 const P=25,page=L.slice(pg*P,pg*P+P);
 const th=(k,l)=><th className="sortable" onClick={()=>setSort({k,d:sort.k===k?-sort.d:1})}>{l}{sort.k===k&&<Icon n="down" s={12} style={{transform:sort.d<0?'rotate(180deg)':'none',marginLeft:4}}/>}</th>;
 const selT=[...sel].map(id=>S.tasks[id]).filter(Boolean);
 const staffOpts=[{v:'All',l:'Any staff'},...Object.values(S.staff).filter(s=>['Housekeeping','Maintenance','Supervisors'].includes(s.cat)).map(s=>({v:s.id,l:s.name}))];
 return <div className="page">
  <PageHead title="Tasks" sub={`${Object.values(S.tasks).filter(active).length} open · ${Object.values(S.tasks).filter(t=>active(t)&&t.ai).length} assigned by agents`}/>
  <div className="fbar"><div className="search sm"><Icon n="search" s={15} c="#6a6a6a"/><input placeholder="Task, room, staff" value={f.q} onChange={e=>set('q',e.target.value)}/></div>
   <Seg value={f.type} onChange={v=>set('type',v)} options={['All','Cleaning','Maintenance','Inspection']}/>
   <Sel value={f.status} onChange={v=>set('status',v)} options={[{v:'Open',l:'Open tasks'},{v:'All',l:'Any status'},'Unassigned','Assigned','Cleaning','In repair','Inspection Required','Blocked','Completed','Cancelled']}/>
   <Sel value={f.prio} onChange={v=>set('prio',v)} options={[{v:'All',l:'Any priority'},'Critical','High','Medium','Low']}/>
   <Sel value={f.as} onChange={v=>set('as',v)} options={[{v:'All',l:'AI or manual'},{v:'AI',l:'AI assigned'},{v:'Manual',l:'Manual'}]}/>
   <Sel value={f.sla} onChange={v=>set('sla',v)} options={[{v:'All',l:'Any SLA'},{v:'Risk',l:'At risk'},{v:'Breached',l:'Breached'}]}/>
   <Sel value={f.floor} onChange={v=>set('floor',v)} options={[{v:'All',l:'All floors'},'1','2','3','4','5']}/>
   <Sel value={f.staff} onChange={v=>set('staff',v)} options={staffOpts}/></div>
  {sel.size>0&&<div className="bulk"><b>{sel.size} selected</b><Sel value="" onChange={v=>{if(v){selT.forEach(t=>A.priority(t,v));}}} options={[{v:'',l:'Change priority…'},'Critical','High','Medium','Low']}/><Sel value="" onChange={v=>{if(v)selT.forEach(t=>A.reassign(t,v))}} options={[{v:'',l:'Reassign to…'},...staffOpts.slice(1).filter(o=>['Available','Busy'].includes(S.staff[o.v].avail))]}/><Btn sz="xs" icon="lock" onClick={()=>selT.forEach(t=>A.block(t,'Bulk: marked blocked'))}>Mark blocked</Btn><Btn sz="xs" icon="alert" onClick={()=>selT.forEach(t=>A.escalate(t))}>Escalate</Btn><div style={{flex:1}}></div><button className="link small" style={{color:'#fff'}} onClick={()=>setSel(new Set())}>Clear selection</button></div>}
  <Panel pad={false}>{!L.length?<Empty icon="tasks" title="No tasks match" body="Try widening the filters." action={<Btn onClick={()=>setF({q:'',type:'All',status:'All',prio:'All',as:'All',floor:'All',sla:'All',staff:'All'})}>Clear filters</Btn>}/>:<>
   <div className="tscroll"><table className="tbl"><thead><tr><th style={{width:36}}><input type="checkbox" checked={page.length>0&&page.every(t=>sel.has(t.id))} onChange={e=>{const n=new Set(sel);page.forEach(t=>e.target.checked?n.add(t.id):n.delete(t.id));setSel(n)}}/></th><th>Task</th><th>Type</th>{th('room','Room')}<th>Assigned to</th>{th('prio','Priority')}{th('status','Status')}{th('created','Created')}{th('sla','SLA')}<th></th></tr></thead>
   <tbody>{page.map(t=><tr key={t.id} className={'click'+(sel.has(t.id)?' sel':'')} onClick={()=>openTask(t.id)}><td onClick={e=>e.stopPropagation()}><input type="checkbox" checked={sel.has(t.id)} onChange={()=>{const n=new Set(sel);n.has(t.id)?n.delete(t.id):n.add(t.id);setSel(n)}}/></td>
    <td><div className="col" style={{gap:2,maxWidth:280}}><b className="num">{t.id}</b><span className="small muted ell">{t.type==='Maintenance'?t.desc:t.title||'Room turnover clean'}</span></div></td><td>{t.type}</td><td className="num"><b>{t.room}</b></td>
    <td><div className="col g4"><Person id={t.assignee} size={24}/><span>{t.assignee&&<AssignTag ai={t.ai}/>}</span></div></td><td><Prio p={t.prio}/></td><td><TaskStatus s={t.status}/></td><td className="num small">{hm(t.created)}<div className="muted">{ago(t.created)}</div></td><td><SLA t={t}/></td><td><Icon n="right" s={16} c="#929292"/></td></tr>)}</tbody></table></div>
   <div className="row" style={{justifyContent:'space-between',padding:'12px 20px'}}><span className="small muted">Showing {pg*P+1}–{Math.min(L.length,pg*P+P)} of {L.length}</span><div className="row g8"><Btn sz="xs" disabled={pg===0} onClick={()=>setPg(pg-1)}>Previous</Btn><Btn sz="xs" disabled={(pg+1)*P>=L.length} onClick={()=>setPg(pg+1)}>Next</Btn></div></div></>}</Panel>
 </div>;
}

// ------------ Staff
function Staff(){
 const [cat,setCat]=useState('All');useNow(10000);
 const all=Object.values(S.staff),L=all.filter(s=>cat==='All'||s.cat===cat);
 const cnt=a=>L.filter(s=>s.avail===a).length;
 return <div className="page">
  <PageHead title="Staff" sub="Availability and skills here drive every AI assignment"/>
  <div className="row g12" style={{justifyContent:'space-between',flexWrap:'wrap'}}><Seg value={cat} onChange={setCat} options={['All','Housekeeping','Maintenance','Supervisors','Managers'].map(c=>({v:c,l:`${c} · ${c==='All'?all.length:all.filter(s=>s.cat===c).length}`}))}/>
   <div className="row g16 small">{['Available','Busy','Offline','On Leave'].map(a=><span key={a} className="row g6"><Dot c={AVAIL_C[a]}/>{a} <b className="num">{cnt(a)}</b></span>)}</div></div>
  <Panel pad={false}><div className="tscroll"><table className="tbl"><thead><tr><th>Name</th><th>Availability</th><th>Current task</th><th>Skills</th><th>Location</th><th>Completed today</th><th>Workload</th></tr></thead><tbody>
   {L.map(s=>{const act=Object.values(S.tasks).filter(t=>t.assignee===s.id&&active(t));const cur=act.find(t=>['Cleaning','In repair'].includes(t.status))||act[0];
    return <tr key={s.id} className="click" onClick={()=>openStaff(s.id)}><td><Person id={s.id} sub={s.role} size={32}/></td><td><Avail a={s.avail}/></td>
    <td>{cur?<span className="col" style={{gap:2}}><span>Room <b className="num">{cur.room}</b> · {cur.type}</span><span className="small muted">{cur.status}</span></span>:<span className="muted">—</span>}</td>
    <td><div className="row g4" style={{flexWrap:'wrap',maxWidth:220}}>{s.skills.map(k=><Pill key={k} tone="muted">{k}</Pill>)}</div></td><td>{typeof s.floor==='number'?'Floor '+s.floor:s.floor}</td><td className="num">{s.done}</td>
    <td><div className="row g8"><div className="bar" style={{width:80}}><i style={{width:Math.min(100,act.length*25)+'%',background:act.length>=4?'#d9772b':'#222'}}></i></div><span className="small num">{act.length}</span></div></td></tr>})}</tbody></table></div></Panel>
 </div>;
}

// ------------ Issues (exceptions)
function Issues(){
 useNow(5000);const items=getAttention();
 const G=[[0,'Critical','flame'],[1,'Overdue or unassigned','clock'],[2,'Review, blocked and priority','bolt']];
 return <div className="page"><PageHead title="Issues" sub="Everything that needs a human decision. When this list is empty, the hotel is running itself."/>
  {!items.length?<Panel><Empty icon="check" title="No exceptions" body="Agents are handling all open work."/></Panel>:G.map(([lv,l])=>{const L=items.filter(i=>i.level===lv);if(!L.length)return null;return <Panel key={lv} title={`${l} · ${L.length}`}><AttentionList items={L} max={50}/></Panel>})}</div>;
}

// ------------ Activity log
function ActivityLog(){
 useNow(10000);const [k,setK]=useState('All'),[q,setQ]=useState(''),[type,setType]=useState('All'),[n,setN]=useState(60);
 const types=[...new Set(S.log.map(e=>e.type))].sort();
 const L=S.log.filter(e=>(k==='All'||e.kind===k)&&(type==='All'||e.type===type)&&(!q||(e.room||'').includes(q)||(e.action+' '+e.actor+' '+e.result).toLowerCase().includes(q.toLowerCase())));
 return <div className="page"><PageHead title="Activity log" sub="Complete audit trail of agent, system and human actions" right={<Btn icon="dl" onClick={()=>toast('success','Export started','activity-log.csv will download shortly.')}>Export CSV</Btn>}/>
  <div className="fbar"><div className="search sm"><Icon n="search" s={15} c="#6a6a6a"/><input placeholder="Room, person or text" value={q} onChange={e=>setQ(e.target.value)}/></div><Seg value={k} onChange={setK} options={['All','AI Agent','System','Staff','Supervisor']}/><Sel value={type} onChange={setType} options={[{v:'All',l:'All event types'},...types]}/></div>
  <Panel pad={false}>{!L.length?<Empty icon="list" title="No events match"/>:<div className="tscroll"><table className="tbl"><thead><tr><th>Time</th><th>Event</th><th>Actor</th><th>Room</th><th>Action</th><th>Result</th></tr></thead><tbody>
   {L.slice(0,n).map(e=><tr key={e.id} className={e.type==='Human override'?'hl':e.type==='SLA breached'||e.type==='Safety rule applied'?'hlc':''}><td className="num small">{hm(e.ts)}:{String(new Date(e.ts).getSeconds()).padStart(2,'0')}</td><td><b>{e.type}</b></td><td><div className="col" style={{gap:2}}><span>{e.actor}</span><KindTag k={e.kind}/></div></td><td className="num">{e.room?<button className="link" onClick={()=>go('room/'+e.room)}>{e.room}</button>:'—'}</td><td style={{maxWidth:360}}>{e.action}</td><td className="small" style={{color:'var(--color-body)',maxWidth:300}}>{e.result}</td></tr>)}</tbody></table></div>}
   {L.length>n&&<div style={{padding:16,textAlign:'center'}}><Btn sz="xs" onClick={()=>setN(n+60)}>Load more</Btn></div>}</Panel></div>;
}

// ------------ Reports
const DAYS=['Wed','Thu','Fri','Sat','Sun','Mon','Today'];
function Bars({data,max,fmt=v=>v,target,color='#222',h=160}){return <div className="bars" style={{height:h}}>{target&&<div className="tgt" style={{bottom:target/max*100+'%'}}><span>Target {fmt(target)}</span></div>}{data.map(([l,v,v2],i)=><div key={i} className="bc"><div className="bstack" title={fmt(v)}>{v2!=null&&<i style={{height:v2/max*100+'%',background:'#ff385c'}}></i>}<i style={{height:v/max*100+'%',background:target&&v>target?'#d9772b':color}}></i></div><span className="small muted">{l}</span></div>)}</div>}
function HBars({data,max=100,suffix='%'}){return <div className="col g12">{data.map(([l,v,c])=><div key={l} className="col g4"><div className="row small" style={{justifyContent:'space-between'}}><span>{l}</span><b className="num">{v}{suffix}</b></div><div className="bar" style={{height:8}}><i style={{width:v/max*100+'%',background:c||'#222'}}></i></div></div>)}</div>}
function Reports(){
 const [rng,setRng]=useState('7 days');
 return <div className="page"><PageHead title="Reports" sub="Voyage Grand, Pune · operational performance" right={<><Seg value={rng} onChange={setRng} options={['Today','7 days','30 days']}/><Btn icon="dl" onClick={()=>toast('success','Report exported','Operations summary saved as PDF.')}>Export</Btn></>}/>
  <div className="kgrid k5">
   <KPI label="Automation rate" icon="bolt" value="94.2%" sub="▲ 2.1 pts vs last week" tone="ok"/>
   <KPI label="AI assigned tasks" icon="nodes" value="1,284" sub="of 1,363 tasks"/>
   <KPI label="Human overrides" icon="user" value="37" sub="2.9% of AI decisions"/>
   <KPI label="Avg. response time" icon="clock" value="3m 40s" sub="Report → technician on the way"/>
   <KPI label="Avg. resolution time" icon="check" value="42 min" sub="▼ 6 min vs last week" tone="ok"/>
  </div>
  <div className="g2">
   <Panel title="Automation vs human intervention" sub="Tasks per day · dark = assigned by agents, red = needed a person"><Bars data={DAYS.map((d,i)=>[d,[168,181,204,221,196,173,151][i]-[7,5,9,6,4,3,9][i],[7,5,9,6,4,3,9][i]])} max={240}/></Panel>
   <Panel title="Room turnaround time" sub="Checkout to Ready, average minutes"><Bars data={DAYS.map((d,i)=>[d,[52,47,58,49,44,41,43][i]])} max={70} target={50} fmt={v=>v+' min'}/></Panel>
   <Panel title="SLA compliance by category" sub="Issues resolved within SLA"><HBars data={[['Safety (Critical)',100,'#17693f'],['HVAC',91],['Electrical',94],['Access / Locks',97],['Plumbing',72,'#d9772b'],['IT / AV',98]]}/></Panel>
   <Panel title="Critical issue response" sub="Time from report to responder on site"><div className="col g12">{[['Today','Room 305 · burning smell','2 min 10 s'],['Sat','Room 118 · smoke detector','3 min 02 s'],['Thu','Kitchen · gas smell','1 min 48 s']].map(r=><div key={r[1]} className="row g12"><span className="small muted" style={{width:44}}>{r[0]}</span><span style={{flex:1}}>{r[1]}</span><b className="num">{r[2]}</b></div>)}<div className="small muted" style={{borderTop:'1px solid var(--color-hairline-soft)',paddingTop:10}}>Target: responder on site within 5 minutes. Met 12 of 12 times this month.</div></div></Panel>
   <Panel title="Tasks completed vs overdue" sub="Per day"><Bars data={DAYS.map((d,i)=>[d,[160,176,190,214,190,170,118][i],[8,5,14,7,6,3,4][i]])} max={240}/><div className="row g16 small muted" style={{marginTop:8}}><span className="row g6"><span className="sw" style={{background:'#222'}}></span>Completed</span><span className="row g6"><span className="sw" style={{background:'#ff385c'}}></span>Overdue</span></div></Panel>
   <Panel title="Staff utilization" sub="Share of shift on assigned work"><HBars data={[['Priya Deshmukh',86],['Lata Chavan',84],['Anjali More',81],['Kavita Jadhav',78],['Rakesh Jadhav',74],['Vikram Rane',92,'#d9772b'],['Sunil More',58]]}/></Panel>
  </div>
  <Panel title="Average cleaning duration by room type"><div className="row g24" style={{flexWrap:'wrap'}}>{[['Deluxe King','28 min','30'],['Deluxe Twin','31 min','30'],['Executive','37 min','40'],['Suite','52 min','50']].map(r=><div key={r[0]} className="col g4" style={{minWidth:140}}><span className="small muted">{r[0]}</span><span className="num" style={{fontSize:24,fontWeight:600}}>{r[1]}</span><span className="small muted">Standard {r[2]} min</span></div>)}</div></Panel>
 </div>;
}
Object.assign(window,{AIOps,Tasks,Staff,Issues,ActivityLog,Reports,Flow});
})();
