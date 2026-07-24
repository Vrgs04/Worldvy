export interface TimerState{durationMs:number;startedAt:number;pausedAt?:number;pausedTotal:number}
export const remainingMs=(timer:TimerState,now:number)=>Math.max(0,timer.durationMs-((timer.pausedAt??now)-timer.startedAt)+timer.pausedTotal);
export const pauseTimer=(t:TimerState,now:number):TimerState=>t.pausedAt? t:{...t,pausedAt:now};
export const resumeTimer=(t:TimerState,now:number):TimerState=>t.pausedAt?{...t,pausedTotal:t.pausedTotal+now-t.pausedAt,pausedAt:undefined}:t;
