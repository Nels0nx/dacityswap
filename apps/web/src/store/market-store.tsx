'use client';

import {
  InvalidTransitionError,
  applyEvent,
  createEscrow,
  quote as priceQuote,
  type EscrowEvent,
  type PaymentMethod,
  type Quote,
} from '@dacityswap/escrow-core';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import type {
  CategoryId,
  GameId,
  IndexPoint,
  Listing,
  MarketStats,
  Order,
  PanelTab,
  SortKey,
  TradeTick,
} from '@/domain/types';
import { DEFAULT_MODEL } from '@/domain/models';
import { formatEUR } from '@/lib/format';
import type { CryptoAssetId, PaymentReceipt } from '@/lib/payments';
import { useSceneStore } from './scene-store';

export type ModalId = 'wallet' | 'trust' | 'palette' | 'contact';
export type ToastTone = 'success' | 'info' | 'danger';

export interface Toast {
  readonly id: number;
  readonly tone: ToastTone;
  readonly title: string;
  readonly body?: string;
}

export interface CheckoutPrefs {
  readonly method: PaymentMethod;
  readonly asset: CryptoAssetId;
}

export interface Banner {
  readonly id: number;
  readonly title: string;
  readonly lines: readonly string[];
}

export interface Wallet {
  readonly label: string;
  readonly address: string;
}

export interface NewListingInput {
  readonly game: GameId;
  readonly category: CategoryId;
  readonly title: string;
  readonly detail: string;
  readonly unitPriceMinor: number;
  readonly deliveryMinutes: number;
  readonly stock: number;
}

export interface MarketSeed {
  readonly listings: readonly Listing[];
  readonly indexSeries: readonly IndexPoint[];
  readonly ticker: readonly TradeTick[];
  readonly stats: MarketStats;
}

export interface MarketState extends MarketSeed {
  orders: readonly Order[];
  /** The product on stage. Null shows the brand intro. */
  selectedListingId: string | null;
  /** The category the showroom menu is listing. */
  menuCategory: CategoryId;
  /** Whether the full market sheet is open, and on which tab. */
  marketOpen: boolean;
  tab: PanelTab;
  game: GameId | 'all';
  category: CategoryId | 'all';
  sort: SortKey;
  query: string;
  checkoutListingId: string | null;
  /** A listing made up for a swap. It is checked out like any other but never joins the market. */
  checkoutDraft: Listing | null;
  /** How the buyer asked to pay before checkout opened, if they did. */
  checkoutPrefs: CheckoutPrefs | null;
  expandedOrderId: string | null;
  /** The listing whose seller the buyer is writing to. */
  contactListingId: string | null;
  modal: ModalId | null;
  wallet: Wallet | null;
  waitlistEmail: string | null;
  toasts: readonly Toast[];
  /** The full-width announcement shown when a trade completes or is refunded. */
  banner: Banner | null;

  select: (listingId: string | null) => void;
  /** Switches the showroom menu to a category and stages its first product. */
  browse: (category: CategoryId) => void;
  /** Moves the selection up or down the showroom menu, wrapping at the ends. */
  step: (direction: 1 | -1) => void;
  openMarket: (tab?: PanelTab) => void;
  closeMarket: () => void;
  setTab: (tab: PanelTab) => void;
  setGame: (game: GameId | 'all') => void;
  setCategory: (category: CategoryId | 'all') => void;
  setSort: (sort: SortKey) => void;
  setQuery: (query: string) => void;
  openCheckout: (listingId: string) => void;
  openSwapCheckout: (draft: Omit<Listing, 'id' | 'createdAt'>, prefs: CheckoutPrefs) => void;
  closeCheckout: () => void;
  openModal: (modal: ModalId) => void;
  openContact: (listingId: string) => void;
  closeModal: () => void;
  toggleOrder: (orderId: string) => void;
  connectWallet: (wallet: Wallet) => void;
  disconnectWallet: () => void;
  joinWaitlist: (email: string) => void;
  publishListing: (input: NewListingInput) => Listing;
  placeOrder: (input: { listing: Listing; quote: Quote; receipt: PaymentReceipt }) => Order;
  dispatchEscrow: (orderId: string, event: EscrowEvent) => void;
  pushToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
}

/** Delays for the simulated counterparty, in milliseconds. */
const SIMULATION = { sellerAccepts: 3_500, sellerDelivers: 9_000, arbiterRules: 6_000 } as const;

