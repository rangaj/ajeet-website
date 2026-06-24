-- Fix ambiguous "c" reference in normalize_houses_string (PL/pgSQL vs subquery alias).

CREATE OR REPLACE FUNCTION normalize_houses_string(p_house TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  raw TEXT;
  segment TEXT;
  piece TEXT;
  resolved TEXT;
  results TEXT[] := ARRAY[]::TEXT[];
  canonical_order TEXT[] := ARRAY[
    'Adilshahi', 'Chalukya', 'Hoysala', 'Rashtrakoota',
    'Vijayanagar', 'Wodeyar', 'Rani Channamma'
  ];
BEGIN
  raw := trim(coalesce(p_house, ''));
  IF raw = '' THEN RETURN NULL; END IF;

  FOREACH segment IN ARRAY regexp_split_to_array(raw, '\s*[,|]\s*') LOOP
    FOREACH piece IN ARRAY regexp_split_to_array(segment, '\s*-\s*') LOOP
      resolved := resolve_house_token(piece);
      IF resolved IS NOT NULL AND NOT resolved = ANY(results) THEN
        results := array_append(results, resolved);
      END IF;
    END LOOP;
  END LOOP;

  IF array_length(results, 1) IS NULL THEN
    RETURN raw;
  END IF;

  RETURN array_to_string(
    ARRAY(
      SELECT house_name
      FROM unnest(canonical_order) AS house_name
      WHERE house_name = ANY(results)
    ),
    ', '
  );
END;
$$;
