-- LaundryFlow: platform roles and branch-level access
-- Existing businesses, memberships and branches are preserved.

BEGIN;

CREATE TABLE IF NOT EXISTS public.platform_admins (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view their own record"
ON public.platform_admins;

CREATE POLICY "Platform admins can view their own record"
ON public.platform_admins
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

GRANT SELECT ON public.platform_admins TO authenticated;

-- Ensure the composite key required to guarantee branch/business consistency.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'branches_id_business_id_unique'
          AND conrelid = 'public.branches'::regclass
    ) THEN
        ALTER TABLE public.branches
        ADD CONSTRAINT branches_id_business_id_unique UNIQUE (id, business_id);
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.branch_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    user_id uuid NOT NULL,
    assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'invited', 'suspended')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT branch_members_branch_business_fk
        FOREIGN KEY (branch_id, business_id)
        REFERENCES public.branches(id, business_id) ON DELETE CASCADE,
    CONSTRAINT branch_members_business_user_fk
        FOREIGN KEY (business_id, user_id)
        REFERENCES public.business_members(business_id, user_id) ON DELETE CASCADE,
    CONSTRAINT branch_members_unique_assignment UNIQUE (branch_id, user_id)
);

CREATE INDEX IF NOT EXISTS branch_members_user_idx
ON public.branch_members(user_id);
CREATE INDEX IF NOT EXISTS branch_members_business_idx
ON public.branch_members(business_id);
CREATE INDEX IF NOT EXISTS branch_members_branch_idx
ON public.branch_members(branch_id);

ALTER TABLE public.branch_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.branch_members TO authenticated;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.platform_admins pa
        WHERE pa.user_id = (SELECT auth.uid())
    );
$$;

CREATE OR REPLACE FUNCTION public.is_branch_member(
    target_business_id uuid,
    target_branch_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.branch_members bm
        WHERE bm.business_id = target_business_id
          AND bm.branch_id = target_branch_id
          AND bm.user_id = (SELECT auth.uid())
          AND bm.status = 'active'
    );
$$;

CREATE OR REPLACE FUNCTION public.can_access_branch(
    target_business_id uuid,
    target_branch_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT public.is_platform_admin()
        OR public.has_business_role(
            target_business_id,
            ARRAY['owner', 'admin']::text[]
        )
        OR public.is_branch_member(target_business_id, target_branch_id);
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_branch_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_branch(uuid, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_branch_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_branch(uuid, uuid) TO authenticated;

-- Branch managers and staff see only assigned branches.
DROP POLICY IF EXISTS "Business members can view branches" ON public.branches;

CREATE POLICY "Authorized users can view branches"
ON public.branches
FOR SELECT TO authenticated
USING (
    public.is_platform_admin()
    OR public.has_business_role(business_id, ARRAY['owner', 'admin']::text[])
    OR public.is_branch_member(business_id, id)
);

-- Users can see their own branch assignments; business owners/admins can manage them.
DROP POLICY IF EXISTS "Users can view their own branch assignments"
ON public.branch_members;

CREATE POLICY "Users can view their own branch assignments"
ON public.branch_members
FOR SELECT TO authenticated
USING (
    user_id = (SELECT auth.uid())
    OR public.is_platform_admin()
    OR public.has_business_role(business_id, ARRAY['owner', 'admin']::text[])
);

CREATE POLICY "Business admins can assign branch members"
ON public.branch_members
FOR INSERT TO authenticated
WITH CHECK (
    public.is_platform_admin()
    OR public.has_business_role(business_id, ARRAY['owner', 'admin']::text[])
);

CREATE POLICY "Business admins can update branch members"
ON public.branch_members
FOR UPDATE TO authenticated
USING (
    public.is_platform_admin()
    OR public.has_business_role(business_id, ARRAY['owner', 'admin']::text[])
)
WITH CHECK (
    public.is_platform_admin()
    OR public.has_business_role(business_id, ARRAY['owner', 'admin']::text[])
);

CREATE POLICY "Business admins can remove branch members"
ON public.branch_members
FOR DELETE TO authenticated
USING (
    public.is_platform_admin()
    OR public.has_business_role(business_id, ARRAY['owner', 'admin']::text[])
);

COMMIT;
