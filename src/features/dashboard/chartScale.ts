/** Readable ticks for counts and continuous values, with a real zero baseline. */
export function chartScale(values: number[], requestedMaximum = 0) {
  const finite = values.filter(Number.isFinite);
  const low = Math.min(0, ...finite);
  const high = Math.max(0, Number.isFinite(requestedMaximum) ? requestedMaximum : 0, ...finite);
  if (low === high) return { minimum: 0, maximum: 1, axisValues: [1, 0] };
  const rawStep = (high - low) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  let step = ([1, 2, 2.5, 5, 10].find(value => value * magnitude >= rawStep) ?? 10) * magnitude;
  if (finite.every(Number.isInteger) && Number.isInteger(requestedMaximum)) step = Math.max(1, Math.ceil(step));
  const clean = (value: number) => Number(value.toPrecision(12));
  const minimum = clean(Math.floor(low / step) * step);
  const maximum = clean(Math.ceil(high / step) * step);
  const count = Math.round((maximum - minimum) / step);
  return { minimum, maximum, axisValues: Array.from({ length: count + 1 }, (_, index) => clean(maximum - index * step)) };
}
