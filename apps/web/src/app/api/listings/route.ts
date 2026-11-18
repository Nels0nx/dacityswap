import { NextResponse, type NextRequest } from 'next/server';
import { CATEGORIES, GAMES } from '@/domain/catalog';
import type { CategoryId, GameId } from '@/domain/types';
import { marketRepository } from '@/server/market-repository';

const gameIds = new Set<string>(GAMES.map((game) => game.id));
const categoryIds = new Set<string>(CATEGORIES.map((category) => category.id));

/** GET /api/listings?game=gtao&category=cash */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const game = searchParams.get('game');
  const category = searchParams.get('category');

  if (game !== null && !gameIds.has(game)) {
    return NextResponse.json(
      { error: { code: 'invalid_game', message: `Unknown game "${game}"` } },
      { status: 400 },
    );
  }
  if (category !== null && !categoryIds.has(category)) {
    return NextResponse.json(
      { error: { code: 'invalid_category', message: `Unknown category "${category}"` } },
      { status: 400 },
    );
  }

  const data = await marketRepository.listListings({
    game: (game ?? undefined) as GameId | undefined,
    category: (category ?? undefined) as CategoryId | undefined,
  });

  return NextResponse.json({ data, meta: { count: data.length, demo: true } });
}
