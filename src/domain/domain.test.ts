import { describe, expect, it } from 'vitest';
import { evaluateGuess, isAcceptedGuess, isValidWord, normalizeWord } from './words';
import { dailyWord } from './daily';
import { nextWithoutRepeat } from './rotation';
import { remainingMs, pauseTimer, resumeTimer } from './timer';
import { updateStreak } from './stats';
describe('palabras', () => {
  it('acepta palabras de cinco letras sin exigir acentos', () => {
    expect(isValidWord('avion')).toBe(true);
    expect(isValidWord('avi\u00f3n')).toBe(true);
    expect(isValidWord('ceder')).toBe(true);
  });
  it('rechaza secuencias que no pertenecen al catálogo', () => {
    const catalog = ['avión', 'ceder'];
    expect(isAcceptedGuess('avion', catalog)).toBe(true);
    expect(isAcceptedGuess('ceder', catalog)).toBe(true);
    expect(isAcceptedGuess('NNNNN', catalog)).toBe(false);
    expect(isAcceptedGuess('aaaaa', catalog)).toBe(false);
  });
  it('normaliza tildes, caso y símbolos', () => expect(normalizeWord(' Á-rbOl! ')).toBe('ARBOL'));
  it('conserva Ñ distinta de N', () => {
    expect(normalizeWord('niñez')).toBe('NIÑEZ');
    expect(normalizeWord('ninez')).not.toBe('NIÑEZ');
  });
  it('limita letras repetidas a las disponibles', () =>
    expect(evaluateGuess('RARAS', 'PERAS').map((x) => x.state)).toEqual([
      'absent',
      'absent',
      'correct',
      'correct',
      'correct',
    ]));
  it('prioriza coincidencias exactas', () =>
    expect(evaluateGuess('MAMÁ', 'CALMA').filter((x) => x.state === 'correct')).toHaveLength(1));
});
describe('selección', () => {
  it('es determinista e inmune al orden', () =>
    expect(dailyWord(['canto', 'abeja'], '2026-01-01')).toBe(
      dailyWord(['abeja', 'canto'], '2026-01-01'),
    ));
  it('rota sin repetir', () => expect(nextWithoutRepeat(['A', 'B'], ['A'], () => 0)).toBe('B'));
});
describe('tiempo y rachas', () => {
  it('usa marcas reales y pausa', () => {
    const t = { durationMs: 1000, startedAt: 0, pausedTotal: 0 };
    expect(remainingMs(t, 250)).toBe(750);
    const p = pauseTimer(t, 250);
    expect(remainingMs(p, 900)).toBe(750);
    expect(remainingMs(resumeTimer(p, 900), 1000)).toBe(650);
  });
  it('calcula racha diaria', () =>
    expect(updateStreak('2026-01-01', '2026-01-02', 3, true)).toBe(4));
});
