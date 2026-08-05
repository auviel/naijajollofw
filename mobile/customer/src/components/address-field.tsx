import { apiFetch } from "@/lib/api";
import { Colors, Field, Radii, Type } from "@naijajollof/ui";
import type { AddressSuggestion, GeocodedAddress } from "@naijajollof/api-types";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function AddressField({
  value,
  onChange,
  onGeocoded,
}: {
  value: string;
  onChange: (next: string) => void;
  onGeocoded: (result: GeocodedAddress | null) => void;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const skipSuggest = useRef(false);
  const onGeocodedRef = useRef(onGeocoded);
  onGeocodedRef.current = onGeocoded;

  useEffect(() => {
    if (skipSuggest.current) {
      skipSuggest.current = false;
      return;
    }
    const query = value.trim();
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      void apiFetch<AddressSuggestion[]>("/api/geocode/suggest", {
        method: "POST",
        body: JSON.stringify({ query }),
      })
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 280);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 5) {
      setVerified(false);
      setError(null);
      setVerifying(false);
      onGeocodedRef.current(null);
      return;
    }
    setVerifying(true);
    setVerified(false);
    const timer = setTimeout(() => {
      void apiFetch<GeocodedAddress>("/api/geocode", {
        method: "POST",
        body: JSON.stringify({ query }),
      })
        .then((result) => {
          const ok = result.confidence !== "low";
          setVerified(ok);
          setError(ok ? null : "Pick a more specific street address.");
          onGeocodedRef.current(ok ? result : null);
        })
        .catch((err: unknown) => {
          setVerified(false);
          setError(err instanceof Error ? err.message : "Could not check address.");
          onGeocodedRef.current(null);
        })
        .finally(() => setVerifying(false));
    }, 550);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <View style={{ gap: 8 }}>
      <Field
        placeholder="Delivery address"
        value={value}
        onChangeText={onChange}
        autoCorrect={false}
      />
      {verifying ? <Text style={Type.meta}>Checking address…</Text> : null}
      {verified ? <Text style={styles.ok}>Address confirmed</Text> : null}
      {error ? <Text style={styles.err}>{error}</Text> : null}
      {suggestions.length > 0 ? (
        <View style={styles.list}>
          {suggestions.slice(0, 5).map((item) => (
            <Pressable
              key={item.id}
              onPress={() => {
                skipSuggest.current = true;
                setSuggestions([]);
                onChange(item.label);
              }}
              style={styles.suggestion}
            >
              <Text style={styles.suggestionText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ok: { color: Colors.success, fontWeight: "700" },
  err: { color: Colors.danger, fontWeight: "600" },
  list: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surface,
    overflow: "hidden",
  },
  suggestion: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  suggestionText: { color: Colors.text, fontWeight: "600" },
});
