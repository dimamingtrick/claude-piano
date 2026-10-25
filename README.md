# piano

A Claude Code mod: type `/piano` and a playable piano opens right above the prompt, with real white and black keys and sound.

## What you can do

- **Click a key** to play it; **drag across the keys** with the button held for a glissando.
- **Click the piano once**, then play from your keyboard (works in Latin, Russian and Ukrainian layouts):
  - lower octave: `Z S X D C V G B H N J M`
  - upper octave: `Q 2 W 3 E R 5 T 6 Y 7 U I`
  - `←` `→` shift the keyboard an octave; `Esc` returns to the prompt.
- **◀ ▶** in the header shift the octave too; **Close** (or `/piano` again) hides it.

The piano fits as many keys as the window is wide (about three and a half octaves in a usual window), and has sound for every note from C1 to C8.

## Install

One line (installs, or updates when already installed):

```
curl -fsSL https://raw.githubusercontent.com/dimamingtrick/claude-piano/main/install.sh | bash
```

Or by hand:

```
claude plugin marketplace add dimamingtrick/claude-piano
claude plugin install piano@dimamingtrick-piano
```

Then start a new session and type `/piano`. The piano draws in the desktop app's Code tab and in the terminal.

## Update

Run the install line again, or:

```
claude plugin marketplace update dimamingtrick-piano
claude plugin update piano@dimamingtrick-piano
```

Then start a new session.

## What it runs

Everything happens inside Claude Code, nothing leaves your machine. The mod draws the piano above the prompt and plays its bundled note sounds (`afplay` on macOS). It reads and writes no files and makes no network requests.

## License

MIT
