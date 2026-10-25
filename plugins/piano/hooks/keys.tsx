import type { ClientModule, RenderElement } from 'claude-code'

// Props from the hooks module: the lowest octave and how many white keys fit.
type Props = { octave: number; count: number }

type State = {
  // Semitone (0 = C of the lowest octave) drawn as pressed, or null.
  lit: number | null
  // Ticks left before a key press stops showing.
  ttl: number
  // Semitone held down by the mouse, or null.
  held: number | null
}

// A white key is 3 cells plus a 1-cell gap; a black key is 3 cells.
const PITCH = 4
const BLACK_WIDTH = 3
const WHITE_ROWS = 6
const BLACK_ROWS = 4
// The dark frame around the keys.
const PAD_X = 1
const PAD_Y = 1

const SCALE = [0, 2, 4, 5, 7, 9, 11]
const NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B']

function whiteStep(i: number): number {
  return Math.floor(i / 7) * 12 + (SCALE[i % 7] ?? 0)
}

// A black key follows C, D, F, G and A.
function hasBlack(i: number, count: number): boolean {
  return i < count - 1 && [0, 1, 3, 4, 5].includes(i % 7)
}

function blackLeft(i: number): number {
  return (i + 1) * PITCH - 2
}

// Tracker layout: Z-row is the lower octave, Q-row the upper one.
const LATIN: Record<string, number> = {
  z: 0, s: 1, x: 2, d: 3, c: 4, v: 5, g: 6, b: 7, h: 8, n: 9, j: 10, m: 11,
  q: 12, '2': 13, w: 14, '3': 15, e: 16, r: 17, '5': 18, t: 19, '6': 20,
  y: 21, '7': 22, u: 23, i: 24,
}

// The same physical keys on a Russian or Ukrainian layout.
const CYRILLIC: Record<string, string> = {
  я: 'z', ы: 's', і: 's', ч: 'x', в: 'd', с: 'c', м: 'v', п: 'g', и: 'b',
  р: 'h', т: 'n', о: 'j', ь: 'm', й: 'q', ц: 'w', у: 'e', к: 'r', е: 't',
  н: 'y', г: 'u', ш: 'i',
}

const KEY_HINT: Record<number, string> = {}
for (const [key, step] of Object.entries(LATIN)) {
  KEY_HINT[step] = key.toUpperCase()
}

const COLORS = {
  frame: '#2a2a2d',
  white: '#fbfbf8',
  whiteLit: '#8fbaff',
  black: '#101012',
  blackLit: '#3b78e7',
  label: '#7d7d80',
  blackLabel: '#a0a0a5',
}

// Which semitone sits under a cell of the region, or null.
function stepAt(cellX: number, cellY: number, count: number): number | null {
  const x = cellX - PAD_X
  const y = cellY - PAD_Y
  if (x < 0 || y < 0 || y >= WHITE_ROWS || x >= count * PITCH) return null

  if (y < BLACK_ROWS) {
    for (let i = 0; i < count; i++) {
      const left = blackLeft(i)
      if (hasBlack(i, count) && x >= left && x < left + BLACK_WIDTH) {
        return whiteStep(i) + 1
      }
    }
  }

  return whiteStep(Math.floor(x / PITCH))
}

const Keys: ClientModule<Props, State> = (props, surface) => {
  const { Box, Text } = surface.elements
  const count = props.count
  const state: State = surface.state ?? { lit: null, ttl: 0, held: null }
  const top = whiteStep(count - 1)

  const set = (next: Partial<State>) => {
    surface.setState({ ...(surface.state ?? state), ...next })
  }

  const play = (step: number) => {
    surface.post({ play: step })
  }

  if (surface.state === undefined) {
    surface.every(40, () => {
      const now = surface.state
      if (now === undefined || now.lit === null || now.held !== null) return
      if (now.ttl > 1) {
        surface.setState({ ...now, ttl: now.ttl - 1 })
      } else {
        surface.setState({ ...now, lit: null, ttl: 0 })
      }
    })
    surface.setState(state)
  }

  // Re-set on every draw so the listeners see the latest props.
  surface.onPointer(event => {
    const current = surface.state ?? state
    if (event.type === 'down' && event.button === 'left') {
      const step = stepAt(event.x, event.y, count)
      if (step === null) return
      play(step)
      set({ lit: step, held: step, ttl: 4 })
    } else if (event.type === 'move' && current.held !== null) {
      // Slide across the keys while the button is held: a glissando.
      const step = stepAt(event.x, event.y, count)
      if (step === null || step === current.held) return
      play(step)
      set({ lit: step, held: step, ttl: 4 })
    } else if (event.type === 'up' || event.type === 'leave') {
      if (current.held !== null) set({ held: null, ttl: 3 })
    }
  })

  surface.onKey(event => {
    if (event.ctrl || event.meta) return
    if (event.key === 'left' || event.key === 'down') {
      surface.post({ shift: -1 })
      return
    }
    if (event.key === 'right' || event.key === 'up') {
      surface.post({ shift: 1 })
      return
    }
    const char = event.key.toLowerCase()
    const step = LATIN[CYRILLIC[char] ?? char]
    if (step === undefined || step > top) return
    play(step)
    set({ lit: step, ttl: 5 })
  })

  const whites: RenderElement[] = []
  const blacks: RenderElement[] = []

  for (let i = 0; i < count; i++) {
    const step = whiteStep(i)
    const color = state.lit === step ? COLORS.whiteLit : COLORS.white
    const label = step % 12 === 0 ? `${NAMES[0]}${props.octave + step / 12}` : ' '

    whites.push(
      <Box
        key={`w${i}`}
        flexDirection="column"
        justifyContent="flex-end"
        alignItems="center"
        width={PITCH - 1}
        height={WHITE_ROWS}
        marginRight={i < count - 1 ? 1 : 0}
        flexShrink={0}
        backgroundColor={color}
      >
        <Text color={COLORS.label} backgroundColor={color}>
          {label}
        </Text>
        <Text color={COLORS.label} backgroundColor={color}>
          {KEY_HINT[step] ?? ' '}
        </Text>
      </Box>,
    )

    if (hasBlack(i, count)) {
      const black = step + 1
      const shade = state.lit === black ? COLORS.blackLit : COLORS.black
      blacks.push(
        <Box
          key={`b${i}`}
          position="absolute"
          top={PAD_Y}
          left={PAD_X + blackLeft(i)}
          width={BLACK_WIDTH}
          height={BLACK_ROWS}
          flexDirection="column"
          justifyContent="flex-end"
          alignItems="center"
          backgroundColor={shade}
        >
          <Text color={COLORS.blackLabel} backgroundColor={shade}>
            {KEY_HINT[black] ?? ' '}
          </Text>
        </Box>,
      )
    }
  }

  return (
    <Box
      flexDirection="row"
      width={count * PITCH + PAD_X * 2 - 1}
      height={WHITE_ROWS + PAD_Y * 2}
      paddingX={PAD_X}
      paddingY={PAD_Y}
      backgroundColor={COLORS.frame}
    >
      {whites}
      {blacks}
    </Box>
  )
}

export default Keys
