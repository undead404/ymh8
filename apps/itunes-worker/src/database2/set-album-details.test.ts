import type { Transaction } from 'kysely';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createKyselyMock } from '@ymh8/database';

import setAlbumDetails from './set-album-details.js';

const mockAlbum = { artist: 'Radiohead', name: 'OK Computer' };

describe('setAlbumDetails', () => {
  // 1. Initialize the mock factory
  const { db, builder, execute } = createKyselyMock();

  beforeEach(() => {
    vi.clearAllMocks(); // Critical: reset call counts between tests
  });

  it('updates both Date and Tracks when date is better and tracks are new', async () => {
    const oldDetails = { date: '1997', numberOfTracks: null };
    const newDetails = { date: '1997-05-21', numberOfTracks: 12 };

    // Cast 'db' to Transaction because the mock factory returns a generic Kysely instance
    // verifying the logic works regardless of the specific Kysely type.
    const result = await setAlbumDetails(
      db as unknown as Transaction<any>,
      mockAlbum,
      oldDetails,
      newDetails,
    );

    // Assert Return
    expect(result).toEqual({ date: '1997-05-21', numberOfTracks: 12 });

    // Assert DB Entry
    expect(db.updateTable).toHaveBeenCalledWith('Album');

    // Assert Chained Methods (via the 'builder' proxy)
    // The builder captures ALL calls to .set(), .where(), etc.
    expect(builder.set).toHaveBeenCalledWith({
      date: '1997-05-21',
      numberOfTracks: 12,
    });

    expect(builder.where).toHaveBeenCalledWith('artist', '=', 'Radiohead');
    expect(builder.where).toHaveBeenCalledWith('name', '=', 'OK Computer');

    // Assert Execution
    expect(execute).toHaveBeenCalled();
  });

  it('updates only Date if tracks already exist', async () => {
    const oldDetails = { date: '1997', numberOfTracks: 12 };
    const newDetails = { date: '1997-05-21', numberOfTracks: 12 };

    const result = await setAlbumDetails(
      db as unknown as Transaction<any>,
      mockAlbum,
      oldDetails,
      newDetails,
    );

    expect(result).toEqual({ date: '1997-05-21' });

    // Check strict set content
    expect(builder.set).toHaveBeenCalledWith({ date: '1997-05-21' });

    // Ensure we didn't overwrite tracks
    expect(builder.set).not.toHaveBeenCalledWith(
      expect.objectContaining({ numberOfTracks: 12 }),
    );
  });

  it('does nothing if no new info is available', async () => {
    const oldDetails = { date: '1997-05-21', numberOfTracks: 12 };

    const result = await setAlbumDetails(
      db as unknown as Transaction<any>,
      mockAlbum,
      oldDetails,
      oldDetails,
    );

    expect(result).toBeUndefined();
    expect(db.updateTable).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });
});
