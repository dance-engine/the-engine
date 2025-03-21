export const deDupKeys = (keys: string[]) => {
  const countMap = new Map();

  return keys.map(item => {
    const count = countMap.get(item) || 0;
    countMap.set(item, count + 1);

    return count === 0 ? item : `${item}_${count + 1}`;
  });
}
