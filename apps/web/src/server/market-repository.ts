/**
 * Data access port for the market.
 *
 * The UI and the public API only know this interface. The demo is backed by the
 * seed dataset; production swaps in a PostgreSQL implementation without
 * touching a single component.
 */
import { seedIndexSeries, seedListings, seedStats, seedTicker } from '@/data/seed';
import type {
  CategoryId,
  GameId,
  IndexPoint,
  Listing,
  MarketStats,
  TradeTick,
} from '@/domain/types';

export interface ListingFilter {
  readonly game?: GameId;
  readonly category?: CategoryId;
}

export interface MarketSnapshot {
  readonly listings: readonly Listing[];
  readonly indexSeries: readonly IndexPoint[];
  readonly ticker: readonly TradeTick[];
  readonly stats: MarketStats;
}

export interface MarketRepository {
  listListings(filter?: ListingFilter): Promise<readonly Listing[]>;
  snapshot(): Promise<MarketSnapshot>;
}

class SeedMarketRepository implements MarketRepository {
  async listListings(filter: ListingFilter = {}): Promise<readonly Listing[]> {
    return seedListings.filter(
      (item) =>
        (filter.game === undefined || item.game === filter.game) &&
        (filter.category === undefined || item.category === filter.category),
    );
  }

  async snapshot(): Promise<MarketSnapshot> {
    return {
      listings: seedListings,
      indexSeries: seedIndexSeries,
      ticker: seedTicker,
      stats: seedStats,
    };
  }
}

export const marketRepository: MarketRepository = new SeedMarketRepository();
