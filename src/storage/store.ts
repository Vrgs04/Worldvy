export const SCHEMA_VERSION=2;
export interface Stats{played:number;won:number;streak:number;bestStreak:number;distribution:number[]}
export interface Settings{theme:'system'|'light'|'dark';animations:boolean;haptics:boolean;contrast:boolean;seenHelp:boolean}
export interface StoredGame{mode:'daily'|'unlimited';solution:string;guesses:string[];date?:string;finished:boolean;won:boolean}
export interface AppData{version:2;settings:Settings;dailyStats:Stats;unlimitedStats:Stats;dailyGame?:StoredGame;unlimitedGame?:StoredGame;recent:string[];timeRecords:Record<string,number>}
const stats=():Stats=>({played:0,won:0,streak:0,bestStreak:0,distribution:[0,0,0,0,0,0]});
export const defaults=():AppData=>({version:2,settings:{theme:'system',animations:true,haptics:true,contrast:false,seenHelp:false},dailyStats:stats(),unlimitedStats:stats(),recent:[],timeRecords:{}});
const saneStats=(x:unknown):x is Stats=>!!x&&typeof x==='object'&&typeof (x as Stats).played==='number'&&Array.isArray((x as Stats).distribution);
export function migrate(raw:unknown):AppData{const d=defaults();if(!raw||typeof raw!=='object')return d;const x=raw as Partial<AppData>&{version?:number};return {...d,...x,version:2,settings:{...d.settings,...(x.settings??{})},dailyStats:saneStats(x.dailyStats)?x.dailyStats:d.dailyStats,unlimitedStats:saneStats(x.unlimitedStats)?x.unlimitedStats:d.unlimitedStats,recent:Array.isArray(x.recent)?x.recent.filter(v=>typeof v==='string').slice(-100):[],timeRecords:x.timeRecords&&typeof x.timeRecords==='object'?x.timeRecords:{}}}
const KEY='worldvy:data';
export const load=():AppData=>{try{return migrate(JSON.parse(localStorage.getItem(KEY)??'null'))}catch{return defaults()}};
export const save=(data:AppData)=>{try{localStorage.setItem(KEY,JSON.stringify(data))}catch{/* La partida puede continuar sin persistencia. */}};
export const clear=()=>localStorage.removeItem(KEY);
