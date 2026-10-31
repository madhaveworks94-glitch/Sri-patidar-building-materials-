const HI={'Overview':'मुख्य पेज','Billing':'बिलिंग','Khata':'खाता','Inventory':'स्टॉक','Fleet':'गाड़ियाँ','Reports':'रिपोर्ट','Backup':'बैकअप',
'Udhaar to collect':'उधार वसूली','New bill':'नया बिल','Receive payment':'पैसे लें','Today’s sales':'आज की बिक्री','Cash this week':'इस हफ्ते नकद','Low stock':'कम स्टॉक','Vehicles on trip':'ट्रिप पर गाड़ियाँ','Last 7 days':'पिछले 7 दिन','Recent bills':'हाल के बिल','Back up your data':'अपना डेटा बैकअप करें',
'GST invoice':'GST इनवॉइस','Kachha bill':'कच्चा बिल','Customer':'ग्राहक','Phone (optional)':'फोन (वैकल्पिक)','Items':'आइटम','+ Add item':'+ आइटम जोड़ें','Add item':'आइटम जोड़ें','Save bill':'बिल सेव करें','Paid now (₹)':'अभी दिया (₹)','Paid in full':'पूरा भुगतान','Balance (udhaar)':'बाकी (उधार)','Total':'कुल','Items total':'आइटम का कुल','Discount':'छूट','Discount on the whole bill':'पूरे बिल पर छूट','Past bills and invoices →':'पुराने बिल और इनवॉइस →','Customer address':'ग्राहक का पता','Place of supply (state)':'सप्लाई का राज्य','Subtotal':'उप-कुल',
'Search customer':'ग्राहक खोजें','Total to collect':'कुल वसूली','+ Add old udhaar':'+ पुराना उधार जोड़ें','Statement':'खाता विवरण','Balance':'बाकी','Remind':'याद दिलाएं','Undo last payment':'पिछला भुगतान वापस करें','← All customers':'← सभी ग्राहक','Save payment':'भुगतान सेव करें','Amount received (₹)':'मिली रकम (₹)','Settled':'चुकता',
'Add stock':'स्टॉक जोड़ें','Count / fix':'गिनती सुधारें','In stock':'स्टॉक में','Edit item':'आइटम बदलें','Delete item':'आइटम हटाएं','All items':'सभी आइटम','Search item':'आइटम खोजें','Save item':'आइटम सेव करें','Import supplier invoice (PDF)':'सप्लायर इनवॉइस इम्पोर्ट (PDF)','← All items':'← सभी आइटम','Recent stock changes':'हाल के स्टॉक बदलाव',
'+ Add vehicle':'+ गाड़ी जोड़ें','Start trip':'ट्रिप शुरू करें','End trip':'ट्रिप खत्म करें','Finish trip':'ट्रिप पूरी करें','This month':'इस महीने','Recent trips':'हाल की ट्रिप',
'Past bills':'पुराने बिल','All':'सभी','GST':'GST','Kachha':'कच्चा','Cancelled':'रद्द','Search customer or invoice number':'ग्राहक या इनवॉइस नंबर खोजें','Download invoice as PDF':'इनवॉइस PDF डाउनलोड करें','Share on WhatsApp':'WhatsApp पर भेजें','Edit this bill':'यह बिल बदलें','Cancel this bill':'यह बिल रद्द करें','Sales return / credit note':'माल वापसी / क्रेडिट नोट','Create credit note':'क्रेडिट नोट बनाएं','← All bills':'← सभी बिल','Print':'प्रिंट','Paid':'भुगतान हुआ',
'GST report':'GST रिपोर्ट','GST report for filing':'फाइलिंग के लिए GST रिपोर्ट','Save PDF report (for filing)':'PDF रिपोर्ट सेव करें (फाइलिंग के लिए)','Money received':'मिला हुआ पैसा','Udhaar pending':'बाकी उधार','GST collected':'जमा GST','Profit (estimate)':'मुनाफा (अनुमान)','Best selling items':'सबसे ज्यादा बिकने वाले','Top customers':'मुख्य ग्राहक','Send report on WhatsApp':'WhatsApp पर रिपोर्ट भेजें','Today':'आज','7 days':'7 दिन','30 days':'30 दिन',
'Back up now':'अभी बैकअप लें','Shop details':'दुकान की जानकारी','Shop name':'दुकान का नाम','Owner name':'मालिक का नाम','Shop address':'दुकान का पता','Shop phone':'दुकान का फोन','Shop state':'दुकान का राज्य','Start fresh':'नए सिरे से शुरू','Clear all data':'सारा डेटा मिटाएं','Language':'भाषा','Logins':'लॉगिन','Add login':'लॉगिन जोड़ें','Name':'नाम','Passkey':'पासकी','Log in':'लॉगिन','Log in to continue':'आगे बढ़ने के लिए लॉगिन करें','Cancel':'रद्द करें','Save':'सेव करें'};
const SKIP=['SCRIPT','STYLE','TEXTAREA','INPUT'];
function walk(n){
 if(n.nodeType===3){const t=n.nodeValue.trim();if(t&&HI[t])n.nodeValue=n.nodeValue.replace(t,HI[t])}
 else if(n.nodeType===1&&!SKIP.includes(n.tagName)||n.tagName==='INPUT'){
  if(n.classList&&n.classList.contains('inv'))return;
  if(n.placeholder&&HI[n.placeholder])n.placeholder=HI[n.placeholder];
  n.childNodes.forEach(walk);
 }
}
export const lang=()=>{try{return localStorage.getItem('dukaanos.lang')||'en'}catch(e){return'en'}};
export const setLang=l=>{try{localStorage.setItem('dukaanos.lang',l)}catch(e){}location.reload()};
export function initLang(){if(lang()!=='hi')return;new MutationObserver(m=>m.forEach(r=>r.addedNodes.forEach(walk))).observe(document.body,{childList:true,subtree:true});walk(document.body)}
