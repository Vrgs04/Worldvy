export type LetterState = 'correct' | 'present' | 'absent';
export interface LetterResult { letter: string; state: LetterState }
export const normalizeWord = (value:string):string => value.trim().toLocaleUpperCase('es').replaceAll('Ñ','\uE000').normalize('NFD').replace(/[\u0300-\u0308]/g,'').replaceAll('\uE000','Ñ').normalize('NFC').replace(/[^A-ZÑ]/g,'');
export function evaluateGuess(guess:string,solution:string):LetterResult[]{
  const g=[...normalizeWord(guess)], s=[...normalizeWord(solution)];
  const result:LetterResult[]=g.map(letter=>({letter,state:'absent'})); const remaining=new Map<string,number>();
  g.forEach((letter,i)=>{if(letter===s[i]) result[i]={letter,state:'correct'}; else {const target=s[i]; if(target) remaining.set(target,(remaining.get(target)??0)+1)}});
  g.forEach((letter,i)=>{if(result[i]?.state==='correct')return; const count=remaining.get(letter)??0; if(count>0){result[i]={letter,state:'present'};remaining.set(letter,count-1)}}); return result;
}
export const isValidWord=(value:string)=>normalizeWord(value).length===5;
export const isAcceptedGuess=(value:string,catalog:readonly string[])=>isValidWord(value)&&catalog.some(word=>normalizeWord(word)===normalizeWord(value));
