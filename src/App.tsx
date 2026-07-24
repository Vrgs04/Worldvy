import { useCallback, useEffect, useRef as reactUseRef, useState } from 'react';
const useRef = <T,>(initial?: T) => reactUseRef<T | undefined>(initial);
import { useRegisterSW } from 'virtual:pwa-register/react';
import { acceptedWords, solutionWords } from './data/words';
import broadAcceptedWords from './data/generated/accepted-five-letter.json';
import { dailyWord, localDateKey, msUntilTomorrow } from './domain/daily';
import { evaluateGuess, normalizeWord } from './domain/words';
import { nextWithoutRepeat } from './domain/rotation';
import { clear, load, save, type AppData, type StoredGame } from './storage/store';
type Page = 'home' | 'daily' | 'unlimited' | 'timed' | 'stats' | 'help' | 'settings' | 'credits';
type GameMode = 'daily' | 'unlimited';
const playableWords = [...broadAcceptedWords, ...acceptedWords, 'avion', 'avión', 'ceder'];
const playableWordSet = new Set(playableWords.map(normalizeWord));
const keys = [
  'Q',
  'W',
  'E',
  'R',
  'T',
  'Y',
  'U',
  'I',
  'O',
  'P',
  'A',
  'S',
  'D',
  'F',
  'G',
  'H',
  'J',
  'K',
  'L',
  'Ñ',
  '⌫',
  'Z',
  'X',
  'C',
  'V',
  'B',
  'N',
  'M',
  'ENTER',
];
const labelState = { correct: 'correcta', present: 'presente', absent: 'ausente' } as const;
function formatCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function Board({
  guesses,
  current,
  solution,
}: {
  guesses: string[];
  current: string;
  solution: string;
}) {
  const rows = [
    ...guesses,
    current,
    ...Array(Math.max(0, 6 - guesses.length - (guesses.length < 6 ? 1 : 0))).fill(''),
  ];
  return (
    <div className="board" aria-label="Tablero">
      {rows.slice(0, 6).map((word, r) => (
        <div className="row" key={r}>
          {Array.from({ length: 5 }, (_, i) => {
            const letter = [...word][i] ?? '';
            const state = r < guesses.length ? evaluateGuess(word, solution)[i]?.state : undefined;
            return (
              <div
                key={i}
                className={`tile ${state ?? ''} ${state ? 'revealed' : ''} ${letter ? 'filled' : ''}`}
                style={state ? { animationDelay: `${i * 90}ms` } : undefined}
                aria-label={state ? `${letter}, ${labelState[state]}` : letter || 'vacía'}
              >
                {letter}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
function Keyboard({
  onKey,
  guesses,
  solution,
  disabled,
}: {
  onKey: (k: string) => void;
  guesses: string[];
  solution: string;
  disabled: boolean;
}) {
  const states = new Map<string, string>();
  for (const g of guesses)
    for (const x of evaluateGuess(g, solution)) {
      const rank = { absent: 1, present: 2, correct: 3 };
      if (rank[x.state] > (rank[states.get(x.letter) as keyof typeof rank] ?? 0))
        states.set(x.letter, x.state);
    }
  return (
    <div className="keyboard" aria-label="Teclado virtual">
      {keys.map((k) => (
        <button
          disabled={disabled}
          className={`${k.length > 1 ? 'wide' : ''} ${states.get(k) ?? ''}`}
          key={k}
          onClick={() => onKey(k)}
          aria-label={k === '⌫' ? 'Borrar' : k}
        >
          {k}
        </button>
      ))}
    </div>
  );
}
function Game({
  mode,
  data,
  setData,
  toast,
  onHome,
}: {
  mode: GameMode;
  data: AppData;
  setData: (d: AppData) => void;
  toast: (s: string) => void;
  onHome: () => void;
}) {
  const date = localDateKey();
  const initial =
    mode === 'daily' && data.dailyGame?.date === date
      ? data.dailyGame
      : mode === 'unlimited' && data.unlimitedGame && !data.unlimitedGame.finished
        ? data.unlimitedGame
        : undefined;
  const [solution] = useState(
    () =>
      initial?.solution ??
      (mode === 'daily'
        ? dailyWord(solutionWords, date)
        : nextWithoutRepeat(solutionWords, data.recent)),
  );
  const [guesses, setGuesses] = useState<string[]>(initial?.guesses ?? []);
  const [current, setCurrent] = useState('');
  const [finished, setFinished] = useState(initial?.finished ?? false);
  const [won, setWon] = useState(initial?.won ?? false);
  const [countdown, setCountdown] = useState(msUntilTomorrow(Date.now()));
  useEffect(() => {
    document.body.classList.add('game-active');
    return () => document.body.classList.remove('game-active');
  }, []);
  const persist = useCallback(
    (gs: string[], done: boolean, victory: boolean) => {
      const game: StoredGame = {
        mode,
        solution,
        guesses: gs,
        date: mode === 'daily' ? date : undefined,
        finished: done,
        won: victory,
      };
      const statKey = mode === 'daily' ? 'dailyStats' : 'unlimitedStats';
      let next = { ...data, [mode === 'daily' ? 'dailyGame' : 'unlimitedGame']: game } as AppData;
      if (done) {
        const s = { ...next[statKey] };
        s.played++;
        if (victory) {
          s.won++;
          s.distribution[gs.length - 1] = (s.distribution[gs.length - 1] ?? 0) + 1;
        }
        s.streak = victory ? s.streak + 1 : 0;
        s.bestStreak = Math.max(s.bestStreak, s.streak);
        next = { ...next, [statKey]: s, recent: [...next.recent, solution].slice(-100) };
      }
      setData(next);
    },
    [data, date, mode, setData, solution],
  );
  const submit = useCallback(() => {
    const word = normalizeWord(current);
    if (!playableWordSet.has(normalizeWord(current))) {
      toast('Esa palabra no está en el catálogo');
      return;
    }
    const gs = [...guesses, word];
    const victory = word === normalizeWord(solution),
      done = victory || gs.length === 6;
    setGuesses(gs);
    setCurrent('');
    if (done) {
      setFinished(true);
      setWon(victory);
      persist(gs, true, victory);
      toast(victory ? '¡La encontraste!' : 'Se agotaron los intentos');
    } else persist(gs, false, false);
  }, [current, guesses, persist, solution, toast]);
  const key = useCallback(
    (k: string) => {
      if (finished) return;
      if (k === 'ENTER') {
        submit();
        return;
      }
      if (k === '⌫' || k === 'BACKSPACE') {
        setCurrent((v) => v.slice(0, -1));
        return;
      }
      if (/^[A-ZÑ]$/.test(k) && current.length < 5) {
        setCurrent((v) => v + k);
        if (data.settings.haptics) navigator.vibrate?.(8);
      }
    },
    [current.length, data.settings.haptics, finished, submit],
  );
  useEffect(() => {
    const handler = (e: KeyboardEvent) => key(e.key.toLocaleUpperCase('es'));
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key]);
  useEffect(() => {
    if (mode !== 'daily') return;
    const id = setInterval(() => setCountdown(msUntilTomorrow(Date.now())), 1000);
    return () => clearInterval(id);
  }, [mode]);
  const share = async () => {
    const grid = guesses
      .map((g) =>
        evaluateGuess(g, solution)
          .map((x) => (x.state === 'correct' ? '🟩' : x.state === 'present' ? '🟨' : '⬛'))
          .join(''),
      )
      .join('\n');
    const text = `Worldvy ${mode === 'daily' ? date : 'libre'} ${won ? guesses.length : 'X'}/6\n${grid}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      toast('Resultado compartido');
    } catch {
      toast('No se pudo compartir');
    }
  };
  return (
    <main className="game">
      <header>
        <button className="icon" onClick={onHome} aria-label="Volver al inicio">
          ←
        </button>
        <div>
          <span className="eyebrow">{mode === 'daily' ? 'RITUAL DIARIO' : 'RUTA LIBRE'}</span>
          <h1>{mode === 'daily' ? 'Palabra diaria' : 'Partida ilimitada'}</h1>
        </div>
        <span className="attempt">{guesses.length}/6</span>
      </header>
      <Board guesses={guesses} current={current} solution={solution} />
      {finished && (
        <section className={`result ${mode === 'daily' ? 'daily-result' : ''}`}>
          <h2>{won ? '¡Muy bien!' : 'La palabra era ' + solution.toLocaleUpperCase('es')}</h2>
          {mode === 'daily' ? (
            <div className="next-daily">
              <span>Nueva palabra en</span>
              <strong>{formatCountdown(countdown)}</strong>
            </div>
          ) : (
            <button onClick={() => location.reload()}>Otra partida</button>
          )}
          <button className="secondary" onClick={share}>
            Compartir
          </button>
        </section>
      )}
      {!finished && <Keyboard onKey={key} guesses={guesses} solution={solution} disabled={false} />}
    </main>
  );
}
function TimedPuzzle({
  left,
  score,
  paused,
  onSolved,
  onResume,
  onHome,
  toast,
}: {
  left: number;
  score: number;
  paused: boolean;
  onSolved: () => void;
  onResume: () => void;
  onHome: () => void;
  toast: (message: string) => void;
}) {
  const [solution, setSolution] = useState(() => nextWithoutRepeat(solutionWords, []));
  const [recent, setRecent] = useState<string[]>([solution]);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const advance = useCallback(
    (solved: boolean) => {
      setTransitioning(true);
      if (solved) onSolved();
      window.setTimeout(() => {
        const next = nextWithoutRepeat(solutionWords, recent);
        setRecent((values) => [...values, next].slice(-30));
        setSolution(next);
        setGuesses([]);
        setCurrent('');
        setTransitioning(false);
      }, 650);
    },
    [onSolved, recent],
  );
  const submit = useCallback(() => {
    if (transitioning || paused) return;
    if (!playableWordSet.has(normalizeWord(current))) {
      toast('Esa palabra no está en el catálogo');
      return;
    }
    const word = normalizeWord(current);
    const nextGuesses = [...guesses, word];
    const solved = word === normalizeWord(solution);
    setGuesses(nextGuesses);
    setCurrent('');
    if (solved || nextGuesses.length === 6) advance(solved);
  }, [advance, current, guesses, paused, solution, toast, transitioning]);
  const key = useCallback(
    (value: string) => {
      if (transitioning || paused) return;
      if (value === 'ENTER') return submit();
      if (value === '⌫' || value === 'BACKSPACE') {
        setCurrent((word) => word.slice(0, -1));
        return;
      }
      if (/^[A-ZÑ]$/.test(value) && current.length < 5) setCurrent((word) => word + value);
    },
    [current.length, paused, submit, transitioning],
  );
  useEffect(() => {
    document.body.classList.add('game-active');
    const handler = (event: KeyboardEvent) => key(event.key.toLocaleUpperCase('es'));
    window.addEventListener('keydown', handler);
    return () => {
      document.body.classList.remove('game-active');
      window.removeEventListener('keydown', handler);
    };
  }, [key]);
  return (
    <main className="game timed-game">
      <header>
        <button className="icon" onClick={onHome} aria-label="Salir al inicio">←</button>
        <div className="timed-metric">
          <span>Tiempo</span>
          <strong>{formatCountdown(left)}</strong>
        </div>
        <div className="timed-metric score-metric">
          <span>Resueltas</span>
          <strong>{score}</strong>
        </div>
      </header>
      <Board guesses={guesses} current={current} solution={solution} />
      <Keyboard
        onKey={key}
        guesses={guesses}
        solution={solution}
        disabled={transitioning || paused}
      />
      {paused && (
        <section className="pause-overlay result">
          <h2>Partida pausada</h2>
          <p>El tiempo se detuvo mientras la aplicación estaba en segundo plano.</p>
          <button onClick={onResume}>Reanudar</button>
        </section>
      )}
    </main>
  );
}
function Timed({
  data,
  setData,
  onHome,
  toast,
}: {
  data: AppData;
  setData: (d: AppData) => void;
  onHome: () => void;
  toast: (message: string) => void;
}) {
  const [duration, setDuration] = useState(3);
  const [playing, setPlaying] = useState(false);
  const [end, setEnd] = useState(0);
  const [left, setLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  useEffect(() => {
    if (!playing || paused) return;
    const tick = () => {
      const l = Math.max(0, end - Date.now());
      setLeft(l);
      if (!l) {
        setPlaying(false);
        setEnded(true);
        setData({
          ...data,
          timeRecords: {
            ...data.timeRecords,
            [duration]: Math.max(score, data.timeRecords[duration] ?? 0),
          },
        });
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [data, duration, end, paused, playing, score, setData]);
  useEffect(() => {
    const visibility = () => {
      if (document.hidden && playing) setPaused(true);
    };
    document.addEventListener('visibilitychange', visibility);
    return () => document.removeEventListener('visibilitychange', visibility);
  }, [playing]);
  if (!playing && !ended)
    return (
      <main>
        <button className="back" onClick={onHome}>
          ← Inicio
        </button>
        <section className="hero compact">
          <span className="eyebrow">CONTRARRELOJ</span>
          <h1>
            Piensa rápido.
            <br />
            Juega limpio.
          </h1>
          <p>La sesión se pausa al pasar a segundo plano.</p>
          <div className="duration">
            {[1, 3, 5].map((x) => (
              <button
                className={duration === x ? 'active' : ''}
                onClick={() => setDuration(x)}
                key={x}
              >
                {x} min
              </button>
            ))}
          </div>
          <button
            className="primary"
            onClick={() => {
              setPlaying(true);
              setEnd(Date.now() + duration * 60000);
              setLeft(duration * 60000);
            }}
          >
            Comenzar
          </button>
          <p>Récord: {data.timeRecords[duration] ?? 0}</p>
        </section>
      </main>
    );
  if (ended)
    return (
      <main className="timed-summary">
        <section className="result">
          <span className="eyebrow">TIEMPO TERMINADO</span>
          <h1>{score}</h1>
          <h2>{score === 1 ? 'palabra resuelta' : 'palabras resueltas'}</h2>
          <p>Récord de {duration} min: {Math.max(score, data.timeRecords[duration] ?? 0)}</p>
          <button
            onClick={() => {
              setScore(0);
              setEnded(false);
            }}
          >
            Jugar otra vez
          </button>
          <button className="secondary" onClick={onHome}>Inicio</button>
        </section>
      </main>
    );
  return (
    <TimedPuzzle
      left={left}
      score={score}
      paused={paused}
      onSolved={() => setScore((value) => value + 1)}
      onResume={() => {
        setEnd(Date.now() + left);
        setPaused(false);
      }}
      onHome={onHome}
      toast={toast}
    />
  );
}
export function App() {
  const [page, setPage] = useState<Page>('home');
  const [data, setDataState] = useState(load);
  const [message, setMessage] = useState('');
  const timer = useRef<number>();
  const setData = (d: AppData) => {
    setDataState(d);
    save(d);
  };
  const toast = (s: string) => {
    setMessage(s);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(''), 2500);
  };
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme;
    document.documentElement.dataset.contrast = String(data.settings.contrast);
  }, [data.settings]);
  if (page === 'daily' || page === 'unlimited')
    return (
      <>
        <Game
          mode={page}
          data={data}
          setData={setData}
          toast={toast}
          onHome={() => setPage('home')}
        />
        <div className="toast" aria-live="polite">
          {message}
        </div>
      </>
    );
  if (page === 'timed')
    return (
      <>
        <Timed
          data={data}
          setData={setData}
          onHome={() => setPage('home')}
          toast={toast}
        />
        <div className="toast" aria-live="polite">{message}</div>
      </>
    );
  return (
    <main>
      <header className="top">
        <a className="brand" href="#" onClick={() => setPage('home')}>
          <span>W</span> Worldvy
        </a>
        <nav>
          <button onClick={() => setPage('stats')}>Estadísticas</button>
          <button onClick={() => setPage('settings')}>Ajustes</button>
        </nav>
      </header>
      {page === 'home' && (
        <>
          <section className="hero">
            <span className="eyebrow">PALABRAS A TU RITMO</span>
            <h1>
              Una palabra.
              <br />
              <em>Tres maneras</em> de jugar.
            </h1>
            <p>
              Descubre palabras en español, reta al reloj o juega sin límites. Todo queda en tu
              dispositivo.
            </p>
          </section>
          <section className="modes">
            <button className="mode daily" onClick={() => setPage('daily')}>
              <b>01</b>
              <span>
                <strong>Palabra diaria</strong>
                <small>El mismo reto para todo tu día</small>
              </span>
              <i>→</i>
            </button>
            <button className="mode free" onClick={() => setPage('unlimited')}>
              <b>02</b>
              <span>
                <strong>Partida ilimitada</strong>
                <small>Una ruta de palabras sin esperas</small>
              </span>
              <i>→</i>
            </button>
            <button className="mode clock" onClick={() => setPage('timed')}>
              <b>03</b>
              <span>
                <strong>Contrarreloj</strong>
                <small>1, 3 o 5 minutos de intensidad</small>
              </span>
              <i>→</i>
            </button>
          </section>
        </>
      )}
      {page === 'stats' && (
        <Info title="Tus números">
          <div className="stats">
            <b>
              {data.dailyStats.played}
              <small>Diarias</small>
            </b>
            <b>
              {data.dailyStats.won}
              <small>Victorias</small>
            </b>
            <b>
              {data.dailyStats.bestStreak}
              <small>Mejor racha</small>
            </b>
          </div>
        </Info>
      )}
      {page === 'help' && (
        <Info title="Cómo jugar">
          <p>
            Escribe una palabra española de cinco letras. Tienes seis intentos. Verde indica
            posición exacta, ámbar una letra presente en otra posición y gris una letra ausente.
          </p>
        </Info>
      )}
      {page === 'credits' && (
        <Info title="Origen y créditos">
          <p>
            Vocabulario amplio derivado de listados oficiales de frecuencia de CORPES XXI 1.0 (RAE y
            ASALE), procesado y filtrado bajo CC BY-SA 4.0. No representa todas las palabras de la
            RAE.
          </p>
        </Info>
      )}
      {page === 'settings' && (
        <Info title="Ajustes">
          <label>
            Tema{' '}
            <select
              value={data.settings.theme}
              onChange={(e) =>
                setData({
                  ...data,
                  settings: {
                    ...data.settings,
                    theme: e.target.value as 'system' | 'light' | 'dark',
                  },
                })
              }
            >
              <option value="system">Sistema</option>
              <option value="light">Claro</option>
              <option value="dark">Oscuro</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={data.settings.animations}
              onChange={(e) =>
                setData({ ...data, settings: { ...data.settings, animations: e.target.checked } })
              }
            />{' '}
            Animaciones
          </label>
          <label>
            <input
              type="checkbox"
              checked={data.settings.haptics}
              onChange={(e) =>
                setData({ ...data, settings: { ...data.settings, haptics: e.target.checked } })
              }
            />{' '}
            Vibración
          </label>
          <button
            className="danger"
            onClick={() => {
              if (confirm('¿Borrar todas las partidas y estadísticas?')) {
                clear();
                setDataState(load());
              }
            }}
          >
            Borrar datos locales
          </button>
        </Info>
      )}
      <footer>
        <button onClick={() => setPage('help')}>Cómo jugar</button>
        <button onClick={() => setPage('credits')}>Créditos</button>
        <span>Funciona sin conexión</span>
      </footer>
      {needRefresh && (
        <div className="update">
          Hay una versión nueva.{' '}
          <button onClick={() => updateServiceWorker(true)}>Actualizar</button>
        </div>
      )}
    </main>
  );
}
function Info({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="info">
      <button className="back" onClick={() => location.reload()}>
        ← Inicio
      </button>
      <h1>{title}</h1>
      {children}
    </section>
  );
}
