
-- Allow admins to delete patients (already covered by ALL policy but making explicit)
CREATE POLICY "Admins can delete patients"
  ON public.patients
  FOR DELETE
  TO authenticated
  USING (public.is_admin());
