(function(global){
  'use strict';
  const BARS=[
    '11011001100','11001101100','11001100110','10010011000','10010001100','10001001100','10011001000','10011000100','10001100100','11001001000','11001000100','11000100100','10110011100','10011011100','10011001110','10111001100','10011101100','10011100110','11001110010','11001011100','11001001110','11011100100','11001110100','11101101110','11101001100','11100101100','11100100110','11101100100','11100110100','11100110010','11011011000','11011000110','11000110110','10100011000','10001011000','10001000110','10110001000','10001101000','10001100010','11010001000','11000101000','11000100010','10110111000','10110001110','10001101110','10111011000','10111000110','10001110110','11101110110','11010001110','11000101110','11011101000','11011100010','11011101110','11101011000','11101000110','11100010110','11101101000','11101100010','11100011010','11101111010','11001000010','11110001010','10100110000','10100001100','10010110000','10010000110','10000101100','10000100110','10110010000','10110000100','10011010000','10011000010','10000110100','10000110010','11000010010','11001010000','11110111010','11000010100','10001111010','10100111100','10010111100','10010011110','10111100100','10011110100','10011110010','11110100100','11110010100','11110010010','11011011110','11011110110','11110110110','10101111000','10100011110','10001011110','10111101000','10111100010','11110101000','11110100010','10111011110','10111101110','11101011110','11110101110','11010000100','11010010000','11010011100','1100011101011'
  ];
  function encode(value){
    const text=String(value??'');
    if(!text || !/^[\x20-\x7E]+$/.test(text)) throw new Error('Barcode hanya mendukung karakter ASCII yang dapat dicetak.');
    const codes=[...text].map(ch=>ch.charCodeAt(0)-32);
    let checksum=104;
    codes.forEach((code,index)=>{checksum+=code*(index+1);});
    return BARS[104]+codes.map(code=>BARS[code]).join('')+BARS[checksum%103]+BARS[106];
  }
  function render(target,value,options={}){
    const el=typeof target==='string'?document.querySelector(target):target;
    if(!el) throw new Error('Elemen barcode tidak ditemukan.');
    const bits=encode(value), moduleWidth=Number(options.width)||1.5, height=Number(options.height)||38, margin=Number(options.margin??3), fontSize=Number(options.fontSize)||11;
    const quiet=10, totalModules=bits.length+quiet*2, width=totalModules*moduleWidth+margin*2, textHeight=options.displayValue===false?0:fontSize+5;
    el.setAttribute('xmlns','http://www.w3.org/2000/svg'); el.setAttribute('viewBox',`0 0 ${width} ${height+textHeight+margin*2}`); el.setAttribute('role','img'); el.setAttribute('aria-label',`Barcode ${value}`); el.innerHTML='';
    const ns='http://www.w3.org/2000/svg';
    const bg=document.createElementNS(ns,'rect');bg.setAttribute('x','0');bg.setAttribute('y','0');bg.setAttribute('width',String(width));bg.setAttribute('height',String(height+textHeight+margin*2));bg.setAttribute('fill','#fff');el.appendChild(bg);
    let i=0; while(i<bits.length){if(bits[i]==='1'){let j=i+1;while(j<bits.length&&bits[j]==='1')j++;const rect=document.createElementNS(ns,'rect');rect.setAttribute('x',String(margin+(quiet+i)*moduleWidth));rect.setAttribute('y',String(margin));rect.setAttribute('width',String((j-i)*moduleWidth));rect.setAttribute('height',String(height));rect.setAttribute('fill','#000');el.appendChild(rect);i=j;}else i++;}
    if(options.displayValue!==false){const t=document.createElementNS(ns,'text');t.setAttribute('x',String(width/2));t.setAttribute('y',String(margin+height+fontSize+2));t.setAttribute('text-anchor','middle');t.setAttribute('font-family','monospace');t.setAttribute('font-size',String(fontSize));t.textContent=String(value);el.appendChild(t);}
    return el;
  }
  global.ONSCode128={encode,render};
})(window);
