-- Production performance: missing review rating index + AI dashboard aggregations.

CREATE INDEX IF NOT EXISTS idx_reviews_rating ON public.reviews (rating);

CREATE OR REPLACE FUNCTION public.ai_dashboard_period_stats(since_at timestamptz)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'period_generations', count(*)::int,
    'cached_generations', count(*) FILTER (WHERE from_cache IS TRUE)::int,
    'open_ai_generations', count(*) FILTER (WHERE from_cache IS NOT TRUE)::int,
    'period_estimated_cost_usd', coalesce(
      sum(
        CASE
          WHEN generation_status = 'completed' THEN coalesce(estimated_cost::numeric, 0)
          ELSE 0
        END
      ),
      0
    )
  )
  FROM public.ai_review_generations
  WHERE created_at >= since_at;
$$;

CREATE OR REPLACE FUNCTION public.ai_top_businesses_since(
  since_at timestamptz,
  row_limit integer
)
RETURNS TABLE (business_id uuid, generation_count bigint)
LANGUAGE sql
STABLE
AS $$
  SELECT g.business_id, count(*)::bigint AS generation_count
  FROM public.ai_review_generations g
  WHERE g.created_at >= since_at
  GROUP BY g.business_id
  ORDER BY generation_count DESC
  LIMIT greatest(1, least(coalesce(row_limit, 8), 100));
$$;
