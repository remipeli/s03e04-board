---
id: SCHED-4515
title: Ack asks to confirm, naming the incident
status: done
plan: R2
---

Product's decision after the step-one recording: at 00:11 a refresh put INC-1584 on top while the pointer was
on INC-9147's Ack, and the click acked INC-1584. New incidents stay live at the top and Ack stays on the row,
but Ack asks to confirm, and the confirm names the incident id.

- Ack opens a confirm (`data-testid="confirm"`) that names the incident id; `confirm-ack` sends the ack,
  `confirm-cancel` (or Escape) sends nothing.
- The confirm keeps the incident it was opened for while the list moves under it.
- Focus opens on Cancel, so a second click or Enter does not ack blind.

Acceptance: a click that lands on the wrong row shows the wrong id in the confirm, and Cancel sends no ack;
the right row's confirm acks that incident.
