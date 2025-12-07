import fixStatlessAlbum from './checks/fix-statless-album.js';
import fixTaglessAlbum from './checks/fix-tagless-album.js';
import renewOldStats from './checks/renew-old-stats.js';
import renewOldTags from './checks/renew-old-tags.js';

await renewOldStats();
await renewOldTags();
await fixTaglessAlbum();
await fixStatlessAlbum();
