export interface ParticularTagListItem {
  albumArtist: string;
  albumName: string;
  place: number;
}

type ChangeEntry = [string, string, string] | '…';

const getSig = (item: ParticularTagListItem) =>
  `${item.albumArtist} - ${item.albumName}`;

function createLookups(list: ParticularTagListItem[]) {
  const byPlace = new Map<number, ParticularTagListItem>();
  const bySig = new Map<string, ParticularTagListItem>();
  for (const item of list) {
    byPlace.set(item.place, item);
    bySig.set(getSig(item), item);
  }
  return { byPlace, bySig };
}

export default function compareOldNewList(
  oldList: ParticularTagListItem[],
  newList: ParticularTagListItem[],
  maxPlace = 100,
) {
  const changeList: ChangeEntry[] = [];
  const toUpdate: ParticularTagListItem[] = [];
  const toInsert: ParticularTagListItem[] = [];
  const toEnrich: ParticularTagListItem[] = [];

  const oldMap = createLookups(oldList);
  const newMap = createLookups(newList);

  for (let place = 1; place <= maxPlace; place++) {
    const newItem = newMap.byPlace.get(place);
    const oldItem = oldMap.byPlace.get(place);

    // ---------------------------------------------------------
    // 1. THE GUARD: If identical, do NOTHING.
    // ---------------------------------------------------------
    if (newItem && oldItem && getSig(newItem) === getSig(oldItem)) {
      continue; // Skip DB writes AND visual logs for this slot
    }
    if (!newItem) {
      throw new Error(`Item at place ${place} was not generated`);
    }

    // ---------------------------------------------------------
    // 2. Database Operations (Only reached if changed or empty)
    // ---------------------------------------------------------

    if (oldItem) {
      // Slot exists but Signature changed -> UPDATE
      toUpdate.push(newItem);
    } else {
      // Slot didn't exist -> INSERT
      toInsert.push(newItem);
    }

    // Check Enrichment (New ALBUM entering the chart?)
    if (!oldMap.bySig.has(getSig(newItem))) {
      toEnrich.push(newItem);
    }

    // ---------------------------------------------------------
    // 3. Visual Reporting
    // ---------------------------------------------------------

    // A. Handle "The Drop" (Old item at this slot is gone from chart)
    if (oldItem) {
      const oldSig = getSig(oldItem);
      // We only log a drop if the item is COMPLETELY gone from the new list
      if (!newMap.bySig.has(oldSig)) {
        changeList.push(['❌', '', oldSig]);
      }
    }

    // If there is no new item (chart shrank), we are done with this slot
    if (!newItem) continue;

    const newSig = getSig(newItem);
    const oldVersionOfNewItem = oldMap.bySig.get(newSig);

    // B. Handle "The Arrival"

    // Case 1: Brand New Entry
    if (oldVersionOfNewItem) {
      // Check for Block Move (Cascading shift) to prevent spam
      const previousNew = newMap.byPlace.get(place - 1);
      let isBlockMove = false;

      if (previousNew) {
        const previousOld = oldMap.bySig.get(getSig(previousNew));
        // If the item above moved by the exact same amount as this one
        if (
          previousOld &&
          place - oldVersionOfNewItem.place ===
            previousNew.place - previousOld.place
        ) {
          isBlockMove = true;
        }
      }

      if (isBlockMove) {
        if (changeList.at(-1) !== '…') {
          changeList.push('…');
        }
      } else {
        const direction = place > oldVersionOfNewItem.place ? '⬇️' : '⬆️';
        changeList.push([
          direction,
          `${place}←${oldVersionOfNewItem.place}`,
          newSig,
        ]);
      }
    }
    // Case 2: Movement (We already know it's not a stationary match due to Step 1)
    else {
      changeList.push(['➕', `${place}`, newSig]);
    }
  }

  // This assertion will now pass safely
  if ((changeList.length === 0) !== (toInsert.length + toUpdate.length === 0)) {
    // Note: This might still trigger if a chart shrinks (removed items)
    // because you don't use DELETE queries in this logic.
    // If shrinking is rare/impossible, this is fine.
    throw new Error('The change list cannot be empty when there are updates');
  }

  return { changeList, toEnrich, toInsert, toUpdate };
}
