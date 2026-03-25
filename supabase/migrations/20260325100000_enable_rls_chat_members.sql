-- Enable RLS on chat_members (was missing)
ALTER TABLE public.chat_members ENABLE ROW LEVEL SECURITY;

-- Policy: users can see members of channels they belong to
CREATE POLICY "Users can view chat members of their channels"
ON public.chat_members
FOR SELECT
USING (
  channel_id IN (
    SELECT cm.channel_id FROM public.chat_members cm
    WHERE cm.user_id = auth.uid()
  )
);

-- Policy: users can join channels in their tenant
CREATE POLICY "Users can join channels in their tenant"
ON public.chat_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_channels cc
    WHERE cc.id = channel_id
    AND cc.tenant_id = get_my_tenant_id()
  )
);

-- Policy: users can leave channels (delete their own membership)
CREATE POLICY "Users can leave channels"
ON public.chat_members
FOR DELETE
USING (user_id = auth.uid());
