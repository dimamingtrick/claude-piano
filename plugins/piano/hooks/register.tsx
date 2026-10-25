import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const isOpen = atom({ plugin: 'piano', key: 'isOpen' } as const, false)
const octave = atom({ plugin: 'piano', key: 'octave' } as const, 3)

// The sound files cover C1 to C8; the keyboard starts on a C in between.
const MIN_OCTAVE = 1
const MAX_OCTAVE = 6
const TOP_OCTAVE = 8
// A white key takes 4 cells; the dark frame takes 1 on each side.
const KEY_PITCH = 4

const NAMES = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B']

export function noteFile(base: number, step: number): string {
  const octaveOf = base + Math.floor(step / 12)

  return `sounds/${NAMES[step % 12]}${octaveOf}.wav`
}

// The keyboard's span, as `C3–E6`.
export function rangeLabel(base: number, count: number): string {
  const last = count - 1
  const name = 'CDEFGAB'[last % 7]

  return `C${base}–${name}${base + Math.floor(last / 7)}`
}

export function clampOctave(value: number): number {
  return Math.min(MAX_OCTAVE, Math.max(MIN_OCTAVE, value))
}

// How many white keys fit the band, never past C8.
export function keyCount(columns: number, base: number): number {
  const fit = Math.floor((columns - 1) / KEY_PITCH)
  const room = (TOP_OCTAVE - base) * 7 + 1

  return Math.max(8, Math.min(fit, room))
}

function shift($: Parameters<typeof read>[0], by: number) {
  return update($, octave, value => clampOctave(value + by))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'piano',
      description: 'Показать или скрыть пианино над полем ввода',
    })

    return next(e)
  })

  on('command.run', { command: 'piano' }, async $ => {
    const wasOpen = await read($, isOpen)
    await update($, isOpen, () => !wasOpen)

    return { text: wasOpen ? 'Пианино закрыто.' : 'Пианино открыто.' }
  })

  // The keys module posts a note to play or an octave change.
  on('ui.message', async ($, e, next) => {
    if (e.element !== 'keys') return next(e)
    const data = e.data as { play?: unknown; shift?: unknown } | null

    if (typeof data?.play === 'number') {
      const base = clampOctave(await read($, octave))
      void $.audio.play({ asset: noteFile(base, data.play) }).catch(() => {})
    } else if (typeof data?.shift === 'number') {
      await shift($, data.shift)
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || !(await read($, isOpen))) {
      return next(e)
    }

    const table = $.ui.resolve(e)
    const { Box, Button, Text } = table
    const Client = 'Client' in table ? table.Client : undefined
    const base = clampOctave(await read($, octave))
    const count = keyCount(e.props.bodyColumns, base)

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="row" alignItems="center" gap={1}>
          <Text bold>🎹 Пианино</Text>
          <Button
            key="down"
            plain
            dimColor={base <= MIN_OCTAVE}
            onPress={() => void shift($, -1)}
          >
            ◀
          </Button>
          <Text>
            {rangeLabel(base, count)}
          </Text>
          <Button
            key="up"
            plain
            dimColor={base >= MAX_OCTAVE}
            onPress={() => void shift($, 1)}
          >
            ▶
          </Button>
          <Box flexGrow={1} />
          <Button key="close" role="dismiss" onPress={() => void update($, isOpen, () => false)}>
            Закрыть
          </Button>
        </Box>
        {Client === undefined ? (
          <Text dimColor>Здесь пианино не рисуется: откройте его в приложении или терминале.</Text>
        ) : (
          <Client key="keys" module="./keys.tsx" props={{ octave: base, count }} />
        )}
        <Text dimColor>
          Кликайте по клавишам. Кликните один раз — и играйте с клавиатуры: Z S X D C V G B H N J M — нижняя
          октава, Q 2 W 3 E R 5 T 6 Y 7 U I — верхняя, ← → — октава, Esc — назад к вводу.
        </Text>
      </Box>
    )
  })
}
