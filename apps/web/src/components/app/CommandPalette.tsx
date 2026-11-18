'use client';

import { useCallback, useMemo, useState } from 'react';
import { SearchIcon } from '@/components/ui/Icons';
import { Thumb } from '@/components/ui/Thumb';
import { Modal } from '@/components/ui/Modal';
import { gameName } from '@/domain/catalog';
import { cn } from '@/lib/cn';
import { formatEUR } from '@/lib/format';
import { useKeydown } from '@/lib/hooks';
import { useMarket } from '@/store/market-store';

interface Command {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
  readonly run: () => void;
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const listings = useMarket((state) => state.listings);
  const select = useMarket((state) => state.select);
  const openMarket = useMarket((state) => state.openMarket);
  const openModal = useMarket((state) => state.openModal);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  const commands = useMemo<Command[]>(() => {
    const term = query.trim().toLowerCase();
    const actions: Command[] = [
      { id: 'sell', label: 'Create a listing', hint: 'Action', run: () => openMarket('sell') },
      { id: 'orders', label: 'Track my orders', hint: 'Action', run: () => openMarket('orders') },
      { id: 'wallet', label: 'Connect a wallet', hint: 'Action', run: () => openModal('wallet') },
      { id: 'trust', label: 'How escrow works', hint: 'Action', run: () => openModal('trust') },
    ].filter((action) => term === '' || action.label.toLowerCase().includes(term));

    const matches = listings
      .filter(
        (item) =>
          term === '' ||
          `${item.title} ${item.detail} ${item.seller.handle} ${gameName(item.game)} ${item.category}`
            .toLowerCase()
            .includes(term),
      )
      .slice(0, term === '' ? 4 : 7)
      .map<Command>((item) => ({
        id: item.id,
        label: item.title,
        hint: `${gameName(item.game)} · ${formatEUR(item.unitPriceMinor)}`,
        run: () => select(item.id),
      }));

    return [...matches, ...actions];
  }, [query, listings, select, openMarket, openModal]);

  const active = Math.min(cursor, Math.max(0, commands.length - 1));

  const run = (command: Command | undefined) => {
    if (!command) return;
    onClose();
    command.run();
  };

  return (
    <div
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setCursor((active + 1) % Math.max(1, commands.length));
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          setCursor((active - 1 + commands.length) % Math.max(1, commands.length));
        } else if (event.key === 'Enter') {
          event.preventDefault();
          run(commands[active]);
        }
      }}
    >
      <label className="flex items-center gap-3 border-b border-white/8 px-5">
        <SearchIcon className="shrink-0 text-white/45" />
        <span className="sr-only">Search listings and actions</span>
        <input
          data-autofocus
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCursor(0);
          }}
          placeholder="Search listings, sellers, actions…"
          className="h-14 w-full bg-transparent text-[15px] outline-none placeholder:text-white/35"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-results"
          aria-activedescendant={commands[active] ? `palette-${commands[active].id}` : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        <kbd className="rounded-md border border-white/12 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-white/45">
          esc
        </kbd>
      </label>

      <ul
        id="palette-results"
        role="listbox"
        className="scroll-thin max-h-[52dvh] overflow-y-auto p-2"
      >
        {commands.length === 0 && (
          <li className="px-3 py-8 text-center text-sm text-white/45">
            Nothing matches “{query}”.
          </li>
        )}
        {commands.map((command, index) => {
          const listing = listings.find((item) => item.id === command.id);
          return (
            <li
              key={command.id}
              id={`palette-${command.id}`}
              role="option"
              aria-selected={index === active}
            >
              <button
                type="button"
                tabIndex={-1}
                onMouseMove={() => setCursor(index)}
                onClick={() => run(command)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-[4px] px-3 py-2.5 text-left text-sm transition-colors',
                  index === active ? 'bg-white/10 text-white' : 'text-white/75',
                )}
              >
                {listing ? (
                  <Thumb model={listing.model} className="h-8 w-10 rounded-[3px]" />
                ) : (
                  <span className="grid h-8 w-10 shrink-0 place-items-center rounded-[3px] bg-white/7 text-white/70">
                    →
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">{command.label}</span>
                <span className="shrink-0 font-mono text-[11px] text-white/45">{command.hint}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CommandPalette() {
  const open = useMarket((state) => state.modal === 'palette');
  const openModal = useMarket((state) => state.openModal);
  const closeModal = useMarket((state) => state.closeModal);

  const onKeydown = useCallback(
    (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (open) closeModal();
        else openModal('palette');
      }
    },
    [open, openModal, closeModal],
  );
  useKeydown(onKeydown);

  return (
    <Modal
      open={open}
      onClose={closeModal}
      title="Search"
      hideHeader
      className="sm:mb-[18dvh] sm:max-w-xl"
    >
      {/* Remounting on open resets the query without an effect. */}
      <PaletteBody onClose={closeModal} />
    </Modal>
  );
}
