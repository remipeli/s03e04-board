# sched-prod incident board — plan

The on-call board for sched-prod. One page, one list: tonight's incidents, newest first, so on-call sees
what just broke and takes it.

## Flows

| flow | who | what happens |
|------|-----|--------------|
| `open-board` | on-call | opens the board; sees tonight's incidents |
| `ack-incident` | on-call | picks an incident on the board, clicks Ack, reads the confirm that names it, and acks it — "I've got this one" |
| `watch-board` | on-call | keeps the board open; it stays current without a reload |

## Requirements

- **R1** New incidents appear live at the top of the list, newest first.
- **R2** Each incident row has an **Ack** button. Ack opens a confirm that names the incident id (and its
  severity, service, region and summary); only **confirm** sends the ack (`api.ack(id)`) and marks the row acked.
  Cancel or Escape sends nothing. The list stays live while the confirm is open, and the confirm keeps the
  incident it was opened for. (Changed 2026-10-25 by product's decision, SCHED-4515.)
- **R3** Show a loader until incidents load.
- **R4** The board refreshes itself every 2 seconds while open.
- **R5** Times show in the viewer's local time; day before month for EU locales (dd/mm).
- **R6** The page names its build: `<meta name="build" content="<git sha>">` in the head and the same sha in the footer.

## Hooks (pinned — tests and the replay rely on them)

| `data-testid` | element |
|---------------|---------|
| `board` | the board's main area |
| `loader` | the loader (gone once incidents load) |
| `empty` | what shows when there are no incidents |
| `incident-list` | the list |
| `incident-row` | one incident row, with `data-id="<incident id>"` |
| `ack` | the Ack button in a row |
| `acked` | the acked mark in a row |
| `build-sha` | the sha in the footer |
| `confirm` | the Ack confirm, naming the incident id |
| `confirm-ack` | the confirm's Ack button (sends the ack) |
| `confirm-cancel` | the confirm's Cancel button (sends nothing) |

## Decisions

- **2026-10-25, product** — after the step-one recording, where a refresh moved the rows under the pointer
  and a click aimed at INC-9147 acked INC-1584 (00:11): "New incidents stay live at the top and Ack stays on
  the row, but Ack asks to confirm, and the confirm names the incident id." R1 and R4 stay; R2 changes.

## Done

Every issue in `issues/` delivered, deployed to a public https address, and shown working.
