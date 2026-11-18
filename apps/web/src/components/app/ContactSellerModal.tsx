'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { VerifiedIcon } from '@/components/ui/Icons';
import { Modal } from '@/components/ui/Modal';
import type { Listing } from '@/domain/types';
import { useMarket } from '@/store/market-store';

function ContactForm({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const pushToast = useMarket((state) => state.pushToast);
  const [message, setMessage] = useState(`Hi, is "${listing.title}" still available?`);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (message.trim().length < 5) {
      setError('Write a short message for the seller.');
      return;
    }
    onClose();
    pushToast({
      tone: 'success',
      title: `Message sent to @${listing.seller.handle}`,
      body: 'Simulated. Chat with sellers is on the roadmap.',
    });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 p-5">
      <p className="glass-inset flex items-center gap-2 rounded-[4px] px-3 py-2.5 text-sm">
        <span className="text-white/55">To</span>@{listing.seller.handle}
        {listing.seller.verified && (
          <VerifiedIcon
            width={13}
            height={13}
            className="text-accent"
            aria-label="Verified seller"
          />
        )}
        <span className="ml-auto text-xs text-white/45">usually replies in minutes</span>
      </p>
      <label className="flex flex-col gap-1.5 text-xs text-white/60">
        Message
        <textarea
          data-autofocus
          rows={4}
          maxLength={500}
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            setError(null);
          }}
          aria-invalid={error !== null}
          aria-describedby={error ? 'contact-error' : undefined}
          className="field resize-none"
        />
        {error && (
          <span id="contact-error" role="alert" className="text-red-300">
            {error}
          </span>
        )}
      </label>
      <p className="text-xs leading-relaxed text-white/45">
        Keep payment on DacitySwap. A seller who asks to be paid elsewhere is not protected by
        escrow, and neither are you.
      </p>
      <Button type="submit" variant="primary" size="lg">
        Send message
      </Button>
    </form>
  );
}

export function ContactSellerModal() {
  const open = useMarket((state) => state.modal === 'contact');
  const listing = useMarket(
    (state) => state.listings.find((item) => item.id === state.contactListingId) ?? null,
  );
  const closeModal = useMarket((state) => state.closeModal);

  return (
    <Modal
      open={open && listing !== null}
      onClose={closeModal}
      title="Contact the seller"
      className="sm:max-w-md"
    >
      {listing && <ContactForm key={listing.id} listing={listing} onClose={closeModal} />}
    </Modal>
  );
}
