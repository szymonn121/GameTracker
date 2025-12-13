import { HowLongToBeatService } from 'howlongtobeat';
import { CacheService } from './cache-service';

const client = new HowLongToBeatService();

export class HLTBService {
  static async searchByName(name: string) {
    const cacheKey = `hltb:search:${name}`;
    const cached = await CacheService.get<any>(cacheKey);
    if (cached) return cached;
    const results = await client.search(name);
    await CacheService.set(cacheKey, results, 86400, 'hltb');
    return results;
  }

  static async getEstimate(name: string) {
    const results = await this.searchByName(name);
    const top = results[0];
    if (!top) return null;
    return {
      main: top.gameplayMain,
      mainExtra: top.gameplayMainExtra,
      completionist: top.gameplayCompletionist
    };
  }
}
