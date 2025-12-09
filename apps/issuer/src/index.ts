import checkListlessTag from './checks/check-listless-tag.js';
import fixStatlessAlbum from './checks/fix-statless-album.js';
import fixTaglessAlbum from './checks/fix-tagless-album.js';
import renewOldList from './checks/renew-old-list.js';
import renewOldStats from './checks/renew-old-stats.js';
import renewOldTags from './checks/renew-old-tags.js';
import scrapeOldScrapedTag from './checks/scrape-old-scraped-tag.js';
import scrapeUnscrapedTag from './checks/scrape-unscraped-tag.js';
import rollUnder from './roll-under.js';

if (rollUnder(1 / 500)) {
  await scrapeOldScrapedTag();
}
if (rollUnder(1 / 1000)) {
  await scrapeUnscrapedTag();
}
await checkListlessTag();
await renewOldStats();
await renewOldTags();
await fixTaglessAlbum();
await fixStatlessAlbum();
await renewOldList();
console.log('bye!');
// eslint-disable-next-line unicorn/no-process-exit
process.exit(0);
