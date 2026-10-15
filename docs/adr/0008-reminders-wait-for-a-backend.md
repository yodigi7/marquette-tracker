# Reminders wait for a backend

A daily reminder to log the day's readings is wanted and will be built — but only once we adopt a server.
Until then nothing is scheduled and nothing is pushed, and the only prompt the app gives is the
session-scoped nudge that opens today's entry when you land on the calendar.

Push is the only mechanism that fires when the app is closed, and it is the only one that needs a server
to send from. There was a third option once: the Notification Triggers API would have scheduled a
notification from the browser with nothing behind it, and Google discontinued it before it shipped. It is
worth writing down because it is why this is a backend decision rather than an implementation one — and
because it will be proposed again by anyone who remembers it.

The cost we accept: the feature sits behind a decision we have not made, and the most common reason
people abandon a tracking app goes unaddressed until then. The calendar's auto-open stays as it is — a
nudge, not a reminder, and not a substitute for one.

A reminder must never reach a day the user already logged, and that is not a client-side decision. Safari
revokes notification permission when a push arrives and the service worker does not display it, so
suppressing at display time can cost the permission outright. The server has to know which days are
logged. That is also why the server stays ignorant of everything else — it knows a device address and a
schedule, and nothing about the cycle.
