// Funkcje do pracy z harmonogramem "Pon 19:00-23:00, Pt 20:00-02:00"

export const DAY_MAP = { "Pon":1,"Wt":2,"Śr":3,"Czw":4,"Pt":5,"Sob":6,"Nd":7 };
export const DAY_NAMES = ["","Pon","Wt","Śr","Czw","Pt","Sob","Nd"];

export function todayIdx(date=new Date()){
  const d = date.getDay(); return d===0?7:d; // 1..7 (Pon..Nd)
}
export function parseHHMM(t){
  const [h,m]=t.split(':').map(n=>parseInt(n,10)); return h*60+m;
}
export function toHHMM(m){
  const h=String(Math.floor(m/60)).padStart(2,'0'); const mm=String(m%60).padStart(2,'0'); return `${h}:${mm}`;
}
export function parseSchedule(str){
  const items=[]; if(!str) return items;
  str.split(',').map(s=>s.trim()).forEach(seg=>{
    const m = seg.match(/^([A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻż]{2,3})\s+(\d{2}:\d{2})-(\d{2}:\d{2})$/);
    if(!m) return;
    const day=DAY_MAP[m[1]]; if(!day) return;
    items.push({day, start:m[2], end:m[3]});
  });
  return items;
}

export function computeNextOccurrence(scheduleString, now=new Date()){
  const sched = parseSchedule(scheduleString);
  if(!sched.length) return null;
  const nowDay = todayIdx(now);
  const nowMin = now.getHours()*60 + now.getMinutes();
  let best=null;

  for(let add=0; add<14; add++){
    const dIdx = ((nowDay-1+add)%7)+1;
    for(const it of sched){
      if(it.day!==dIdx) continue;
      const s=parseHHMM(it.start), e=parseHHMM(it.end);
      const crosses = e<=s;
      let startMin = s, endMin = e;
      let startAbs = new Date(now); startAbs.setHours(0,0,0,0); startAbs.setDate(startAbs.getDate()+add);
      startAbs = new Date(startAbs.getTime() + startMin*60*1000);
      let endAbs = new Date(startAbs);
      endAbs = new Date(endAbs.getTime() + ((crosses? ((e+24*60) - s) : (e - s)))*60*1000);

      let status = "future";
      if(add===0){
        let todayStart = startAbs, todayEnd = endAbs;
        if(crosses && nowMin < e){
          todayStart = new Date(todayStart.getTime() - 24*60*60*1000);
          todayEnd   = new Date(todayEnd.getTime()   - 24*60*60*1000);
        }
        if(now >= todayStart && now <= todayEnd) status="ongoing";
        else if(now < todayStart) status="today-upcoming";
      }
      const candidate = {start:startAbs, end:endAbs, status, day:dIdx};
      if(!best) best=candidate;
      else{
        if(best.status==="ongoing") continue;
        if(candidate.start < best.start) best=candidate;
      }
    }
    if(best && (best.status==="ongoing" || best.status==="today-upcoming")) break;
  }
  return best;
}

export function haversine(lat1,lon1,lat2,lon2){
  const R=6371, toRad=x=>x*Math.PI/180;
  const dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

export function minutesToHuman(min){
  if(min<=0) return "0 min";
  const h=Math.floor(min/60), m=min%60;
  if(h>0 && m>0) return `${h}h ${m}m`;
  if(h>0) return `${h}h`;
  return `${m}m`;
}
