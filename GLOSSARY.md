# Marquette Fertility Tracker

The language the app uses with the person using it. Every term here is user-facing: it names what
someone sees, reads, or hears. The code keeps a more precise vocabulary of its own, deliberately and
for good reason — see [ADR 0001](./docs/adr/0001-one-word-predicted-across-the-app.md).

## Language

**Predicted**:
Anything the app works out about a day that has not happened yet, and everything it draws or says
about such a day.
_Avoid_: forecast, projected, estimated, expected, predicted ovulation

**Predicted period start**:
A future day the app expects the next period to begin on. Distinct from a period day the user
actually logged.
_Avoid_: predicted menses, projected period, forecast period

**Predicted fertile window day**:
A future day the app expects to fall inside the fertile window.
_Avoid_: predicted ovulation, projected window, forecast window

**Logged**:
A value the user entered themselves, as opposed to one the app worked out. The printable instructor
documents contain only logged values and protocol rules applied to them — never a prediction.
_Avoid_: recorded, entered, actual

**Peak**:
The monitor reading that signals ovulation has occurred. It only ever comes from a reading the user
logged, so a future day can never be one.
_Avoid_: ovulation, confirmed ovulation

**Fertile window**:
The interval of days the Marquette protocol marks as fertile, derived from monitor readings.
_Avoid_: fertile days, fertile period
