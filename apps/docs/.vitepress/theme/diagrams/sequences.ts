import type { SequenceDiagramSpec } from './types';

/** Sequence diagrams, by name. The figures match a €219.00 item paid by card. */
export const SEQUENCES = {
  trade: {
    title: 'A trade from checkout to payout',
    actors: [
      { id: 'buyer', title: 'Buyer' },
      { id: 'platform', title: 'DacitySwap', sub: 'API' },
      { id: 'engine', title: 'escrow-core', sub: 'the rules', kind: 'core' },
      { id: 'partner', title: 'Payment partner', sub: 'licensed', kind: 'external' },
      { id: 'seller', title: 'Seller' },
    ],
    steps: [
      { from: 'buyer', to: 'platform', label: 'checkout · €231.29' },
      { from: 'platform', to: 'partner', label: 'capture €231.29' },
      { from: 'partner', to: 'platform', label: 'captured', kind: 'reply' },
      { from: 'platform', to: 'engine', label: 'PAYMENT_CAPTURED → funded', kind: 'key' },
      { from: 'platform', to: 'seller', label: 'new order · accept within 12 h', kind: 'event' },
      { from: 'seller', to: 'engine', label: 'SELLER_ACCEPTED → in_delivery', kind: 'key' },
      { note: 'Delivers the item in the game', over: ['seller'] },
      { from: 'seller', to: 'engine', label: 'SELLER_MARKED_DELIVERED → delivered', kind: 'key' },
      { from: 'platform', to: 'buyer', label: 'confirm within 24 h', kind: 'event' },
      { from: 'buyer', to: 'engine', label: 'BUYER_CONFIRMED → completed', kind: 'key' },
      { from: 'engine', to: 'platform', label: 'settle()', kind: 'reply' },
      { from: 'platform', to: 'partner', label: 'release €208.05 · fees €16.43' },
      { from: 'partner', to: 'seller', label: 'payout €208.05', kind: 'event' },
    ],
    caption:
      'Mint: a move of the escrow. Solid: a request. Dashed: an answer. Money leaves escrow only after the move to completed.',
  },

  dispute: {
    title: 'A dispute from objection to ruling',
    actors: [
      { id: 'buyer', title: 'Buyer' },
      { id: 'engine', title: 'escrow-core', sub: 'the rules', kind: 'core' },
      { id: 'arbiter', title: 'Arbiter', sub: 'dispute team' },
      { id: 'seller', title: 'Seller' },
    ],
    steps: [
      { from: 'buyer', to: 'engine', label: 'DISPUTE_OPENED → disputed', kind: 'key' },
      { note: 'Funds frozen · the 14-day ruling clock starts', over: ['engine'] },
      { from: 'engine', to: 'arbiter', label: 'case opened', kind: 'event' },
      { from: 'arbiter', to: 'seller', label: 'proof of delivery?' },
      { from: 'seller', to: 'arbiter', label: 'screenshot · clip', kind: 'reply' },
      { from: 'arbiter', to: 'buyer', label: 'your side?' },
      { from: 'buyer', to: 'arbiter', label: 'statement', kind: 'reply' },
      { frame: 'start', label: 'the ruling', kind: 'alt' },
      { from: 'arbiter', to: 'engine', label: 'release → completed', kind: 'key' },
      { frame: 'else', label: 'or refund' },
      { from: 'arbiter', to: 'engine', label: 'refund → refunded', kind: 'key' },
      { frame: 'else', label: 'or split, e.g. 40 % back to the buyer' },
      { from: 'arbiter', to: 'engine', label: 'split → split', kind: 'key' },
      { frame: 'else', label: 'or no ruling within 14 days' },
      { from: 'engine', to: 'engine', label: 'DISPUTE_EXPIRED → refunded', kind: 'key' },
      { frame: 'end' },
    ],
    caption:
      'While the dispute is open, neither party can move the money. Only a ruling or the deadline ends it.',
  },

  onchain: {
    title: 'A stablecoin trade through DacityEscrow',
    actors: [
      { id: 'buyer', title: 'Buyer wallet' },
      { id: 'token', title: 'USDC', sub: 'ERC-20', kind: 'external' },
      { id: 'escrow', title: 'DacityEscrow', sub: 'contract', kind: 'core' },
      { id: 'seller', title: 'Seller wallet' },
      { id: 'treasury', title: 'Treasury' },
    ],
    steps: [
      { from: 'buyer', to: 'token', label: 'approve(escrow, 102.50)' },
      { from: 'buyer', to: 'escrow', label: 'fund(orderId, seller, 100)', kind: 'key' },
      { from: 'escrow', to: 'token', label: 'transferFrom(buyer, escrow, 102.50)' },
      { from: 'escrow', to: 'buyer', label: 'TradeFunded', kind: 'event' },
      { from: 'seller', to: 'escrow', label: 'accept(id)', kind: 'key' },
      { note: 'Delivers the item in the game', over: ['seller'] },
      { from: 'seller', to: 'escrow', label: 'markDelivered(id)', kind: 'key' },
      { from: 'buyer', to: 'escrow', label: 'confirm(id)', kind: 'key' },
      { from: 'escrow', to: 'token', label: 'transfer(seller, 95.00)' },
      { from: 'escrow', to: 'token', label: 'transfer(treasury, 7.50)' },
      { from: 'token', to: 'seller', label: '+95.00', kind: 'event' },
      { from: 'token', to: 'treasury', label: '+7.50', kind: 'event' },
    ],
    caption:
      'Price 100, buyer fee 2.5 %, seller fee 5 %. If the buyer stays silent, the seller calls claim(id) once the release window has closed.',
  },

  persist: {
    title: 'Persist, then pay: one confirmation on a production server',
    actors: [
      { id: 'checkout', title: 'Checkout' },
      { id: 'server', title: 'Your server' },
      { id: 'engine', title: 'escrow-core', kind: 'core' },
      { id: 'db', title: 'Database' },
      { id: 'rail', title: 'Payment rail', kind: 'external' },
    ],
    steps: [
      { from: 'checkout', to: 'server', label: 'POST /orders/ord_1/confirm' },
      { from: 'server', to: 'db', label: 'load record · FOR UPDATE' },
      { from: 'db', to: 'server', label: 'record', kind: 'reply' },
      { from: 'server', to: 'engine', label: 'applyEventAs(…)', kind: 'key' },
      { from: 'engine', to: 'server', label: 'next record', kind: 'reply' },
      { from: 'server', to: 'db', label: 'save record + outbox row · one transaction' },
      { from: 'server', to: 'checkout', label: '200 OK', kind: 'reply' },
      { frame: 'start', label: 'outbox worker, after commit', kind: 'opt' },
      { from: 'server', to: 'engine', label: 'settle(record)' },
      { from: 'server', to: 'rail', label: 'release 20805 · key esc_1:4' },
      { from: 'rail', to: 'server', label: 'ok', kind: 'reply' },
      { from: 'server', to: 'db', label: 'mark outbox row sent' },
      { frame: 'end' },
    ],
    caption:
      'If the process dies after the commit, the worker finds the unsent outbox row and finishes the payout. The idempotency key makes a retry harmless.',
  },
} satisfies Record<string, SequenceDiagramSpec>;
