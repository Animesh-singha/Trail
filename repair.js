const fs = require('fs');
const path = 'c:\\Users\\s s laptop bazar\\monitoring\\dashboard\\app\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix syntax error (stray >)
content = content.replace(/<\/GlassPanel>\s+>\s+<\/div>/g, '</GlassPanel>\n            </div>');

// Fix narrative display
const oldNarrative = '"Neural protocols active. Query authorized for infrastructure analysis."';
content = content.replace(oldNarrative, '`"${narrative}"`'); 

// Let's be more precise with the narrative replace to avoid multiple matches if any
content = content.replace(/<p className="text-\[11px\] text-white\/50 leading-relaxed font-medium italic">"Neural protocols active. Query authorized for infrastructure analysis."<\/p>/, 
                          '<p className="text-[11px] text-white/50 leading-relaxed font-medium italic">"{narrative}"</p>');

fs.writeFileSync(path, content);
console.log('File repaired successfully.');
