(function(global){
  'use strict';
  const td=new TextDecoder('utf-8');
  const u16=(v,o)=>v.getUint16(o,true),u32=(v,o)=>v.getUint32(o,true);
  function decodeXml(s){return String(s??'').replace(/&#(x?[0-9a-f]+);|&(amp|lt|gt|quot|apos);/gi,(m,num,named)=>{if(num){const n=num[0].toLowerCase()==='x'?parseInt(num.slice(1),16):parseInt(num,10);return String.fromCodePoint(n);}return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[named.toLowerCase()];});}
  function attr(src,name){const m=String(src).match(new RegExp('(?:^|\\s)'+name.replace(':','\\:')+'\\s*=\\s*["\\\']([^"\\\']*)["\\\']','i'));return m?decodeXml(m[1]):'';}
  async function inflate(bytes){
    if(typeof DecompressionStream==='undefined')throw new Error('Browser ini belum mendukung pembacaan XLSX offline. Gunakan CSV atau browser Chrome/Edge terbaru.');
    let last;
    for(const format of ['deflate-raw','deflate']){try{return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format))).arrayBuffer());}catch(e){last=e;}}
    throw last||new Error('Data XLSX terkompresi tidak dapat dibaca.');
  }
  async function unzip(buffer){
    const bytes=new Uint8Array(buffer),view=new DataView(buffer);let eocd=-1;
    for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){if(u32(view,i)===0x06054b50){eocd=i;break;}}
    if(eocd<0)throw new Error('File bukan XLSX/ZIP yang valid.');
    const count=u16(view,eocd+10),central=u32(view,eocd+16),entries=new Map();let p=central;
    for(let n=0;n<count;n++){
      if(u32(view,p)!==0x02014b50)throw new Error('Struktur XLSX tidak valid.');
      const method=u16(view,p+10),size=u32(view,p+20),nameLen=u16(view,p+28),extraLen=u16(view,p+30),commentLen=u16(view,p+32),local=u32(view,p+42),name=td.decode(bytes.slice(p+46,p+46+nameLen));
      const localNameLen=u16(view,local+26),localExtraLen=u16(view,local+28),start=local+30+localNameLen+localExtraLen,compressed=bytes.slice(start,start+size);
      entries.set(name,{method,compressed});p+=46+nameLen+extraLen+commentLen;
    }
    const cache=new Map();
    return async name=>{name=String(name).replace(/^\//,'');if(cache.has(name))return cache.get(name);const e=entries.get(name);if(!e)return null;const data=e.method===0?e.compressed:e.method===8?await inflate(e.compressed):(()=>{throw new Error('Metode kompresi XLSX tidak didukung.');})();const text=td.decode(data);cache.set(name,text);return text;};
  }
  function colIndex(ref){const m=String(ref).match(/^([A-Z]+)/i);if(!m)return 0;let n=0;for(const ch of m[1].toUpperCase())n=n*26+ch.charCodeAt(0)-64;return n-1;}
  function parseShared(xml){if(!xml)return[];return [...xml.matchAll(/<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>/gi)].map(m=>[...m[1].matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/gi)].map(x=>decodeXml(x[1])).join(''));}
  function parseSheet(xml,shared){
    const rows=[]; if(!xml)return rows;
    for(const rm of xml.matchAll(/<(?:\w+:)?row\b[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/gi)){
      const row=[];
      for(const cm of rm[1].matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/\s*>|>([\s\S]*?)<\/(?:\w+:)?c>)/gi)){
        const attrs=cm[1]||'',body=cm[2]||'',ref=attr(attrs,'r'),type=attr(attrs,'t');let value='';
        const vm=body.match(/<(?:\w+:)?v\b[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/i),inline=[...body.matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/gi)].map(x=>decodeXml(x[1])).join('');
        const raw=vm?decodeXml(vm[1]):inline;
        if(type==='s')value=shared[Number(raw)]??'';else if(type==='b')value=raw==='1'?'TRUE':'FALSE';else value=raw;
        row[colIndex(ref)]=value;
      }
      while(row.length&&row[row.length-1]===undefined)row.pop();for(let i=0;i<row.length;i++)if(row[i]===undefined)row[i]='';rows.push(row);
    }
    return rows;
  }
  function normalizeTarget(target){let raw=String(target||'').replace(/^\//,'');if(!raw.startsWith('xl/'))raw='xl/'+raw;const parts=raw.split('/'),out=[];for(const p of parts){if(!p||p==='.')continue;if(p==='..')out.pop();else out.push(p);}return out.join('/');}
  async function read(buffer){
    const get=await unzip(buffer),workbook=await get('xl/workbook.xml');if(!workbook)throw new Error('Workbook XLSX tidak ditemukan.');
    const relXml=await get('xl/_rels/workbook.xml.rels')||'',rels={};for(const m of relXml.matchAll(/<(?:\w+:)?Relationship\b([^>]*?)\/?\s*>/gi))rels[attr(m[1],'Id')]=normalizeTarget(attr(m[1],'Target'));
    const shared=parseShared(await get('xl/sharedStrings.xml'));
    const sheets=[];for(const m of workbook.matchAll(/<(?:\w+:)?sheet\b([^>]*?)\/?\s*>/gi)){const name=attr(m[1],'name')||`Sheet ${sheets.length+1}`,rid=attr(m[1],'r:id'),path=rels[rid];if(path)sheets.push({name,rows:parseSheet(await get(path),shared)});}
    if(!sheets.length){let i=1;while(true){const xml=await get(`xl/worksheets/sheet${i}.xml`);if(!xml)break;sheets.push({name:`Sheet ${i}`,rows:parseSheet(xml,shared)});i++;}}
    return sheets;
  }
  global.ONSXlsxLite={read};
})(window);
