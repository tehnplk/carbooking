# Outside Office Hours Message Design

## Goal

Update the second line of the outside-office-hours notice on `/bookings/add` so users see the requested wording.

## Scope

Replace only the existing second-line notice text with:

`วันหยุดและวันธรรมดาช่วงเวลา 16.31 ถึง 08.29 น. กรุณาติดต่องานยานพาหนะ`

Keep the existing heading, alert layout, and outside-office-hours display condition unchanged.

## Verification

Confirm that the notice displays the exact approved second-line text when `/bookings/add` is shown outside office hours. Run the project lint check after the implementation change.
