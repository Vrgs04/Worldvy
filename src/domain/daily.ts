import { normalizeWord } from './words';
export const localDateKey=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function stableHash(input:string){let h=2166136261;for(const c of input){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
export function dailyWord(words:string[],dateKey:string,calendarVersion='v1'){if(!words.length)throw new Error('Catálogo vacío');const ordered=[...new Set(words.map(normalizeWord))].sort();return ordered[stableHash(`${calendarVersion}:${dateKey}`)%ordered.length]!}
export const msUntilTomorrow=(now:number)=>{const d=new Date(now);return new Date(d.getFullYear(),d.getMonth(),d.getDate()+1).getTime()-now};
