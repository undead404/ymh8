import checkDescriptionlessTag from './checks/check-descriptionless-tag.js';
import checkListlessTag from './checks/check-listless-tag.js';
import fixStatlessAlbum from './checks/fix-statless-album.js';
import fixTaglessAlbum from './checks/fix-tagless-album.js';
import renewOldList from './checks/renew-old-list.js';
import renewOldStats from './checks/renew-old-stats.js';
import renewOldTags from './checks/renew-old-tags.js';
import scrapeOldScrapedTag from './checks/scrape-old-scraped-tag.js';
import scrapeUnscrapedTag from './checks/scrape-unscraped-tag.js';
import kysely from './database2/index.js';
import rollUnder from './roll-under.js';

await kysely.transaction().execute(async (trx) => {
  if (rollUnder(0.12)) {
    await scrapeOldScrapedTag(trx);
  }
  if (rollUnder(3 / 1000)) {
    await scrapeUnscrapedTag(trx);
  }
  if (rollUnder(1)) {
    await checkDescriptionlessTag(trx);
  }
  if (rollUnder(1 / 10)) {
    await checkListlessTag(trx);
  }
  await renewOldStats(trx);
  await renewOldTags(trx);
  if (rollUnder(17 / 500)) {
    await fixTaglessAlbum(trx);
  }
  if (rollUnder(1 / 25)) {
    await fixStatlessAlbum(trx);
  }
  if (rollUnder(1 / 60)) {
    await renewOldList(trx);
  }
  console.log('bye!');
  // await database.close();
  process.exit(0);
});