function seedOrders(listings: readonly Listing[]): Order[] {
  const sample = (category: CategoryId, method: PaymentMethod, id: string, startedAt: string) => {
    const listing = listings.find((item) => item.category === category);
    if (!listing) return null;
    const at = (minutes: number) => new Date(Date.parse(startedAt) + minutes * 60_000);
    let escrow = createEscrow({
      id: `esc_${id}`,
      quote: priceQuote({ unitPriceMinor: listing.unitPriceMinor, currency: 'EUR', method }),
      now: at(0),
    });
    const events: EscrowEvent[] = [
      { type: 'PAYMENT_CAPTURED', paymentRef: `seed_${id}` },
      { type: 'SELLER_ACCEPTED' },
      { type: 'SELLER_MARKED_DELIVERED' },
      { type: 'BUYER_CONFIRMED' },
    ];
    events.forEach((event, index) => {
      escrow = applyEvent(escrow, event, at(1 + index * 4));
    });
    const order: Order = {
      id: `ord_${id}`,
      listingId: listing.id,
      title: listing.title,
      game: listing.game,
      category: listing.category,
      model: listing.model,
      sellerHandle: listing.seller.handle,
      method,
      rail: method === 'card' ? 'Visa ···· 4242' : 'USDC · Base',
      paymentRef: `seed_${id}`,
      escrow,
    };
    return order;
  };

  return [
    sample('vehicles', 'crypto', '8f2k1c', '2026-11-16T18:20:00Z'),
    sample('cash', 'card', '3m9x7a', '2026-11-15T21:05:00Z'),
  ].filter((order): order is Order => order !== null);
}

