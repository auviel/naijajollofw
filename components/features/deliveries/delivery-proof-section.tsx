"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { DeliveryProofOfDelivery } from "@/lib/domain/delivery/types";

type DeliveryProofSectionProps = {
  proof: DeliveryProofOfDelivery;
};

function ProofImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="rounded-md border border-border bg-surface p-4 text-sm text-text-secondary">
        Image no longer available. Uber retains proof-of-delivery media for about 30 days.
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Uber POD URLs are external and short-lived
    <img
      src={src}
      alt={alt}
      className="max-h-80 w-full rounded-md border border-border object-contain"
      onError={() => setFailed(true)}
    />
  );
}

export function DeliveryProofSection({ proof }: DeliveryProofSectionProps) {
  if (proof.pending) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-foreground">Proof of delivery</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary">
            Proof pending — verification may take a moment after delivery completes.
          </p>
        </CardContent>
      </Card>
    );
  }

  const hasSignature = Boolean(proof.signatureImageUrl);
  const hasPhoto = Boolean(proof.pictureImageUrl);
  const hasPincode = Boolean(proof.pincodeValue);

  if (!hasSignature && !hasPhoto && !proof.signerName && !hasPincode) {
    return (
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-foreground">Proof of delivery</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary">
            No proof-of-delivery media is available for this delivery.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-foreground">Proof of delivery</h2>
      </CardHeader>
      <CardContent className="space-y-6">
        {proof.pincodeValue ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
              PIN verified
            </p>
            <p className="mt-1 font-mono text-lg font-semibold text-foreground">
              {proof.pincodeValue}
            </p>
          </div>
        ) : null}

        {proof.signerName ? (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
              Signed by
            </p>
            <p className="mt-1 text-sm font-medium text-foreground">{proof.signerName}</p>
          </div>
        ) : null}

        {hasSignature && proof.signatureImageUrl ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
              Signature
            </p>
            <ProofImage src={proof.signatureImageUrl} alt="Delivery signature" />
          </div>
        ) : null}

        {hasPhoto && proof.pictureImageUrl ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
              Delivery photo
            </p>
            <ProofImage src={proof.pictureImageUrl} alt="Delivery photo" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
