(function(global){
  'use strict';

  const encoder=new TextEncoder();
  const STYLE={
    DEFAULT:0,TITLE:1,SUBTITLE:2,SECTION:3,HEADER:4,TEXT:5,TEXT_ALT:6,
    INT:7,INT_ALT:8,CURRENCY:9,CURRENCY_ALT:10,PERCENT:11,PERCENT_ALT:12,
    DATE:13,DATE_ALT:14,GOOD:15,WARN:16,DANGER:17,GUIDE_LABEL:18,
    GUIDE_TEXT:19,WRAP:20,INFO:21
  };

  const crcTable=(()=>{const table=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xEDB88320^(c>>>1):c>>>1;table[n]=c>>>0;}return table;})();
  function crc32(bytes){let c=0xFFFFFFFF;for(let i=0;i<bytes.length;i++)c=crcTable[(c^bytes[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
  function u16(v){return [v&255,(v>>>8)&255];}
  function u32(v){return [v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255];}
  function concat(parts){const total=parts.reduce((s,p)=>s+p.length,0),out=new Uint8Array(total);let o=0;for(const p of parts){out.set(p,o);o+=p.length;}return out;}
  function dosTime(date=new Date()){const year=Math.max(1980,date.getFullYear());return {time:((date.getHours()&31)<<11)|((date.getMinutes()&63)<<5)|((date.getSeconds()/2)&31),date:(((year-1980)&127)<<9)|(((date.getMonth()+1)&15)<<5)|(date.getDate()&31)};}
  function zip(files){
    const local=[],central=[];let offset=0;const stamp=dosTime();
    Object.entries(files).forEach(([name,content])=>{
      const nameBytes=encoder.encode(name),data=content instanceof Uint8Array?content:encoder.encode(String(content)),crc=crc32(data),flags=0x0800;
      const localHeader=new Uint8Array([
        ...u32(0x04034b50),...u16(20),...u16(flags),...u16(0),...u16(stamp.time),...u16(stamp.date),
        ...u32(crc),...u32(data.length),...u32(data.length),...u16(nameBytes.length),...u16(0)
      ]);
      local.push(localHeader,nameBytes,data);
      const centralHeader=new Uint8Array([
        ...u32(0x02014b50),...u16(20),...u16(20),...u16(flags),...u16(0),...u16(stamp.time),...u16(stamp.date),
        ...u32(crc),...u32(data.length),...u32(data.length),...u16(nameBytes.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset)
      ]);
      central.push(centralHeader,nameBytes);
      offset+=localHeader.length+nameBytes.length+data.length;
    });
    const localBytes=concat(local),centralBytes=concat(central),count=Object.keys(files).length;
    const eocd=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(count),...u16(count),...u32(centralBytes.length),...u32(localBytes.length),...u16(0)]);
    return concat([localBytes,centralBytes,eocd]);
  }

  function xml(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');}
  function columnName(index){let result='';for(let n=index+1;n;n=Math.floor((n-1)/26))result=String.fromCharCode(65+(n-1)%26)+result;return result;}
  function cell(value,style=STYLE.DEFAULT,type){return {v:value,s:style,t:type};}
  function cellXml(value,rowIndex,colIndex){
    const c=value&&typeof value==='object'&&Object.prototype.hasOwnProperty.call(value,'v')?value:{v:value};
    if(c.v===undefined||c.v===null||c.v==='')return '';
    const ref=`${columnName(colIndex)}${rowIndex+1}`,style=Number.isInteger(c.s)&&c.s>0?` s="${c.s}"`:'';
    if(c.t==='n'||(typeof c.v==='number'&&Number.isFinite(c.v)))return `<c r="${ref}"${style}><v>${Number(c.v)}</v></c>`;
    if(c.t==='b'||typeof c.v==='boolean')return `<c r="${ref}"${style} t="b"><v>${c.v?1:0}</v></c>`;
    return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${xml(c.v)}</t></is></c>`;
  }
  function paneXml(freezeRows=0,freezeCols=0){
    if(!freezeRows&&!freezeCols)return '';
    const attrs=[];if(freezeRows)attrs.push(`ySplit="${freezeRows}"`);if(freezeCols)attrs.push(`xSplit="${freezeCols}"`);
    attrs.push(`topLeftCell="${columnName(freezeCols)}${freezeRows+1}"`);
    attrs.push(`activePane="${freezeRows&&freezeCols?'bottomRight':freezeRows?'bottomLeft':'topRight'}" state="frozen"`);
    return `<pane ${attrs.join(' ')}/>`;
  }
  function sheetXml(sheet){
    const rows=sheet.rows||[],maxCols=Math.max(1,...rows.map(r=>r.length)),maxRows=Math.max(1,rows.length),rowHeights=sheet.rowHeights||{};
    const rowXml=rows.map((row,r)=>{
      const cells=row.map((v,c)=>cellXml(v,r,c)).join(''),height=rowHeights[r+1],attrs=height?` ht="${height}" customHeight="1"`:'';
      return `<row r="${r+1}"${attrs}>${cells}</row>`;
    }).join('');
    const cols=(sheet.widths||[]).map((w,i)=>w?`<col min="${i+1}" max="${i+1}" width="${Number(w)}" customWidth="1"/>`:``).join('');
    const merges=(sheet.merges||[]).filter(Boolean),mergeXml=merges.length?`<mergeCells count="${merges.length}">${merges.map(ref=>`<mergeCell ref="${ref}"/>`).join('')}</mergeCells>`:'';
    let autoFilter='';
    if(sheet.autoFilter){
      const match=String(sheet.autoFilter).match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
      if(match){
        const r1=parseInt(match[2],10),r2=parseInt(match[4],10);
        if(r2>r1)autoFilter=`<autoFilter ref="${sheet.autoFilter}"/>`;
      }
    }
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:${columnName(maxCols-1)}${maxRows}"/>
<sheetViews><sheetView workbookViewId="0">${paneXml(sheet.freezeRows||0,sheet.freezeCols||0)}</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="18"/>
${cols?`<cols>${cols}</cols>`:''}
<sheetData>${rowXml}</sheetData>${autoFilter}${mergeXml}
<pageMargins left="0.35" right="0.35" top="0.55" bottom="0.55" header="0.2" footer="0.2"/>
<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
  }
  function stylesXml(){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="3"><numFmt numFmtId="164" formatCode="[$Rp-421] #,##0"/><numFmt numFmtId="165" formatCode="0.00&quot;%&quot;"/><numFmt numFmtId="166" formatCode="yyyy-mm-dd"/></numFmts>
<fonts count="7">
<font><sz val="10"/><name val="Aptos"/><family val="2"/></font>
<font><b/><sz val="18"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/></font>
<font><sz val="10"/><color rgb="FF516981"/><name val="Aptos"/></font>
<font><b/><sz val="11"/><color rgb="FF0B63CE"/><name val="Aptos"/></font>
<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font>
<font><b/><sz val="10"/><color rgb="FF173B63"/><name val="Aptos"/></font>
<font><sz val="9"/><color rgb="FF5E7186"/><name val="Aptos"/></font>
</fonts>
<fills count="10">
<fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF0B63CE"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFEAF2FF"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF7FAFD"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE9F8EE"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFF4D6"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFEAEA"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1E293B"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2"><border/><border><left style="thin"><color rgb="FFD9E2EC"/></left><right style="thin"><color rgb="FFD9E2EC"/></right><top style="thin"><color rgb="FFD9E2EC"/></top><bottom style="thin"><color rgb="FFD9E2EC"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="22">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFill="1" applyFont="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFill="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="4" fillId="8" borderId="1" xfId="0" applyFill="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
<xf numFmtId="1" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="right"/></xf>
<xf numFmtId="1" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"><alignment horizontal="right"/></xf>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="right"/></xf>
<xf numFmtId="164" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"><alignment horizontal="right"/></xf>
<xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="right"/></xf>
<xf numFmtId="165" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"><alignment horizontal="right"/></xf>
<xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"><alignment horizontal="center"/></xf>
<xf numFmtId="166" fontId="0" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="5" fillId="5" borderId="1" xfId="0" applyFill="1" applyFont="1" applyBorder="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="5" fillId="6" borderId="1" xfId="0" applyFill="1" applyFont="1" applyBorder="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="5" fillId="7" borderId="1" xfId="0" applyFill="1" applyFont="1" applyBorder="1"><alignment vertical="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFill="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="6" fillId="3" borderId="1" xfId="0" applyFill="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="0" fontId="6" fillId="9" borderId="1" xfId="0" applyFill="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;}
  function workbookXml(sheets){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="15000"/></bookViews><sheets>${sheets.map((s,i)=>`<sheet name="${xml(String(s.name||`Sheet ${i+1}`).slice(0,31))}" sheetId="${i+1}" r:id="rId${i+1}"${s.hidden?' state="hidden"':''}/>`).join('')}</sheets><calcPr calcId="191029"/></workbook>`;}
  function workbookRels(sheets){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;}
  function contentTypes(sheets){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;}
  function coreXml(props={}){const now=new Date().toISOString();return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xml(props.title||'ONS Farma Digital')}</dc:title><dc:creator>${xml(props.creator||'Apotek ONS Farma')}</dc:creator><cp:lastModifiedBy>${xml(props.creator||'Apotek ONS Farma')}</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;}
  function appXml(sheets){return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>ONS Farma Digital</Application><DocSecurity>0</DocSecurity><ScaleCrop>false</ScaleCrop><HeadingPairs><vt:vector size="2" baseType="variant"><vt:variant><vt:lpstr>Worksheets</vt:lpstr></vt:variant><vt:variant><vt:i4>${sheets.length}</vt:i4></vt:variant></vt:vector></HeadingPairs><TitlesOfParts><vt:vector size="${sheets.length}" baseType="lpstr">${sheets.map(s=>`<vt:lpstr>${xml(s.name)}</vt:lpstr>`).join('')}</vt:vector></TitlesOfParts><Company>Apotek ONS Farma</Company><AppVersion>9.1.1</AppVersion></Properties>`;}
  function create(sheets,props={}){
    if(!Array.isArray(sheets)||!sheets.length)throw new Error('Workbook membutuhkan minimal satu sheet.');
    const files={
      '[Content_Types].xml':contentTypes(sheets),
      '_rels/.rels':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>',
      'docProps/core.xml':coreXml(props),'docProps/app.xml':appXml(sheets),'xl/workbook.xml':workbookXml(sheets),'xl/_rels/workbook.xml.rels':workbookRels(sheets),'xl/styles.xml':stylesXml()
    };
    sheets.forEach((sheet,i)=>{files[`xl/worksheets/sheet${i+1}.xml`]=sheetXml(sheet);});
    return new Blob([zip(files)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  function download(sheets,filename,props={}){
    try {
      const blob=create(sheets,props);
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download=filename||'ONS_Farma.xlsx';
      a.style.display='none';
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{
        a.remove();
        URL.revokeObjectURL(url);
      },2000);
      return blob;
    } catch(e) {
      console.error('Error downloading Excel file:', e);
      throw e;
    }
  }
  global.ONSXlsxExport={STYLE,cell,create,download};
})(typeof window!=='undefined'?window:globalThis);
