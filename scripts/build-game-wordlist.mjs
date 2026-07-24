import { mkdir, writeFile } from 'node:fs/promises';
import words from 'an-array-of-spanish-words' with { type: 'json' };

const normalize = (value) =>
  value
    .trim()
    .toLocaleUpperCase('es')
    .replaceAll('Ñ', '\uE000')
    .normalize('NFD')
    .replace(/[\u0300-\u0308]/g, '')
    .replaceAll('\uE000', 'Ñ')
    .normalize('NFC');

const accepted = [
  ...new Set(
    words
      .filter((word) => /^[a-záéíóúüñ]+$/iu.test(word))
      .map(normalize)
      .filter((word) => [...word].length === 5),
  ),
].sort((a, b) => a.localeCompare(b, 'es'));

await mkdir('src/data/generated', { recursive: true });
await writeFile('src/data/generated/accepted-five-letter.json', JSON.stringify(accepted));