export function createMarketStore(seed: MarketSeed): StoreApi<MarketState> {
  let toastSerial = 0;

  return createStore<MarketState>()((set, get) => {
    const later = (ms: number, task: () => void) => {
      if (typeof window !== 'undefined') window.setTimeout(task, ms);
    };

    return {
      ...seed,
      orders: seedOrders(seed.listings),
      selectedListingId: null,
      menuCategory: 'vehicles',
      marketOpen: false,
      tab: 'buy',
      game: 'all',
      category: 'all',
      sort: 'recommended',
      query: '',
      checkoutListingId: null,
      checkoutDraft: null,
      checkoutPrefs: null,
      expandedOrderId: null,
      contactListingId: null,
      modal: null,
      wallet: null,
      waitlistEmail: null,
      toasts: [],
      banner: null,

      select: (listingId) => {
        const listing = get().listings.find((item) => item.id === listingId) ?? null;
        set((state) => ({
          selectedListingId: listing?.id ?? null,
          menuCategory: listing?.category ?? state.menuCategory,
          marketOpen: false,
        }));
        // The stage lives in the WebGL tree; tell it what to present.
        useSceneStore.getState().setStageModel(listing?.model ?? null);
      },
      browse: (category) => {
        const first = get().listings.find((item) => item.category === category);
        set({ menuCategory: category });
        if (first) get().select(first.id);
      },
      step: (direction) => {
        const { listings, menuCategory, selectedListingId } = get();
        const menu = listings.filter((item) => item.category === menuCategory);
        if (menu.length === 0) return;
        const index = menu.findIndex((item) => item.id === selectedListingId);
        const next =
          index === -1
            ? direction === 1
              ? 0
              : menu.length - 1
            : (index + direction + menu.length) % menu.length;
        get().select(menu[next]!.id);
      },
      openMarket: (tab) =>
        set((state) => ({ marketOpen: true, modal: null, tab: tab ?? state.tab })),
      closeMarket: () => set({ marketOpen: false }),
      setTab: (tab) => set({ tab }),
      setGame: (game) => set({ game }),
      setCategory: (category) => set({ category }),
      setSort: (sort) => set({ sort }),
      setQuery: (query) => set({ query }),
      openCheckout: (listingId) =>
        set({
          checkoutListingId: listingId,
          checkoutDraft: null,
          checkoutPrefs: null,
          modal: null,
          marketOpen: false,
        }),
      openSwapCheckout: (input, prefs) => {
        const draft: Listing = {
          ...input,
          id: `swap_${Date.now().toString(36)}`,
          createdAt: new Date().toISOString(),
        };
        set({
          checkoutListingId: draft.id,
          checkoutDraft: draft,
          checkoutPrefs: prefs,
          modal: null,
          marketOpen: false,
        });
      },
      closeCheckout: () =>
        set({ checkoutListingId: null, checkoutDraft: null, checkoutPrefs: null }),
      openModal: (modal) => set({ modal }),
      openContact: (listingId) =>
        set({ contactListingId: listingId, modal: 'contact', marketOpen: false }),
      closeModal: () => set({ modal: null }),
      toggleOrder: (orderId) =>
        set((state) => ({ expandedOrderId: state.expandedOrderId === orderId ? null : orderId })),

      connectWallet: (wallet) => {
        set({ wallet, modal: null });
        get().pushToast({
          tone: 'success',
          title: `${wallet.label} connected`,
          body: 'Simulated wallet. No real connection was made.',
        });
      },
      disconnectWallet: () => set({ wallet: null }),

      joinWaitlist: (email) => {
        set({ waitlistEmail: email });
        get().pushToast({
          tone: 'success',
          title: "You're on the list",
          body: 'We will email you when the GTA VI market has an opening date.',
        });
      },

      publishListing: (input) => {
        const listing: Listing = {
          ...input,
          model: DEFAULT_MODEL[input.category],
          stats: [5, 5, 5, 5],
          id: `lst_${Date.now().toString(36)}`,
          currency: 'EUR',
          seller: { handle: 'you', rating: 5, trades: 0, verified: false },
          createdAt: new Date().toISOString(),
          mine: true,
        };
        set((state) => ({
          listings: [listing, ...state.listings],
          tab: 'buy',
          game: 'all',
          category: 'all',
          sort: 'recommended',
          query: '',
        }));
        get().select(listing.id);
        get().pushToast({
          tone: 'success',
          title: 'Listing published',
          body: 'It is live and on stage now.',
        });
        return listing;
      },

      placeOrder: ({ listing, quote, receipt }) => {
        const id = Date.now().toString(36).slice(-6);
        const created = createEscrow({ id: `esc_${id}`, quote, now: new Date() });
        const order: Order = {
          id: `ord_${id}`,
          listingId: listing.id,
          title: listing.title,
          game: listing.game,
          category: listing.category,
          model: listing.model,
          sellerHandle: listing.seller.handle,
          method: quote.method,
          rail: receipt.rail,
          paymentRef: receipt.paymentRef,
          escrow: applyEvent(
            created,
            { type: 'PAYMENT_CAPTURED', paymentRef: receipt.paymentRef },
            new Date(),
          ),
        };

        set((state) => ({
          orders: [order, ...state.orders],
          expandedOrderId: order.id,
          listings: state.listings.map((item) =>
            item.id === listing.id ? { ...item, stock: Math.max(0, item.stock - 1) } : item,
          ),
        }));

        // Simulated seller. In production these events arrive from the seller's session.
        later(SIMULATION.sellerAccepts, () =>
          get().dispatchEscrow(order.id, { type: 'SELLER_ACCEPTED' }),
        );
        later(SIMULATION.sellerDelivers, () =>
          get().dispatchEscrow(order.id, { type: 'SELLER_MARKED_DELIVERED' }),
        );
        return order;
      },

      dispatchEscrow: (orderId, event) => {
        const order = get().orders.find((candidate) => candidate.id === orderId);
        if (!order) return;

        let next;
        try {
          next = applyEvent(order.escrow, event, new Date());
        } catch (error) {
          // A simulated event can lose a race with the user (e.g. a dispute); that is expected.
          if (error instanceof InvalidTransitionError) return;
          throw error;
        }

        set((state) => ({
          orders: state.orders.map((candidate) =>
            candidate.id === orderId ? { ...candidate, escrow: next } : candidate,
          ),
        }));

        const { pushToast } = get();
        const seller = `@${order.sellerHandle}`;
        switch (event.type) {
          case 'SELLER_ACCEPTED':
            pushToast({
              tone: 'info',
              title: `${seller} accepted your order`,
              body: 'Delivery is in progress.',
            });
            break;
          case 'SELLER_MARKED_DELIVERED':
            pushToast({
              tone: 'info',
              title: `${seller} marked the order delivered`,
              body: 'Confirm it to release the funds.',
            });
            break;
          case 'BUYER_CONFIRMED': {
            const id = ++toastSerial;
            set({
              banner: {
                id,
                title: 'Trade complete',
                lines: [
                  order.title,
                  `${formatEUR(order.escrow.quote.sellerPayoutMinor)} released to ${seller}`,
                  'Escrow closed',
                ],
              },
            });
            later(3_600, () => get().banner?.id === id && set({ banner: null }));
            pushToast({
              tone: 'success',
              title: 'Funds released',
              body: `${seller} has been paid. Trade complete.`,
            });
            break;
          }
          case 'DISPUTE_OPENED':
            pushToast({
              tone: 'info',
              title: 'Dispute opened',
              body: 'Funds stay locked while an arbiter reviews the trade.',
            });
            later(SIMULATION.arbiterRules, () =>
              get().dispatchEscrow(orderId, { type: 'DISPUTE_RESOLVED', outcome: 'refund' }),
            );
            break;
          case 'DISPUTE_RESOLVED':
            pushToast(
              event.outcome === 'refund'
                ? {
                    tone: 'success',
                    title: 'Dispute resolved in your favour',
                    body: 'Your payment has been refunded in full.',
                  }
                : {
                    tone: 'info',
                    title: 'Dispute resolved',
                    body:
                      event.outcome === 'split'
                        ? 'The arbiter divided the payment between you and the seller.'
                        : 'The arbiter released the funds to the seller.',
                  },
            );
            break;
          default:
            break;
        }
      },

      pushToast: (toast) => {
        const id = ++toastSerial;
        set((state) => ({ toasts: [...state.toasts.slice(-2), { ...toast, id }] }));
        later(5_200, () => get().dismissToast(id));
      },
      dismissToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
    };
  });
}

const MarketStoreContext = createContext<StoreApi<MarketState> | null>(null);

export function MarketStoreProvider({ seed, children }: { seed: MarketSeed; children: ReactNode }) {
  // One store per mounted app, never shared between server requests.
  const [store] = useState(() => createMarketStore(seed));
  return <MarketStoreContext.Provider value={store}>{children}</MarketStoreContext.Provider>;
}

export function useMarket<T>(selector: (state: MarketState) => T): T {
  const store = useContext(MarketStoreContext);
  if (!store) throw new Error('useMarket must be used inside <MarketStoreProvider>');
  return useStore(store, selector);
}
