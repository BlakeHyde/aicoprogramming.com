const serialPattern = /^[1-9]\d*(?:\.[1-9]\d*)*$/;

export function serialParts(serial) {
  const value = String(serial);
  if (!serialPattern.test(value)) {
    throw new Error(`Invalid essay serial: ${value}. Use positive integer segments, such as 2.1.1.`);
  }
  return value.split(".").map(BigInt);
}

export function compareSerials(a, b) {
  const left = serialParts(a.serial);
  const right = serialParts(b.serial);
  for (let index = 0; index < Math.min(left.length, right.length); index++) {
    if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
  }
  return left.length - right.length;
}

export function essayTree(essays) {
  const nodes = new Map();
  for (const essay of [...essays].sort(compareSerials)) {
    const serial = String(essay.serial);
    serialParts(serial);
    if (nodes.has(serial)) throw new Error("Essay serial numbers must be unique.");
    nodes.set(serial, {
      ...essay,
      label: serial.split(".").at(-1).padStart(3, "0"),
      children: [],
    });
  }
  const roots = [];
  for (const [serial, node] of nodes) {
    const parentSerial = serial.split(".").slice(0, -1).join(".");
    if (!parentSerial) roots.push(node);
    else {
      const parent = nodes.get(parentSerial);
      if (!parent) throw new Error(`Essay ${serial} needs parent essay ${parentSerial}.`);
      parent.children.push(node);
    }
  }
  return roots;
}
