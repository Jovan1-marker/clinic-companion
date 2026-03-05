
-- Ensure admins can delete announcements (covered by ALL policy already, but explicit)
CREATE POLICY "Admins can delete announcements"
  ON public.announcements
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
