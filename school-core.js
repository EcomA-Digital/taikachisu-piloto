/* Shared calendar logic: civil dates never depend on the browser's timezone. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SchoolCore=api;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const categoryMap={'secreto-del-estilo-taikachisu':'Filosofía','lao-ying':'Filosofía','que-es-taikachisu-wushu-kung-fu':'La escuela','nuestra-tecnica':'Técnica','la-practica-de-taikachisu':'Práctica','videos-de-taikachisu':'Práctica','nuestra-base-filosofica':'Filosofía','el-estilo-taikachisu':'Técnica','el-camino-del-practicante-de-artes-marciales':'Filosofía','la-filosofia-lo-simple':'Filosofía'};
  const escapeHTML=text=>String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize=text=>String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function validDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===value;}
  function nextDate(value){if(!validDate(value))throw new Error('Fecha inválida');const d=new Date(value+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
  function dateLabel(value,options={day:'numeric',month:'long',year:'numeric'}){return new Intl.DateTimeFormat('es-AR',{...options,timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));}
  function today(){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());const get=type=>parts.find(p=>p.type===type).value;return `${get('year')}-${get('month')}-${get('day')}`;}
  const eventTypes=event=>[...(event.title.includes('Torneo')?['torneo']:[]),...(event.title.includes('Examen')?['examen']:[])];
  const articleCategory=article=>article.category||categoryMap[article.slug]||'La escuela';
  const readingTime=article=>Math.max(1,Math.ceil(String(article.text||'').split(/\s+/).length/200));
  function filterEvents(events,{year='',type='',sede=''}={}){return events.filter(e=>e.published!==false&&(!year||e.date.startsWith(String(year)))&&(!type||eventTypes(e).includes(type))&&(!sede||e.sede===sede)).sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title));}
  const icsEscape=text=>String(text||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,');
  function foldLine(line){let result='',segment='',length=0;for(const char of line){const size=new TextEncoder().encode(char).length;if(length+size>74){result+=segment+'\r\n ';segment='';length=1;}segment+=char;length+=size;}return result+segment;}
  function calendarFile(events){const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Taikachisu//Calendario de la escuela//ES','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
    for(const event of events){if(!validDate(event.date))throw new Error('Fecha inválida');lines.push('BEGIN:VEVENT',`UID:${icsEscape(event.id)}@taikachisu.com`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z')}`);
      if(event.time&&/^\d{2}:\d{2}$/.test(event.time)){lines.push(`DTSTART;TZID=America/Argentina/Buenos_Aires:${event.date.replace(/-/g,'')}T${event.time.replace(':','')}00`);}
      else lines.push(`DTSTART;VALUE=DATE:${event.date.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${nextDate(event.date).replace(/-/g,'')}`);
      lines.push(`SUMMARY:${icsEscape(event.title)}`,`DESCRIPTION:${icsEscape([event.description,!event.time?'Horario a confirmar.':'',!event.location?'Lugar a confirmar.':''].filter(Boolean).join('\n'))}`);
      if(event.location)lines.push(`LOCATION:${icsEscape(event.location)}`);lines.push('END:VEVENT');
    }lines.push('END:VCALENDAR');return lines.map(foldLine).join('\r\n')+'\r\n';
  }
  function validateEvent(event){if(!event.title?.trim())throw new Error('Completá el nombre del evento.');if(!validDate(event.date))throw new Error('Indicá una fecha válida.');if(event.time&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(event.time))throw new Error('El horario debe tener formato HH:MM.');return true;}
  return {escapeHTML,normalize,validDate,nextDate,dateLabel,today,eventTypes,articleCategory,readingTime,filterEvents,calendarFile,validateEvent};
});
